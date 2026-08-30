// Performance findings inside Unity's per-frame callbacks.
//
// Scope and honesty about it: this is a syntactic analysis, not a semantic one.
// Rider can tell that a receiver is a Component because ReSharper resolves
// types; we only have a masked token soup and brace matching. So the rules here
// are limited to Unity API names that are effectively reserved — Camera.main,
// GameObject.Find, SendMessage and friends — where matching the text is
// reliable enough to report. Anything that needs to know a type (does this
// property access allocate, is this LINQ over a Unity collection) is out of
// scope and deliberately not guessed at.
//
// Free of "vscode" imports so the rules stay unit testable.
import { maskCommentsAndStrings } from "./csharp-syntax";

/** Unity callbacks that run every frame, or close enough to matter. */
export const HOT_UNITY_MESSAGES = [
    "Update",
    "FixedUpdate",
    "LateUpdate",
    "OnGUI",
    "OnAnimatorIK",
    "OnAnimatorMove",
    "OnRenderObject",
    "OnWillRenderObject",
    "OnPreCull",
    "OnPreRender",
    "OnPostRender",
    "OnCollisionStay",
    "OnCollisionStay2D",
    "OnTriggerStay",
    "OnTriggerStay2D",
    "OnMouseOver",
    "OnMouseDrag",
] as const;

export type PerformanceRule =
    | "empty-message"
    | "camera-main"
    | "find-object"
    | "tag-comparison"
    | "send-message"
    | "get-component"
    | "debug-log"
    | "allocation-in-loop";

export interface PerformanceFinding {
    rule: PerformanceRule;
    /** Offset of the reported text in the original source. */
    index: number;
    /** Length of the reported text. */
    length: number;
    /** The matched text, for use in the message. */
    text: string;
    /** Unity callback the finding sits in, when it is inside one. */
    message?: string;
}

/** A Unity callback body located in the source. */
interface MessageBody {
    name: string;
    /** Offset of the opening brace. */
    start: number;
    /** Offset just past the closing brace. */
    end: number;
    /** Offset of the method name. */
    nameIndex: number;
    /** True when the body contains nothing but whitespace. */
    empty: boolean;
}

const methodDeclarationRegex =
    /(?:^|[;{}])\s*(?:(?:public|private|protected|internal|static|virtual|override|sealed|new|extern|unsafe|async)\s+)*(?:void|IEnumerator|System\.Collections\.IEnumerator)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;

function findBlockEnd(masked: string, openBrace: number): number {
    let depth = 0;
    for (let i = openBrace; i < masked.length; i++) {
        if (masked[i] === "{") {
            depth++;
        } else if (masked[i] === "}") {
            depth--;
            if (depth === 0) {
                return i + 1;
            }
        }
    }
    return masked.length;
}

/** Bodies of the Unity callbacks named in `names`, with brace matching. */
export function findUnityMessageBodies(source: string, names: readonly string[]): MessageBody[] {
    const masked = maskCommentsAndStrings(source);
    const wanted = new Set(names);
    const bodies: MessageBody[] = [];

    methodDeclarationRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = methodDeclarationRegex.exec(masked)) !== null) {
        const name = match[1];
        if (!wanted.has(name)) {
            continue;
        }

        const open = match.index + match[0].length - 1;
        const end = findBlockEnd(masked, open);
        const inner = masked.slice(open + 1, end - 1);

        bodies.push({
            name,
            start: open,
            end,
            nameIndex: match.index + match[0].indexOf(name),
            empty: inner.trim().length === 0,
        });

        // Resume on the closing brace rather than past it: the pattern anchors on
        // the ";", "{" or "}" that precedes a declaration, so consuming this one
        // would hide a callback that follows immediately.
        methodDeclarationRegex.lastIndex = end - 1;
    }

    return bodies;
}

// Rules that only make sense inside a per-frame callback. Each pattern is
// anchored on a Unity name specific enough that a text match is trustworthy.
const hotPathRules: Array<{ rule: PerformanceRule; regex: RegExp }> = [
    // Camera.main is a property that searches the scene for the MainCamera tag.
    { rule: "camera-main", regex: /\bCamera\s*\.\s*main\b/g },
    {
        rule: "find-object",
        regex: /\b(?:GameObject\s*\.\s*Find(?:WithTag|GameObjectWithTag|GameObjectsWithTag)?|(?:Object\s*\.\s*)?FindObjects?OfType|FindAnyObjectByType|FindFirstObjectByType|FindObjectsByType)\s*[<(]/g,
    },
    { rule: "send-message", regex: /\.\s*(?:SendMessage|SendMessageUpwards|BroadcastMessage)\s*\(/g },
    { rule: "get-component", regex: /\bGetComponents?(?:InChildren|InParent)?\s*[<(]/g },
    { rule: "debug-log", regex: /\bDebug\s*\.\s*Log(?:Warning|Error|Format)?\s*\(/g },
];

// Rules that apply anywhere in the file, not only in a hot callback.
// Matched against the masked source, where a string literal has been blanked
// out along with its quotes, so the literal itself cannot be part of the
// pattern. Any == on .tag is worth reporting anyway: the getter allocates.
const tagComparisonRegex = /\.\s*tag\s*(?:==|!=)/g;
const waitInLoopRegex = /\bnew\s+(WaitForSeconds|WaitForSecondsRealtime|WaitForEndOfFrame|WaitForFixedUpdate)\s*\(/g;

const loopKeywordRegex = /\b(?:for|foreach|while)\s*\(/g;

/** Loop bodies in the masked source, used to spot per-iteration allocations. */
function findLoopRanges(masked: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    loopKeywordRegex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = loopKeywordRegex.exec(masked)) !== null) {
        const open = masked.indexOf("{", match.index);
        if (open === -1) {
            continue;
        }
        // Only treat it as a block loop when the brace really opens the body.
        const between = masked.slice(match.index, open);
        if (between.includes(";") && !between.includes(")")) {
            continue;
        }
        ranges.push({ start: open, end: findBlockEnd(masked, open) });
    }

    return ranges;
}

/**
 * Performance findings for one C# file.
 *
 * `unityMessages` is the full set of Unity callback names, used for the empty
 * body rule; the per-frame subset is fixed in HOT_UNITY_MESSAGES.
 */
export function findPerformanceIssues(source: string, unityMessages: readonly string[]): PerformanceFinding[] {
    const masked = maskCommentsAndStrings(source);
    const findings: PerformanceFinding[] = [];

    // Unity calls an empty callback every frame for nothing. Reported for every
    // callback, not only the per-frame ones, because the cost is the call itself.
    for (const body of findUnityMessageBodies(source, unityMessages)) {
        if (body.empty) {
            findings.push({
                rule: "empty-message",
                index: body.nameIndex,
                length: body.name.length,
                text: body.name,
            });
        }
    }

    const hotBodies = findUnityMessageBodies(source, HOT_UNITY_MESSAGES);
    for (const body of hotBodies) {
        const region = masked.slice(body.start, body.end);

        for (const { rule, regex } of hotPathRules) {
            regex.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = regex.exec(region)) !== null) {
                const text = match[0].replace(/\s*[<(]$/, "").trim();
                findings.push({
                    rule,
                    index: body.start + match.index,
                    length: text.length,
                    text,
                    message: body.name,
                });
            }
        }
    }

    // Comparing tag with == builds a managed string every time; CompareTag does not.
    tagComparisonRegex.lastIndex = 0;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagComparisonRegex.exec(masked)) !== null) {
        const text = tagMatch[0].trimEnd();
        findings.push({
            rule: "tag-comparison",
            index: tagMatch.index + tagMatch[0].indexOf("."),
            length: text.length,
            text,
            message: hotBodies.find((body) => body.start < tagMatch!.index && body.end > tagMatch!.index)?.name,
        });
    }

    // A yield instruction allocated inside a loop can be hoisted out of it.
    const loops = findLoopRanges(masked);
    waitInLoopRegex.lastIndex = 0;
    let waitMatch: RegExpExecArray | null;
    while ((waitMatch = waitInLoopRegex.exec(masked)) !== null) {
        const index = waitMatch.index;
        if (!loops.some((loop) => loop.start < index && loop.end > index)) {
            continue;
        }
        findings.push({
            rule: "allocation-in-loop",
            index,
            length: waitMatch[0].replace(/\s*\($/, "").length,
            text: `new ${waitMatch[1]}`,
        });
    }

    return findings.sort((a, b) => a.index - b.index);
}
