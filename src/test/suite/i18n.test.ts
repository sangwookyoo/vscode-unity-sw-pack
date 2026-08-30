import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import { DEFAULT_LOCALE, resolveLocale, SUPPORTED_LOCALES, SupportedLocale } from "../../i18n/locale";
import { getSnippetDescription, getSnippets, SNIPPET_PREFIXES } from "../../snippet-catalog";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

function readJson(relativePath: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf-8")) as Record<string, unknown>;
}

suite("locale resolution", () => {
    test("passes through the locales we ship", () => {
        for (const locale of SUPPORTED_LOCALES) {
            assert.strictEqual(resolveLocale(locale), locale);
        }
    });

    test("is case and separator insensitive", () => {
        assert.strictEqual(resolveLocale("KO"), "ko");
        assert.strictEqual(resolveLocale("zh-CN"), "zh-cn");
        assert.strictEqual(resolveLocale("zh_CN"), "zh-cn");
        assert.strictEqual(resolveLocale("  ja  "), "ja");
    });

    // The old code compared with `=== "ko"`, which breaks for every tag that
    // carries a region.
    test("maps Chinese variants onto the Simplified bundle", () => {
        assert.strictEqual(resolveLocale("zh"), "zh-cn");
        assert.strictEqual(resolveLocale("zh-tw"), "zh-cn");
        assert.strictEqual(resolveLocale("zh-hk"), "zh-cn");
        assert.strictEqual(resolveLocale("zh-hant"), "zh-cn");
    });

    test("falls back to the primary subtag, then to English", () => {
        assert.strictEqual(resolveLocale("ko-KR"), "ko");
        assert.strictEqual(resolveLocale("ja-JP"), "ja");
        assert.strictEqual(resolveLocale("en-GB"), "en");
        assert.strictEqual(resolveLocale("pt-br"), DEFAULT_LOCALE);
        assert.strictEqual(resolveLocale("de"), DEFAULT_LOCALE);
        assert.strictEqual(resolveLocale(""), DEFAULT_LOCALE);
        assert.strictEqual(resolveLocale(undefined), DEFAULT_LOCALE);
    });
});

suite("snippet catalog", () => {
    test("every locale yields a description for every snippet", () => {
        for (const locale of SUPPORTED_LOCALES) {
            const snippets = getSnippets(locale);
            assert.strictEqual(snippets.length, SNIPPET_PREFIXES.length, `${locale} snippet count`);

            for (const snippet of snippets) {
                assert.ok(snippet.description.trim().length > 0, `${locale}: ${snippet.prefix} has no description`);
                assert.ok(snippet.body.length > 0, `${locale}: ${snippet.prefix} has no body`);
                assert.ok(snippet.name.trim().length > 0, `${locale}: ${snippet.prefix} has no name`);
            }
        }
    });

    // The bodies are C#, so they must not vary with the display language. This is
    // the property that lets a new language ship as one description file.
    test("bodies are identical across locales", () => {
        const reference = getSnippets(DEFAULT_LOCALE);
        for (const locale of SUPPORTED_LOCALES) {
            const snippets = getSnippets(locale);
            snippets.forEach((snippet, i) => {
                assert.strictEqual(snippet.prefix, reference[i].prefix);
                assert.deepStrictEqual(snippet.body, reference[i].body);
            });
        }
    });

    test("translations are not left as the English text", () => {
        const english = getSnippets("en");
        for (const locale of SUPPORTED_LOCALES.filter((l) => l !== "en")) {
            const snippets = getSnippets(locale);
            const untranslated = snippets.filter((snippet, i) => snippet.description === english[i].description);
            assert.strictEqual(
                untranslated.length,
                0,
                `${locale} still shows English for: ${untranslated.map((s) => s.prefix).join(", ")}`
            );
        }
    });

    test("looks a description up by prefix", () => {
        assert.ok(getSnippetDescription("Update", "en")?.includes("frame"));
        assert.ok(getSnippetDescription("Update", "ko")?.includes("프레임"));
        assert.strictEqual(getSnippetDescription("NotAUnityMessage", "en"), undefined);
    });

    test("no UNET or otherwise removed message survives", () => {
        const removed = [
            "NetworkBehaviour",
            "OnConnectedToServer",
            "OnDisconnectedFromServer",
            "OnPlayerConnected",
            "OnPlayerDisconnected",
            "OnSerializeNetworkView",
            "OnServerInitialized",
            "OnMasterServerEvent",
            "OnNetworkInstantiate",
            "OnLevelWasLoaded",
        ];
        for (const prefix of removed) {
            assert.ok(!SNIPPET_PREFIXES.includes(prefix), `${prefix} is not part of Unity 6`);
        }
    });
});

suite("manifest localization", () => {
    const base = readJson("package.nls.json");
    const manifest = readJson("package.json") as any;

    test("every %key% in the manifest is declared in package.nls.json", () => {
        const referenced = new Set<string>();
        const walk = (value: unknown) => {
            if (typeof value === "string") {
                const match = /^%(.+)%$/.exec(value);
                if (match) {
                    referenced.add(match[1]);
                }
            } else if (Array.isArray(value)) {
                value.forEach(walk);
            } else if (value && typeof value === "object") {
                Object.values(value).forEach(walk);
            }
        };
        walk(manifest);

        assert.ok(referenced.size > 0, "the manifest should reference NLS keys");
        for (const key of referenced) {
            assert.ok(key in base, `package.nls.json is missing "${key}"`);
        }
    });

    test("every locale translates every manifest key", () => {
        for (const locale of SUPPORTED_LOCALES.filter((l) => l !== "en")) {
            const translated = readJson(`package.nls.${locale}.json`);
            for (const key of Object.keys(base)) {
                assert.ok(key in translated, `package.nls.${locale}.json is missing "${key}"`);
                assert.ok(
                    String(translated[key]).trim().length > 0,
                    `package.nls.${locale}.json has an empty "${key}"`
                );
            }
        }
    });

    test("every locale translates every runtime string", () => {
        const reference = readJson("l10n/bundle.l10n.ko.json");
        for (const locale of SUPPORTED_LOCALES.filter((l) => l !== "en")) {
            const bundle = readJson(`l10n/bundle.l10n.${locale}.json`);
            assert.deepStrictEqual(
                Object.keys(bundle).sort(),
                Object.keys(reference).sort(),
                `l10n/bundle.l10n.${locale}.json does not cover the same strings`
            );
        }
    });

    test("snippets are no longer contributed declaratively", () => {
        // contributes.snippets takes one static path, which is why the extension
        // used to rewrite its own manifest on activation.
        assert.strictEqual(manifest.contributes.snippets, undefined);
        assert.strictEqual(manifest.l10n, "./l10n");
    });

    test("descriptions files cover exactly the shipped prefixes", () => {
        for (const locale of SUPPORTED_LOCALES) {
            const descriptions = readJson(`src/i18n/descriptions.${locale}.json`);
            assert.deepStrictEqual(
                Object.keys(descriptions),
                [...SNIPPET_PREFIXES] as string[],
                `descriptions.${locale}.json does not match bodies.json`
            );
        }
    });
});

suite("locale coverage is exhaustive", () => {
    test("SUPPORTED_LOCALES has a description file each", () => {
        for (const locale of SUPPORTED_LOCALES as readonly SupportedLocale[]) {
            const file = path.join(REPO_ROOT, `src/i18n/descriptions.${locale}.json`);
            assert.ok(fs.existsSync(file), `missing ${file}`);
        }
    });
});
