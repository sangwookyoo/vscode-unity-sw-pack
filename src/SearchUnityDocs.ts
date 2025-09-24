import { window, commands, Uri, Position, Selection } from "vscode";

const UNITY_DOCS_SEARCH_URL = "https://docs.unity3d.com/ScriptReference/30_search.html?q=";

export function searchUnityDocs() {
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
        const encoded = encodeURIComponent(query);
        commands.executeCommand("vscode.open", Uri.parse(`${UNITY_DOCS_SEARCH_URL}${encoded}`));
    } catch (err) {
        window.showErrorMessage("Unity 문서 검색을 실행할 수 없습니다.");
        console.error("searchUnityDocs error:", err);
    }
}