// Line-level recognition of Unity message declarations.
//
// The prefixes come from the snippet catalog, which is language independent —
// they are C# method names. The parser used to build this regex from whichever
// localized snippet file matched the display language, which tied message
// detection to the UI language for no reason.
import { findClassLine } from "./csharp-syntax";
import { SNIPPET_PREFIXES } from "./snippet-catalog";

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default class UnityMessageParser {
    private readonly methodNameRegex = /(?:void|IEnumerator)\s+(\w+)\s*\(.*\)/;
    private readonly returnTypeRegex = /(?:public|private|protected)?\s+(?:static\s+)?(void|IEnumerator)\s+(\w+)\s*\(/;
    private readonly unityMessageIEnumeratorRegex = /^\s*IEnumerator\s+Start\s*\(\s*\)/;
    private readonly unityMessageRegex: RegExp;

    constructor() {
        const prefixes = SNIPPET_PREFIXES.map(escapeRegExp).join("|");
        this.unityMessageRegex = new RegExp(`\\bvoid\\s+(${prefixes})\\s*\\(.*\\)`);
    }

    public hasUnityMessage(line: string): boolean {
        return this.unityMessageRegex.test(line) || this.unityMessageIEnumeratorRegex.test(line);
    }

    public findReturnType(line: string): string | undefined {
        return this.returnTypeRegex.exec(line)?.[1];
    }

    public findMethodsName(line: string): string | undefined {
        return this.methodNameRegex.exec(line)?.[1];
    }

    public findClassName(lines: string[]): number | undefined {
        return findClassLine(lines);
    }
}
