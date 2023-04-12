import { env } from "vscode";
import * as snippet from "./snippets/en.json";
import * as snippetKo from "./snippets/ko.json";

export default class Parser {
    private findMethodNameExp = new RegExp(/(?:void|IEnumerator) *(.*?) *\(.*\)/);
    private findReturnTypeExp = new RegExp(/(?:public|private|protected)?\s+(?:static\s+)?(void|IEnumerator)\s+(\w+)\s*\(/);
    private hasUnityMessageExp: RegExp;
    private hasUnityMessageIEnumeratorExp = new RegExp("IEnumerator *Start *\(\)");

    constructor() {
        let methodNames = "";

        const language = env.language;
        if (language === 'ko') {
            for (const msg of Object.values(snippetKo)) {
                methodNames += msg.prefix;
    
                if (Object.values(snippetKo).indexOf(msg) < Object.values(snippetKo).length - 1) {
                    methodNames += "|";
                }
            }
        }
        else {
            for (const msg of Object.values(snippet)) {
                methodNames += msg.prefix;
    
                if (Object.values(snippet).indexOf(msg) < Object.values(snippet).length - 1) {
                    methodNames += "|";
                }
            }
        }

        this.hasUnityMessageExp = new RegExp("void *(" + methodNames + ") *\\(.*\\)");
    }

    hasUnityMessage(line: string): boolean {
        return this.hasUnityMessageExp.test(line) || this.hasUnityMessageIEnumeratorExp.test(line);
    }

    findReturnType(line: string): string | undefined {
        const matches = line.match(this.findReturnTypeExp);

        if (matches !== null) {
            return matches[1];
        }
    }

    findMethodsName(line: string): string | undefined {
        const matches = line.match(this.findMethodNameExp);

        if (matches !== null) {
            return matches[1];
        }
    }

    findClassName(lines: string[]): number | undefined {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes("class")) {
                return i;
            }
        }
    }
}