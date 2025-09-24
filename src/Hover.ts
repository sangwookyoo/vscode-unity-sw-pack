import { Hover, HoverProvider, Position, ProviderResult, TextDocument } from "vscode";
import { parser, language } from "./extension";
import * as snippetEn from "./snippets/en.json";
import * as snippetKo from "./snippets/ko.json";

type SnippetEntry = { prefix: string; description: string };

// prefix → SnippetEntry 매핑 (언어별)
const snippetMapEn: Map<string, SnippetEntry> = new Map(
    Object.values(snippetEn).map((msg: any) => [msg.prefix, msg])
);
const snippetMapKo: Map<string, SnippetEntry> = new Map(
    Object.values(snippetKo).map((msg: any) => [msg.prefix, msg])
);

function getMessageByPrefix(prefix: string): SnippetEntry | undefined {
    return language === "ko" ? snippetMapKo.get(prefix) : snippetMapEn.get(prefix);
}

export default class UnityMessageHoverProvider implements HoverProvider {
    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        const lineText = doc.lineAt(pos.line).text;

        if (!parser.hasUnityMessage(lineText)) {
            return;
        }

        const methodName = parser.findMethodsName(lineText);
        if (!methodName) {
            return;
        }

        const msg = getMessageByPrefix(methodName);
        if (!msg) {
            return;
        }

        const nameIndex = lineText.indexOf(methodName);
        const range = doc.getWordRangeAtPosition(new Position(pos.line, nameIndex));
        return new Hover(msg.description, range);
    }
}