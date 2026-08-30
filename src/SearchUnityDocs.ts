import { window, commands, Uri, Position, workspace } from "vscode";
import { readDocsVersion } from "./UnityProject";

// 프로젝트의 Unity 버전에 맞춘 문서 검색 URL (예: https://docs.unity3d.com/6000.0/Documentation/ScriptReference/30_search.html?q=)
function buildSearchUrl(docsVersion: string, query: string): string {
    return `https://docs.unity3d.com/${docsVersion}/Documentation/ScriptReference/30_search.html?q=${encodeURIComponent(query)}`;
}

// ProjectVersion.txt는 활성화 이후 한 번만 읽고 결과를 캐시한다
let docsVersionPromise: Promise<string> | undefined;

function getDocsVersion(): Promise<string> {
    if (!docsVersionPromise) {
        const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
        docsVersionPromise = readDocsVersion(workspaceRoot);
    }
    return docsVersionPromise;
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
        window.showInformationMessage("검색할 Unity API를 선택하거나 커서를 위치시켜 주세요.");
        return;
    }

    try {
        const docsVersion = await getDocsVersion();
        await commands.executeCommand("vscode.open", Uri.parse(buildSearchUrl(docsVersion, query)));
    } catch (err) {
        window.showErrorMessage("Unity 문서 검색을 실행할 수 없습니다.");
        console.error("searchUnityDocs error:", err);
    }
}