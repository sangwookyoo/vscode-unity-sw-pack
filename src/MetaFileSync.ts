import { ExtensionContext, FileSystemWatcher, Uri, window, workspace } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let watcher: FileSystemWatcher;
let justCreated: Uri | void;
export async function activate(context: ExtensionContext) {
    watcher = workspace.createFileSystemWatcher("**/*");

    watcher.onDidCreate(uri => {
        if (uri.fsPath.endsWith(".meta")) {
            return;
        }

        if (!window.state.focused) {
            return;
        }

        if (justCreated !== undefined) {
            if (uri.fsPath.indexOf(justCreated.fsPath) >= 0) {
                return;
            }
        }

        setTimeout(() => justCreated = undefined, 200);
        justCreated = uri;
    });

    watcher.onDidDelete(uri => {
        if (uri.fsPath.endsWith(".meta")) {
            return;
        }

        if (!window.state.focused) {
            return;
        }

        if (justCreated !== undefined) {
            var justCreatedFsPath = justCreated.fsPath;
            var justDeletedFsPath = uri.fsPath;
            var justCreatedPath = path.parse(justCreatedFsPath);
            var justDeletedPath = path.parse(justDeletedFsPath);
            
            if (justCreatedPath.dir === justDeletedPath.dir) {
                fs.exists(justDeletedFsPath + ".meta", (exist: boolean) => {
                    if (exist) {
                        fs.rename(justDeletedFsPath + ".meta", justCreatedFsPath + ".meta", () => { });
                    }
                });
            } else if (justCreatedPath.base === justDeletedPath.base) {
                fs.exists(justDeletedFsPath + ".meta", (exist: boolean) => {
                    if (exist) {
                        fs.rename(justDeletedFsPath + ".meta", justCreatedFsPath + ".meta", () => { });
                    }
                });
            }
        } else {
            fs.exists(uri.fsPath + ".meta", (exist: boolean) => {
                if (exist) {
                    fs.unlink(uri.fsPath + ".meta", () => { });
                }
            });
        }
    });

}

export async function deactivate() {
    if (watcher !== undefined) {
        watcher.dispose();
    }
}