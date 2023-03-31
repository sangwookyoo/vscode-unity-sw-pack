import { CodeLens, CodeLensProvider, Command, ProviderResult, TextDocument } from 'vscode';
import { parser } from './extension';
import { assetParser } from './extension';

export class UnityMethodCodeLensProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lines = doc.getText().split('\n');
        const list = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const returnType = parser.findReturnType(line);
            if (returnType === undefined) continue;

            let cmd: Command = {
                command: "unitySWpack.changeReturnType",
                title: "$(symbol-property) 타입 토글",
                arguments: [returnType, i]
            };

            list.push(new CodeLens(doc.lineAt(i).range, cmd));
        }

        return list;
    }
}

export class UnityMessageCodeLensProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lines = doc.getText().split('\n');
        const list = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!parser.hasUnityMessage(line)) continue;
            if (!parser.isInBehaviour(lines, i)) continue;

            const behaviour = parser.findBehaviour(lines);
            if (behaviour === undefined) continue;
            const openingLine = parser.findOpeningBracket(lines, behaviour);
            if (openingLine === undefined) continue;

            if (!parser.isLineOnBracketsLevel(lines, openingLine, i) && parser.findMethodsName(line) === undefined) continue;

            let cmd: Command = {
                command: "",
                title: "$(symbol-method) Unity 메시지",
                tooltip: "이 메서드는 Unity 런타임에 의해 호출됩니다."
            }

            list.push(new CodeLens(doc.lineAt(i).range, cmd));
        }

        return list;
    }
}

export class UsagesCodeLensProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lines = doc.getText().split('\n');
        const list: CodeLens[] = [];

        const guid = assetParser.getGuid(doc.fileName);
        if (guid === undefined) return;

        this.getCodeLenses(list, doc, lines, guid, assetParser.scenes, "Scene", 6);
        this.getCodeLenses(list, doc, lines, guid, assetParser.prefabs, "Prefab", 7);

        return list;
    }

    getCodeLenses(list: CodeLens[], doc: TextDocument, lines: string[], guid: string, assets: Set<string>, type: string, tooltipLength: number) {
        const behaviour = parser.findBehaviour(lines);
        if (behaviour === undefined) return;

        const refs = assetParser.findReferences(guid, assets);
        const title = this.formatTitle(type, refs.length);
        const tooltip = this.formatTooltip(refs, tooltipLength);

        const cmd: Command = {
            command: "",
            title: title,
            tooltip: tooltip,
        };

        list.push(new CodeLens(doc.lineAt(behaviour).range, cmd));
    }

    formatTitle(word: string, count: number): string {
        return `$(symbol-field) ${word} 참조 ${count}개`;
    }

    formatTooltip(refs: string[], extensionLength: number): string {
        return refs
            .map((prefab) => {
                const name = prefab.slice(0, prefab.length - extensionLength);
                return `${name.substring(name.indexOf("Assets\\"))}\n`;
            })
            .join("");
    }
}