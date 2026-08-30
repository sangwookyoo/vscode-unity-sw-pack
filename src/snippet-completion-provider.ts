// Serves the snippets as completions instead of contributing them declaratively.
//
// "contributes.snippets" takes a single static path, so the extension used to
// rewrite its own package.json on activation to point at the language-matched
// file. Registering a provider serves every locale through one code path and
// removes that write entirely.
import {
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Disposable,
    languages,
    MarkdownString,
    SnippetString,
} from "vscode";

import { SupportedLocale } from "./i18n/locale";
import { getSnippets } from "./snippet-catalog";

export class UnitySnippetCompletionProvider implements CompletionItemProvider {
    private readonly items: CompletionItem[];

    constructor(locale: SupportedLocale) {
        this.items = getSnippets(locale).map((snippet) => {
            const item = new CompletionItem(snippet.prefix, CompletionItemKind.Snippet);
            item.detail = snippet.name;
            item.documentation = new MarkdownString(snippet.description);
            item.insertText = new SnippetString(snippet.body.join("\n"));
            // Sort with, not above, the C# language server's own proposals.
            item.filterText = snippet.prefix;
            return item;
        });
    }

    public provideCompletionItems(): CompletionItem[] {
        return this.items;
    }
}

export function registerSnippetCompletions(locale: SupportedLocale): Disposable {
    return languages.registerCompletionItemProvider({ language: "csharp" }, new UnitySnippetCompletionProvider(locale));
}
