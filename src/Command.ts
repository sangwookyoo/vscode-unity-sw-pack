import { commands, Range, Uri, window, Position } from 'vscode';

export function searchInUnityDocumentation() {
    const editor = window.activeTextEditor;
    if (editor === undefined) return;

    const selection = editor.document.getText(editor.selection);

    commands.executeCommand(
        'vscode.open',
        Uri.parse(`https://docs.unity3d.com/ScriptReference/30_search.html?q=${selection}`)
    );
}

export function returnMethodType(returnType: string, line: number) {
    const editor = window.activeTextEditor;
    if (editor === undefined) return;

    if (returnType === 'void') {
        returnType = 'IEnumerator';
    } else if (returnType === 'IEnumerator') {
        returnType = 'void';
    }

    // System.Collections namespace 검사
    if (!editor.document.lineAt(0).text.includes('using System.Collections;')) {
        editor.edit((editBuilder) => {
            editBuilder.insert(new Position(0, 0), 'using System.Collections;\n');
        });
    }

    const methodRegExp = /(?:public|private|protected)?\s+(?:static\s+)?(?<returnType>[^\s]+)\s+(?<methodName>\w+)\s*\((?<parameters>[^)]*)\)/;
    const document = editor.document;
    const lineText = document.lineAt(line).text;
    const methodMatch = methodRegExp.exec(lineText);
    if (methodMatch && methodMatch.groups) {
        const { returnType: oldReturnType } = methodMatch.groups;
        const returnTypeIndex = lineText.indexOf(oldReturnType);
        const range = new Range(line, returnTypeIndex, line, returnTypeIndex + oldReturnType.length);
        editor.edit((editBuilder) => {
            editBuilder.replace(range, returnType);
        });
    }
}