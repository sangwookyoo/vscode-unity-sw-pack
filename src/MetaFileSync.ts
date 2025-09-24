import { ExtensionContext, FileSystemWatcher, Uri, window, workspace } from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

let watcher: FileSystemWatcher | undefined;
let justCreated: Uri | undefined;

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

export async function activate(context: ExtensionContext) {
    // 기존 watcher가 있다면 정리
    if (watcher) {
        watcher.dispose();
    }

    watcher = workspace.createFileSystemWatcher("**/*");

    watcher.onDidCreate((uri) => {
        if (uri.fsPath.endsWith(".meta")) return;
        if (!window.state.focused) return;

        // 같은 파일 이벤트 중복 방지
        if (justCreated && uri.fsPath.includes(justCreated.fsPath)) return;

        justCreated = uri;
        setTimeout(() => {
            justCreated = undefined;
        }, 200);
    });

    watcher.onDidDelete(async (uri) => {
        if (uri.fsPath.endsWith(".meta")) return;
        if (!window.state.focused) return;

        if (justCreated) {
            const created = path.parse(justCreated.fsPath);
            const deleted = path.parse(uri.fsPath);

            if (created.dir === deleted.dir || created.base === deleted.base) {
                await renameMetaFile(uri.fsPath, justCreated.fsPath);
                return;
            }
        }

        // justCreated가 없거나 조건 불충족 시 meta 삭제
        await deleteMetaFile(uri.fsPath);
    });
}

export async function deactivate() {
    if (watcher) {
        watcher.dispose();
        watcher = undefined;
    }
}