import { CodeLensProvider, TextDocument, ProviderResult, CodeLens, Command, window, Position, Range } from "vscode";
import { parser, language } from "./extension";

export class TypeToggleProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lines = doc.getText().split('\n');
        const list = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!parser.isInBehaviour(lines, i)) continue;

            const returnType = parser.findReturnType(line);
            if (returnType === undefined) continue;

            let cmd: Command;
            if (language === 'ko') {
                cmd = {
                    command: "unitySWpack.changeReturnType",
                    title: "$(symbol-property) 타입 토글",
                    arguments: [returnType, i]
                };
            }
            else {
                cmd = {
                    command: "unitySWpack.changeReturnType",
                    title: "$(symbol-property) Type toggle",
                    arguments: [returnType, i]
                };
            }

            list.push(new CodeLens(doc.lineAt(i).range, cmd));
        }

        return list;
    }
}

export function returnMethodType(returnType: string, line: number) {
    const editor = window.activeTextEditor;
    if (editor === undefined) return;

    if (returnType === 'void') {
        returnType = 'IEnumerator';
    } else if (returnType === 'IEnumerator') {
        returnType = 'void';
    }

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