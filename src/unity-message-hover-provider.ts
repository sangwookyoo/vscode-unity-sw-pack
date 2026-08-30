// Hover documentation for Unity message declarations.
import { Hover, HoverProvider, Position, ProviderResult, TextDocument } from "vscode";

import { SupportedLocale } from "./i18n/locale";
import { getSnippetDescription } from "./snippet-catalog";
import UnityMessageParser from "./unity-message-parser";

export default class UnityMessageHoverProvider implements HoverProvider {
    constructor(
        private readonly parser: UnityMessageParser,
        private readonly locale: SupportedLocale
    ) {}

    public provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        const lineText = doc.lineAt(pos.line).text;
        if (!this.parser.hasUnityMessage(lineText)) {
            return;
        }

        const methodName = this.parser.findMethodsName(lineText);
        if (!methodName) {
            return;
        }

        const description = getSnippetDescription(methodName, this.locale);
        if (!description) {
            return;
        }

        const nameIndex = lineText.indexOf(methodName);
        const range = doc.getWordRangeAtPosition(new Position(pos.line, nameIndex));
        return new Hover(description, range);
    }
}
