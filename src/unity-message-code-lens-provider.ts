// Marks the methods Unity calls on its own, so they are not mistaken for dead code.
import { CodeLens, CodeLensProvider, Command, ProviderResult, TextDocument, l10n } from "vscode";

import UnityMessageParser from "./unity-message-parser";

export class UnityMessageCodeLensProvider implements CodeLensProvider {
    constructor(private readonly parser: UnityMessageParser) {}

    public provideCodeLenses(doc: TextDocument): ProviderResult<CodeLens[]> {
        const lenses: CodeLens[] = [];
        const title = l10n.t("$(symbol-method) Unity Message");
        const tooltip = l10n.t("Unity calls this method for you. You do not need to call it yourself.");

        for (let i = 0; i < doc.lineCount; i++) {
            const line = doc.lineAt(i);
            if (!this.parser.hasUnityMessage(line.text)) {
                continue;
            }
            if (!this.parser.findMethodsName(line.text)) {
                continue;
            }

            // No command: this lens is informational.
            const command: Command = { command: "", title, tooltip };
            lenses.push(new CodeLens(line.range, command));
        }

        return lenses;
    }
}
