import { CodeLens, CodeLensProvider, Command, ProviderResult, TextDocument } from 'vscode';
import { assetParser, parser, language } from './extension';

export class UsageScenePrefabProvider implements CodeLensProvider {
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
        const className = parser.findClassName(lines);
        if (className === undefined) return;

            const refs = assetParser.findReferences(guid, assets);
            const title = this.formatTitle(type, refs.length);
            const tooltip = this.formatTooltip(refs, tooltipLength);

            const cmd: Command = {
                command: "",
                title: title,
                tooltip: tooltip,
            };

            list.push(new CodeLens(doc.lineAt(className).range, cmd));
    }

    formatTitle(word: string, count: number): string {
        if (language === 'ko') return `$(symbol-field) ${word} 참조 ${count}개`;
        else return `$(symbol-field) ${word} ${count} references`;
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