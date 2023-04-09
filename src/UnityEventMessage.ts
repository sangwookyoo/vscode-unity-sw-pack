import { CodeLensProvider, TextDocument, ProviderResult, CodeLens, Command } from "vscode";
import { parser, language } from "./extension";

export class UnityEventMessageProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lines = doc.getText().split('\n');
        const list = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!parser.hasUnityMessage(line)) continue;
            if (!parser.isInBehaviour(lines, i)) continue;

            const behaviour = parser.findBehaviour(lines);
            if (behaviour === undefined) continue;
            const openingLine = parser.findOpeningBracket(lines, behaviour);
            if (openingLine === undefined) continue;

            if (!parser.isLineOnBracketsLevel(lines, openingLine, i) && parser.findMethodsName(line) === undefined) continue;

            let cmd: Command;
            if (language === 'ko')
            {
                cmd = {
                    command: "",
                    title: "$(symbol-method) Unity 메시지",
                    tooltip: "이 메서드는 Unity 런타임에 의해 호출됩니다."
                };
            }
            else {
                cmd = {
                    command: "",
                    title: "$(symbol-method) Unity Message",
                    tooltip: "This method is invoked by Unity runtime"
                };
            }

            list.push(new CodeLens(doc.lineAt(i).range, cmd));
        }

        return list;
    }
}