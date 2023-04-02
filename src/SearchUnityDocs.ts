import { window, commands, Uri } from "vscode";

export function searchUnityDocs() {
    const editor = window.activeTextEditor;
    if (editor === undefined) return;

    const selection = editor.document.getText(editor.selection);

    commands.executeCommand(
        'vscode.open',
        Uri.parse(`https://docs.unity3d.com/ScriptReference/30_search.html?q=${selection}`)
    );
}