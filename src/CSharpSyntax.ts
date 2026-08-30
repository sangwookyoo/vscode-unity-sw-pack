// vscode 모듈에 의존하지 않는 순수 C# 구문 헬퍼 (단위 테스트 대상)

const classRegex = /\bclass\s+\w+/;

/**
 * class 선언이 처음 등장하는 줄의 인덱스를 반환한다.
 * class 선언이 없으면 undefined를 반환한다. (interface/enum/struct 전용 파일 대응)
 */
export function findClassLine(lines: string[]): number | undefined {
    const index = lines.findIndex((line) => classRegex.test(line));
    return index === -1 ? undefined : index;
}

/** A member (UnityEvent field or public method) together with its declaring type. */
export interface CSharpMember {
    /** Member name. */
    name: string;
    /** Offset of the member name inside the source text. */
    index: number;
    /** Declaring type qualified with its namespace and outer types. */
    className: string;
    /** Declaring type name without any qualification. */
    simpleClassName: string;
}

/** A type declaration and the source range covered by its body. */
interface TypeScope {
    name: string;
    qualifiedName: string;
    /** Offset of the opening brace of the type body. */
    start: number;
    /** Offset just past the closing brace of the type body. */
    end: number;
}

interface NamespaceScope {
    name: string;
    start: number;
    end: number;
}

// A type reference: identifier, optional (nested) generic arguments, optional
// array ranks and an optional nullable marker.
const genericArguments = "<[^<>()]*(?:<[^<>()]*>[^<>()]*)*>";
const typeReference = `[A-Za-z_][A-Za-z0-9_.]*(?:\\s*${genericArguments})?(?:\\s*\\[\\s*,*\\s*\\])*\\??`;
const methodModifiers = "(?:static|virtual|override|sealed|abstract|async|new|extern|unsafe|partial)";

const namespaceRegex = /\bnamespace\s+([\w.]+)\s*[{;]/g;
const typeDeclarationRegex = /\b(?:class|struct|record)\s+(\w+)/g;
const unityEventFieldRegex = /\bUnityEvent(?:\s*<[^<>()]*>)?\s+(\w+)\s*(?=[;=])/g;
const publicMethodRegex = new RegExp(
    `\\bpublic\\b(?:\\s+${methodModifiers}\\b)*\\s+(${typeReference})\\s+(\\w+)\\s*(?:${genericArguments})?\\s*\\(`,
    "g"
);

// Words that look like a return type but never introduce a method declaration.
const nonReturnTypes = new Set([
    "class",
    "struct",
    "record",
    "interface",
    "enum",
    "event",
    "delegate",
    "operator",
    "implicit",
    "explicit",
    "namespace",
    "using",
    "return",
]);

/**
 * Replaces comments, string literals and character literals with spaces while
 * keeping every offset intact, so that regex scanning and brace counting are not
 * confused by braces or keywords appearing inside them.
 */
export function maskCommentsAndStrings(source: string): string {
    const out = source.split("");
    const blank = (from: number, to: number) => {
        for (let i = from; i < to && i < out.length; i++) {
            if (out[i] !== "\n" && out[i] !== "\r") {
                out[i] = " ";
            }
        }
    };

    let i = 0;
    while (i < source.length) {
        const char = source[i];
        const next = source[i + 1];

        if (char === "/" && next === "/") {
            let end = source.indexOf("\n", i);
            if (end === -1) {
                end = source.length;
            }
            blank(i, end);
            i = end;
        } else if (char === "/" && next === "*") {
            let end = source.indexOf("*/", i + 2);
            end = end === -1 ? source.length : end + 2;
            blank(i, end);
            i = end;
        } else if (char === "@" && next === "\"") {
            // Verbatim string: "" is an escaped quote.
            let end = i + 2;
            while (end < source.length) {
                if (source[end] === "\"") {
                    if (source[end + 1] === "\"") {
                        end += 2;
                        continue;
                    }
                    end++;
                    break;
                }
                end++;
            }
            blank(i, end);
            i = end;
        } else if (char === "\"" || char === "'") {
            let end = i + 1;
            while (end < source.length) {
                if (source[end] === "\\") {
                    end += 2;
                    continue;
                }
                if (source[end] === char || source[end] === "\n") {
                    end++;
                    break;
                }
                end++;
            }
            blank(i, end);
            i = end;
        } else {
            i++;
        }
    }

    return out.join("");
}

/** Finds the offset just past the block that starts at the given opening brace. */
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

function findNamespaces(masked: string): NamespaceScope[] {
    const namespaces: NamespaceScope[] = [];
    namespaceRegex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = namespaceRegex.exec(masked)) !== null) {
        const terminator = masked[match.index + match[0].length - 1];
        if (terminator === ";") {
            // File-scoped namespace: everything after it belongs to the namespace.
            namespaces.push({ name: match[1], start: match.index, end: masked.length });
        } else {
            const open = match.index + match[0].length - 1;
            namespaces.push({ name: match[1], start: open, end: findBlockEnd(masked, open) });
        }
    }

    return namespaces;
}

/**
 * Finds every class/struct/record declaration with a body, tracking brace nesting
 * so that a member can be attributed to the type that actually contains it.
 */
function findTypeScopes(masked: string): TypeScope[] {
    const namespaces = findNamespaces(masked);
    const scopes: TypeScope[] = [];
    typeDeclarationRegex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = typeDeclarationRegex.exec(masked)) !== null) {
        const afterName = match.index + match[0].length;
        const open = masked.indexOf("{", afterName);
        if (open === -1) {
            continue;
        }

        // A declaration without a body (for example "record Point(int X);") is skipped.
        const semicolon = masked.indexOf(";", afterName);
        if (semicolon !== -1 && semicolon < open) {
            continue;
        }

        scopes.push({
            name: match[1],
            qualifiedName: match[1],
            start: open,
            end: findBlockEnd(masked, open),
        });
    }

    // Qualify each type with its enclosing types and namespace.
    for (const scope of scopes) {
        const outer = scopes
            .filter((other) => other !== scope && other.start < scope.start && other.end > scope.start)
            .sort((a, b) => a.start - b.start)
            .map((other) => other.name);

        const namespaceName = namespaces
            .filter((ns) => ns.start < scope.start && ns.end > scope.start)
            .sort((a, b) => b.start - a.start)[0]?.name;

        const parts = [...outer, scope.name];
        scope.qualifiedName = namespaceName ? `${namespaceName}.${parts.join(".")}` : parts.join(".");
    }

    return scopes;
}

/** Returns the innermost type declaration containing the given offset. */
function findContainingType(scopes: TypeScope[], offset: number): TypeScope | undefined {
    let found: TypeScope | undefined;
    for (const scope of scopes) {
        if (scope.start < offset && scope.end > offset) {
            if (!found || scope.start > found.start) {
                found = scope;
            }
        }
    }
    return found;
}

function collectMembers(
    source: string,
    regex: RegExp,
    nameGroup: number,
    returnTypeGroup?: number
): CSharpMember[] {
    const masked = maskCommentsAndStrings(source);
    const scopes = findTypeScopes(masked);
    if (scopes.length === 0) {
        return [];
    }

    const members: CSharpMember[] = [];
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(masked)) !== null) {
        if (returnTypeGroup !== undefined && nonReturnTypes.has(match[returnTypeGroup].trim())) {
            continue;
        }

        const name = match[nameGroup];
        const type = findContainingType(scopes, match.index);
        if (!type) {
            continue;
        }

        // The member name may repeat inside the match, so search from the end.
        const inset = match[0].lastIndexOf(name);
        members.push({
            name,
            index: match.index + inset,
            className: type.qualifiedName,
            simpleClassName: type.name,
        });
    }

    return members;
}

/** Finds serialized UnityEvent fields declared in the source. */
export function findUnityEventFields(source: string): CSharpMember[] {
    return collectMembers(source, unityEventFieldRegex, 1);
}

/** Finds public method declarations, which are the ones a UnityEvent can bind to. */
export function findPublicMethods(source: string): CSharpMember[] {
    return collectMembers(source, publicMethodRegex, 2, 1);
}
