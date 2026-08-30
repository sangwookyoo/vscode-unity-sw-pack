import {
    CodeLens,
    CodeLensProvider,
    Command,
    Disposable,
    Event,
    EventEmitter,
    TextDocument,
    workspace,
} from "vscode";
import { parser, language } from "./extension";
import { findAssetsRoot } from "./UnityProject";
import { UnityAssetIndex } from "./unity-asset-index";
import * as path from "path";

function getLocalizedTitle(type: string, count: number): string {
    if (language === "ko") {
        return `$(symbol-field) ${type} 참조 ${count}개`;
    }
    return `$(symbol-field) ${type} ${count} references`;
}

function formatTooltip(refs: string[], baseDir: string | undefined): string {
    return refs
        .map((filePath) => {
            const relative = baseDir ? path.relative(baseDir, filePath) : filePath;
            return relative.replace(/\\/g, "/"); // 경로 구분자 통일
        })
        .join("\n");
}

export class UsageScenePrefabProvider implements CodeLensProvider, Disposable {
    private readonly changeEmitter = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this.changeEmitter.event;

    private readonly indexListener: Disposable;

    constructor(private readonly index: UnityAssetIndex) {
        // 인덱싱은 비동기로 채워지므로 완료 시점에 CodeLens를 다시 요청해야 한다
        this.indexListener = index.onDidChangeIndex(() => this.changeEmitter.fire());
    }

    provideCodeLenses(doc: TextDocument): CodeLens[] {
        const lenses: CodeLens[] = [];
        const guid = this.index.getGuid(doc.fileName);
        if (!guid) {
            return lenses;
        }

        const lines = doc.getText().split("\n");
        const classLine = parser.findClassName(lines);
        if (classLine === undefined) {
            return lenses;
        }

        // 상위 디렉터리에 "Assets" 문자열이 포함되어도 안전하도록 실제 Assets 루트를 찾는다
        const workspaceRoot = workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath;
        const baseDir = findAssetsRoot(doc.uri.fsPath, workspaceRoot);

        [
            { type: "Scene", refs: this.index.getSceneReferences(guid) },
            { type: "Prefab", refs: this.index.getPrefabReferences(guid) },
        ].forEach(({ type, refs }) => {
            const cmd: Command = {
                command: "", // 안내용 CodeLens
                title: getLocalizedTitle(type, refs.length),
                tooltip: formatTooltip(refs, baseDir),
            };

            lenses.push(new CodeLens(doc.lineAt(classLine).range, cmd));
        });

        return lenses;
    }

    dispose(): void {
        this.indexListener.dispose();
        this.changeEmitter.dispose();
    }
}
