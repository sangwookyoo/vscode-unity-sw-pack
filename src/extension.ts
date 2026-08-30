import { ExtensionContext, commands, env, languages, workspace } from "vscode";
import * as fs from "fs";
import * as path from "path";

import { UsageScenePrefabProvider } from "./asset-usage-code-lens-provider";
import { TypeToggleProvider, returnMethodType } from "./coroutine-toggle";
import { resolveLocale } from "./i18n/locale";
import { initializeLogger } from "./logger";
import * as metaFileSync from "./meta-file-sync";
import { searchUnityDocs } from "./search-unity-docs";
import { registerSnippetCompletions } from "./snippet-completion-provider";
import { UnityAssetIndex } from "./unity-asset-index";
import * as unityEventLens from "./unity-event-lens";
import { UnityMessageCodeLensProvider } from "./unity-message-code-lens-provider";
import UnityMessageHoverProvider from "./unity-message-hover-provider";
import UnityMessageParser from "./unity-message-parser";

const CSHARP = { language: "csharp" };

export const parser = new UnityMessageParser();

function shouldEnableMetaFileSync(): boolean {
    const root = workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        return false;
    }

    const required = ["Library", "Assets", "ProjectSettings"];
    return required.every((dir) => fs.existsSync(path.join(root, dir)));
}

export function activate(context: ExtensionContext) {
    const unitySWpack = workspace.getConfiguration("unitySWpack");
    // VS Code reports region-qualified tags such as "zh-cn"; resolve once.
    const locale = resolveLocale(env.language);

    // The Assets index is only built when a feature actually needs it.
    let assetIndex: UnityAssetIndex | undefined;
    const getAssetIndex = (): UnityAssetIndex => {
        if (!assetIndex) {
            context.subscriptions.push(initializeLogger());
            assetIndex = new UnityAssetIndex();
            context.subscriptions.push(assetIndex);
        }
        return assetIndex;
    };

    // Snippets are served as completions rather than contributed declaratively,
    // so one code path covers every locale.
    context.subscriptions.push(registerSnippetCompletions(locale));

    const features = [
        {
            enabled: unitySWpack.get("unityEventMessage"),
            register: () =>
                context.subscriptions.push(
                    languages.registerCodeLensProvider(CSHARP, new UnityMessageCodeLensProvider(parser))
                ),
        },
        {
            enabled: unitySWpack.get("usageScenePrefab"),
            register: () => {
                const provider = new UsageScenePrefabProvider(getAssetIndex());
                context.subscriptions.push(provider, languages.registerCodeLensProvider(CSHARP, provider));
            },
        },
        {
            enabled: unitySWpack.get("unityMessageHover"),
            register: () =>
                context.subscriptions.push(
                    languages.registerHoverProvider(CSHARP, new UnityMessageHoverProvider(parser, locale))
                ),
        },
        {
            enabled: unitySWpack.get("typeToggle"),
            register: () => {
                context.subscriptions.push(
                    languages.registerCodeLensProvider(CSHARP, new TypeToggleProvider()),
                    commands.registerCommand("unitySWpack.changeReturnType", (returnType: string, line: number) => {
                        void returnMethodType(returnType, line);
                    })
                );
            },
        },
        {
            enabled: unitySWpack.get("metaFileSync") && shouldEnableMetaFileSync(),
            register: () => metaFileSync.activate(context),
        },
        {
            enabled: unitySWpack.get("searchInUnityDocs"),
            register: () =>
                context.subscriptions.push(
                    commands.registerCommand("unitySWpack.searchInUnityDocumentation", searchUnityDocs)
                ),
        },
        {
            enabled: unitySWpack.get("unityEventLens"),
            register: () => unityEventLens.activate(context, getAssetIndex()),
        },
    ];

    for (const feature of features) {
        if (feature.enabled) {
            feature.register();
        }
    }
}

export function deactivate() {
    metaFileSync.deactivate();
}
