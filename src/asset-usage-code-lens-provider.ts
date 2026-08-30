import {
    CodeLens,
    CodeLensProvider,
    Command,
    Disposable,
    Event,
    EventEmitter,
    TextDocument,
    l10n,
    workspace,
} from "vscode";
import { parser } from "./extension";
import { findAssetsRoot } from "./unity-project";
import { UnityAssetIndex } from "./unity-asset-index";
import * as path from "path";

function getLocalizedTitle(type: "scene" | "prefab", count: number): string {
    // "Used in" rather than "references": the reader wants to know where the
    // script is attached, not how the index models it.
    return type === "prefab"
        ? l10n.t("$(references) Used in {0} prefabs", String(count))
        : l10n.t("$(references) Used in {0} scenes", String(count));
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

        // Resolve the real Assets root so a parent folder containing "Assets" is safe.
        const workspaceRoot = workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath;
        const baseDir = findAssetsRoot(doc.uri.fsPath, workspaceRoot);

        const groups: Array<{ type: "scene" | "prefab"; refs: string[] }> = [
            { type: "scene", refs: this.index.getSceneReferences(guid) },
            { type: "prefab", refs: this.index.getPrefabReferences(guid) },
        ];

        for (const { type, refs } of groups) {
            const cmd: Command = {
                command: "", // informational lens
                title: getLocalizedTitle(type, refs.length),
                tooltip: formatTooltip(refs, baseDir),
            };

            lenses.push(new CodeLens(doc.lineAt(classLine).range, cmd));
        }

        return lenses;
    }

    dispose(): void {
        this.indexListener.dispose();
        this.changeEmitter.dispose();
    }
}
