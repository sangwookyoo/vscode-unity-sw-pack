import { Hover, HoverProvider, Position, ProviderResult, TextDocument } from "vscode";
import { parser, language } from "./extension";
import * as snippet from "./snippets/en.json";
import * as snippetKo from "./snippets/ko.json";

export default class UnityMessageHoverProvider implements HoverProvider {
    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        const lines = doc.getText().split("\n");
        const line = lines[pos.line];

        if (!parser.isInBehaviour(lines, pos.line)) return;
        if (!parser.hasUnityMessage(line)) return;

        const name = parser.findMethodsName(line);
        if (name === undefined) return;

        let msg;
        if (language === 'ko') msg = Object.values(snippetKo).find((msg) => msg.prefix === name);
        else msg = Object.values(snippet).find((msg) => msg.prefix === name);

        if (msg !== undefined) {
            const nameIndex = line.indexOf(name);
            const range = doc.getWordRangeAtPosition(new Position(pos.line, nameIndex));

            return new Hover(msg.description, range);
        }
    }
}