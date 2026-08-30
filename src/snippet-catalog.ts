// The snippet catalog: one set of bodies, four sets of descriptions.
//
// The bodies are C# and therefore identical in every language; only the
// description is translated. Keeping them in one file is what makes adding a
// language cheap — previously every body was duplicated per locale, and the
// manifest was rewritten at runtime to point at the right file.
//
// Free of "vscode" imports so the merge rules stay unit testable.
import * as bodies from "./snippets/bodies.json";
import * as descriptionsEn from "./i18n/descriptions.en.json";
import * as descriptionsJa from "./i18n/descriptions.ja.json";
import * as descriptionsKo from "./i18n/descriptions.ko.json";
import * as descriptionsZhCn from "./i18n/descriptions.zh-cn.json";
import { DEFAULT_LOCALE, SupportedLocale } from "./i18n/locale";

export interface SnippetBody {
    /** Display name, e.g. "Unity MonoBehaviour". */
    name: string;
    /** Completion trigger, which for Unity messages is the method name. */
    prefix: string;
    /**
     * Snippet body in VS Code snippet syntax. The format allows either a single
     * string or one entry per line, and both appear in bodies.json.
     */
    body: string | string[];
}

export interface Snippet extends Omit<SnippetBody, "body"> {
    /** Always normalized to lines, so callers never branch on the format. */
    body: string[];
    description: string;
}

type DescriptionMap = Record<string, string>;

const DESCRIPTIONS: Record<SupportedLocale, DescriptionMap> = {
    en: descriptionsEn,
    ko: descriptionsKo,
    "zh-cn": descriptionsZhCn,
    ja: descriptionsJa,
};

const BODIES = bodies as unknown as SnippetBody[];

/** Every snippet prefix. Language independent, since prefixes are C# names. */
export const SNIPPET_PREFIXES: readonly string[] = BODIES.map((entry) => entry.prefix);

const catalogCache = new Map<SupportedLocale, Snippet[]>();

/** Snippets for the given locale, falling back to English for a missing entry. */
export function getSnippets(locale: SupportedLocale): Snippet[] {
    const cached = catalogCache.get(locale);
    if (cached) {
        return cached;
    }

    const translated = DESCRIPTIONS[locale] ?? DESCRIPTIONS[DEFAULT_LOCALE];
    const fallback = DESCRIPTIONS[DEFAULT_LOCALE];

    const snippets = BODIES.map((entry) => ({
        ...entry,
        body: Array.isArray(entry.body) ? entry.body : [entry.body],
        description: translated[entry.prefix] ?? fallback[entry.prefix] ?? "",
    }));

    catalogCache.set(locale, snippets);
    return snippets;
}

/** Description of a single Unity message, used by the hover provider. */
export function getSnippetDescription(prefix: string, locale: SupportedLocale): string | undefined {
    return getSnippets(locale).find((snippet) => snippet.prefix === prefix)?.description;
}
