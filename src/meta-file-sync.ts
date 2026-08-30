import { Disposable, ExtensionContext, workspace } from "vscode";
import * as fs from "fs/promises";

let disposables: Disposable[] = [];

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function renameMetaFile(oldPath: string, newPath: string): Promise<void> {
    const oldMeta = oldPath + ".meta";
    const newMeta = newPath + ".meta";
    if (await fileExists(oldMeta)) {
        await fs.rename(oldMeta, newMeta);
    }
}

async function deleteMetaFile(filePath: string): Promise<void> {
    const meta = filePath + ".meta";
    if (await fileExists(meta)) {
        await fs.unlink(meta);
    }
}

export function activate(context: ExtensionContext) {
    // 기존 리스너가 있다면 정리
    deactivate();

    // 에디터에서 발생한 이름 변경/삭제 이벤트는 정확한 경로 쌍을 제공하므로 추측이 필요 없다.
    // 파일과 디렉터리 모두 <경로>.meta 규칙을 그대로 따른다.
    const renameDisposable = workspace.onDidRenameFiles(async (event) => {
        for (const { oldUri, newUri } of event.files) {
            if (oldUri.fsPath.endsWith(".meta")) {
                continue;
            }

            try {
                await renameMetaFile(oldUri.fsPath, newUri.fsPath);
            } catch (err) {
                console.error("Failed to rename meta file:", err);
            }
        }
    });

    const deleteDisposable = workspace.onDidDeleteFiles(async (event) => {
        for (const uri of event.files) {
            if (uri.fsPath.endsWith(".meta")) {
                continue;
            }

            try {
                await deleteMetaFile(uri.fsPath);
            } catch (err) {
                console.error("Failed to delete meta file:", err);
            }
        }
    });

    disposables = [renameDisposable, deleteDisposable];
    context.subscriptions.push(renameDisposable, deleteDisposable);
}

export function deactivate() {
    for (const disposable of disposables) {
        disposable.dispose();
    }
    disposables = [];
}
