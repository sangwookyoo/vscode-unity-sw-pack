import { CodeLensProvider, TextDocument, ProviderResult, CodeLens, Command } from "vscode";
import { parser, language } from "./extension";

function getLocalizedMessage(): { title: string; tooltip: string } {
    if (language === "ko") {
        return {
            title: "$(symbol-method) Unity 메시지",
            tooltip: "이 메서드는 Unity 런타임에 의해 호출됩니다.",
        };
    }
    return {
        title: "$(symbol-method) Unity Message",
        tooltip: "This method is invoked by Unity runtime",
    };
}

export class UnityEventMessageProvider implements CodeLensProvider {
    provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lenses: CodeLens[] = [];
        const lines = doc.getText().split("\n");
        const localized = getLocalizedMessage();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!parser.hasUnityMessage(line)) continue;

            const methodName = parser.findMethodsName(line);
            if (!methodName) continue;

            const cmd: Command = {
                command: "", // 안내용 CodeLens
                title: localized.title,
                tooltip: localized.tooltip,
            };

            lenses.push(new CodeLens(doc.lineAt(i).range, cmd));
        }

        return lenses;
    }
}