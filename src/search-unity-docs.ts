import { Position, Uri, commands, l10n, window, workspace } from "vscode";
import { readDocsVersion } from "./unity-project";

// 프로젝트의 Unity 버전에 맞춘 문서 검색 URL (예: https://docs.unity3d.com/6000.0/Documentation/ScriptReference/30_search.html?q=)
function buildSearchUrl(docsVersion: string, query: string): string {
    return `https://docs.unity3d.com/${docsVersion}/Documentation/ScriptReference/30_search.html?q=${encodeURIComponent(query)}`;
}

// ProjectVersion.txt는 워크스페이스 폴더(루트)별로 한 번만 읽고 결과를 캐시한다
const docsVersionByRoot = new Map<string, Promise<string>>();

function resolveWorkspaceRoot(documentUri: Uri): string | undefined {
    // 여러 폴더가 열려 있을 수 있으므로 활성 문서가 속한 폴더를 우선한다
    return workspace.getWorkspaceFolder(documentUri)?.uri.fsPath ?? workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getDocsVersion(documentUri: Uri): Promise<string> {
    const workspaceRoot = resolveWorkspaceRoot(documentUri);
    const key = workspaceRoot ?? "";

    let cached = docsVersionByRoot.get(key);
    if (!cached) {
        cached = readDocsVersion(workspaceRoot);
        docsVersionByRoot.set(key, cached);
    }
    return cached;
}

export async function searchUnityDocs() {
    const editor = window.activeTextEditor;
    if (!editor) return;

    let query = editor.document.getText(editor.selection);

    // 선택 영역이 없으면 현재 커서 단어 검색
    if (!query) {
        const cursor = editor.selection.active;
        const wordRange = editor.document.getWordRangeAtPosition(new Position(cursor.line, cursor.character));
        if (wordRange) {
            query = editor.document.getText(wordRange);
        }
    }

    if (!query) {
        window.showInformationMessage(l10n.t("Select a word or place the cursor on one to search."));
        return;
    }

    try {
        const docsVersion = await getDocsVersion(editor.document.uri);
        await commands.executeCommand("vscode.open", Uri.parse(buildSearchUrl(docsVersion, query)));
    } catch (err) {
        window.showErrorMessage(l10n.t("Could not open the browser. Check your default browser setting."));
        console.error("searchUnityDocs error:", err);
    }
}
