import { CodeLens, CodeLensProvider, Command, ProviderResult, TextDocument } from "vscode";
import { assetParser, parser, language } from "./extension";
import * as path from "path";

function getLocalizedTitle(type: string, count: number): string {
    if (language === "ko") {
        return `$(symbol-field) ${type} 참조 ${count}개`;
    }
    return `$(symbol-field) ${type} ${count} references`;
}

function formatTooltip(refs: string[], baseDir: string): string {
    return refs
        .map((filePath) => {
            const relative = path.relative(baseDir, filePath);
            return relative.replace(/\\/g, "/"); // 경로 구분자 통일
        })
        .join("\n");
}

export class UsageScenePrefabProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lenses: CodeLens[] = [];
        const guid = assetParser.getGuid(doc.fileName);
        if (!guid) return;

        const lines = doc.getText().split("\n");
        const classLine = parser.findClassName(lines);
        if (classLine === undefined) return;

        const baseDir = path.join(doc.uri.fsPath.split("Assets")[0], "Assets");

        [
            { type: "Scene", set: assetParser.scenes, ext: ".unity" },
            { type: "Prefab", set: assetParser.prefabs, ext: ".prefab" },
        ].forEach(({ type, set, ext }) => {
            const refs = assetParser.findReferences(guid, set);
            const title = getLocalizedTitle(type, refs.length);
            const tooltip = formatTooltip(refs, baseDir);

            const cmd: Command = {
                command: "", // 안내용 CodeLens
                title,
                tooltip,
            };

            lenses.push(new CodeLens(doc.lineAt(classLine).range, cmd));
        });

        return lenses;
    }
}