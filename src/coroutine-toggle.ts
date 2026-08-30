import {
    CodeLens,
    CodeLensProvider,
    Command,
    Position,
    ProviderResult,
    Range,
    TextDocument,
    l10n,
    window,
} from "vscode";
import { parser } from "./extension";

const methodRegExp =
    /(?:public|private|protected)?\s+(?:static\s+)?(?<returnType>[^\s]+)\s+(?<methodName>\w+)\s*\((?<parameters>[^)]*)\)/;

function getLocalizedCommandTitle(): string {
    return l10n.t("$(symbol-property) Change coroutine");
}

export class TypeToggleProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lenses: CodeLens[] = [];
        const commandTitle = getLocalizedCommandTitle();

        for (let i = 0; i < doc.lineCount; i++) {
            const returnType = parser.findReturnType(doc.lineAt(i).text);
            if (!returnType) continue;

            const cmd: Command = {
                command: "unitySWpack.changeReturnType",
                title: commandTitle,
                arguments: [returnType, i],
            };

            lenses.push(new CodeLens(doc.lineAt(i).range, cmd));
        }

        return lenses;
    }
}

export async function returnMethodType(returnType: string, line: number) {
    const editor = window.activeTextEditor;
    if (!editor) return;

    let newReturnType: string | undefined;
    if (returnType === "void") newReturnType = "IEnumerator";
    else if (returnType === "IEnumerator") newReturnType = "void";
    else return;

    const document = editor.document;
    const lineText = document.lineAt(line).text;
    const match = methodRegExp.exec(lineText);

    if (!match?.groups) return;

    const { returnType: oldReturnType } = match.groups;
    const returnTypeIndex = lineText.indexOf(oldReturnType);
    const range = new Range(line, returnTypeIndex, line, returnTypeIndex + oldReturnType.length);

    await editor.edit((editBuilder) => {
        // 반환형 교체
        editBuilder.replace(range, newReturnType!);

        // using 추가 (없을 때만)
        if (newReturnType === "IEnumerator" && !document.lineAt(0).text.includes("using System.Collections;")) {
            editBuilder.insert(new Position(0, 0), "using System.Collections;\n");
        }
    });
}
