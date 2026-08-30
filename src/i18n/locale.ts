// Locale resolution. Free of "vscode" imports so the rules stay unit testable.
//
// VS Code reports its display language as an IETF-ish tag: "en", "ko", "ja",
// "zh-cn", "zh-tw", "pt-br". The extension used to compare it with `=== "ko"`,
// which silently breaks for every region-qualified tag.

/** Locales the extension ships descriptions and UI strings for. */
export const SUPPORTED_LOCALES = ["en", "ko", "zh-cn", "ja"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

// Tags that should resolve to a locale we ship rather than fall back to English.
const ALIASES: Record<string, SupportedLocale> = {
    // Traditional Chinese readers are served the Simplified bundle: the Unity
    // terminology is close enough to be useful, and English would be worse.
    "zh-tw": "zh-cn",
    "zh-hk": "zh-cn",
    "zh-mo": "zh-cn",
    "zh-hans": "zh-cn",
    "zh-hant": "zh-cn",
    zh: "zh-cn",
};

/**
 * Maps a VS Code display language onto a locale the extension ships.
 * Matches the full tag first, then its aliases, then the primary subtag, and
 * falls back to English.
 */
export function resolveLocale(language: string | undefined): SupportedLocale {
    if (!language) {
        return DEFAULT_LOCALE;
    }

    const tag = language.trim().toLowerCase().replace(/_/g, "-");
    if (!tag) {
        return DEFAULT_LOCALE;
    }

    if ((SUPPORTED_LOCALES as readonly string[]).includes(tag)) {
        return tag as SupportedLocale;
    }

    const alias = ALIASES[tag];
    if (alias) {
        return alias;
    }

    const primary = tag.split("-")[0];
    if ((SUPPORTED_LOCALES as readonly string[]).includes(primary)) {
        return primary as SupportedLocale;
    }

    return ALIASES[primary] ?? DEFAULT_LOCALE;
}
