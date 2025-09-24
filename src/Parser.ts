import { env } from "vscode";
import * as snippetEn from "./snippets/en.json";
import * as snippetKo from "./snippets/ko.json";

export default class Parser {
    private readonly methodNameRegex: RegExp;
    private readonly returnTypeRegex: RegExp;
    private readonly unityMessageRegex: RegExp;
    private readonly unityMessageIEnumeratorRegex = /^IEnumerator\s+Start\s*\(\s*\)/;
    private readonly classRegex = /\bclass\s+\w+/;

    constructor() {
        this.methodNameRegex = /(?:void|IEnumerator)\s+(\w+)\s*\(.*\)/;
        this.returnTypeRegex = /(?:public|private|protected)?\s+(?:static\s+)?(void|IEnumerator)\s+(\w+)\s*\(/;

        // 언어에 따른 메시지 prefix 배열 생성
        const language = env.language;
        const snippetSource = language === "ko" ? Object.values(snippetKo) : Object.values(snippetEn);

        const prefixes = snippetSource.map((msg: any) => this.escapeRegExp(msg.prefix));
        this.unityMessageRegex = new RegExp(`\\bvoid\\s+(${prefixes.join("|")})\\s*\\(.*\\)`);
    }

    hasUnityMessage(line: string): boolean {
        return this.unityMessageRegex.test(line) || this.unityMessageIEnumeratorRegex.test(line);
    }

    findReturnType(line: string): string | undefined {
        const match = this.returnTypeRegex.exec(line);
        return match ? match[1] : undefined;
    }

    findMethodsName(line: string): string | undefined {
        const match = this.methodNameRegex.exec(line);
        return match ? match[1] : undefined;
    }

    findClassName(lines: string[]): number | undefined {
        return lines.findIndex(line => this.classRegex.test(line));
    }

    private escapeRegExp(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}