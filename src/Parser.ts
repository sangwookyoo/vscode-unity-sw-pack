import * as snippet from "./snippets.json";

export default class Parser {
    private findBehaviourExp = new RegExp(/class.*: *(Mono|Network)Behaviour/);
    private findMethodNameExp = new RegExp(/(?:void|IEnumerator) *(.*?) *\(.*\)/);
    private findReturnTypeExp = new RegExp(/(?:public|private|protected)?\s+(?:static\s+)?(\w+)\s+(\w+)\s*\(/);
    private hasUnityMessageExp: RegExp;
    private hasUnityMessageIEnumeratorExp = new RegExp("IEnumerator *Start *\(\)");

    constructor() {
        let methodNames = "";

        for (const msg of Object.values(snippet)) {
            methodNames += msg.prefix;

            if (Object.values(snippet).indexOf(msg) < Object.values(snippet).length - 1) {
                methodNames += "|";
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

    findBehaviour(lines: string[]): number | undefined {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (this.findBehaviourExp.test(line)) {
                return i;
            }
        }
    }

    findClosingBracket(lines: string[], openingBracketLine: number): number | undefined {
        let count = 0;
        for (let i = openingBracketLine; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes("{")) {
                count += 1;
            }

            if (line.includes("}")) {
                count -= 1;

                if (count === 0) {
                    return i;
                }
            }
        }
    }

    findOpeningBracket(lines: string[], startLine: number): number | undefined {
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes("{")) {
                return i;
            }
        }
    }


    findAllMethodsNames(lines: string[]): string[] {
        const names = [];

        for (const line of lines) {
            const name = this.findMethodsName(line);

            if (name !== undefined) {
                names.push(name);
            }
        }

        return names;
    }

    isLineOnBracketsLevel(lines: string[], openingBracketLine: number, lineIndex: number): boolean {
        let count = 0;
        for (let i = openingBracketLine; i < lines.length; i++) {
            const line = lines[i];

            if (i === lineIndex && count === 1 && (!line.includes("{") && !line.includes("}") || line.includes("{") && line.includes("}"))) {
                return true;
            }

            if (line.includes("{")) {
                count += 1;
            }

            if (line.includes("}")) {
                count -= 1;
            }
        }

        return false;
    }

    isInBehaviour(lines: string[], line: number): boolean {
        const behaviourLine = this.findBehaviour(lines);
        if (behaviourLine === undefined) return false;
        const openingLine = this.findOpeningBracket(lines, behaviourLine);
        if (openingLine === undefined) return false;
        const closingLine = this.findClosingBracket(lines, openingLine);
        if (closingLine === undefined) return false;

        return line > openingLine && line < closingLine;
    }

    findClass(lines: string[]): number | undefined {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes("class")) {
                return i;
            }
        }
    }
}