import { workspace, ExtensionContext, languages, commands, env } from "vscode";
import * as fs from "fs";
import * as path from "path";

import Parser from "./unity-message-parser";
import { UnityEventMessageProvider } from "./unity-message-code-lens-provider";
import { UsageScenePrefabProvider } from "./asset-usage-code-lens-provider";
import UnityMessageHoverProvider from "./unity-message-hover-provider";
import { TypeToggleProvider, returnMethodType } from "./coroutine-toggle";
import { searchUnityDocs } from "./search-unity-docs";
import * as metaFileSync from "./meta-file-sync";
import * as unityEventLens from "./unity-event-lens";
import { initializeLogger } from "./logger";
import { UnityAssetIndex } from "./unity-asset-index";

export const parser = new Parser();
export const language = env.language;

function shouldEnableMetaFileSync(): boolean {
    const root = workspace.rootPath;
    if (!root) return false;

    const required = ["Library", "Assets", "ProjectSettings"];
    return required.every((dir) => fs.existsSync(path.join(root, dir)));
}

export function activate(context: ExtensionContext) {
    const unitySWpack = workspace.getConfiguration("unitySWpack");

    // Assets 인덱스는 실제로 필요한 기능이 켜져 있을 때만 생성한다
    let assetIndex: UnityAssetIndex | undefined;
    const getAssetIndex = (): UnityAssetIndex => {
        if (!assetIndex) {
            context.subscriptions.push(initializeLogger());
            assetIndex = new UnityAssetIndex();
            context.subscriptions.push(assetIndex);
        }
        return assetIndex;
    };

    const features = [
        {
            enabled: unitySWpack.get("unityEventMessage"),
            register: () =>
                context.subscriptions.push(
                    languages.registerCodeLensProvider({ language: "csharp" }, new UnityEventMessageProvider())
                ),
        },
        {
            enabled: unitySWpack.get("usageScenePrefab"),
            register: () => {
                const provider = new UsageScenePrefabProvider(getAssetIndex());
                context.subscriptions.push(
                    provider,
                    languages.registerCodeLensProvider({ language: "csharp" }, provider)
                );
            },
        },
        {
            enabled: unitySWpack.get("unityMessageHover"),
            register: () =>
                context.subscriptions.push(
                    languages.registerHoverProvider({ language: "csharp" }, new UnityMessageHoverProvider())
                ),
        },
        {
            enabled: unitySWpack.get("typeToggle"),
            register: () => {
                context.subscriptions.push(
                    languages.registerCodeLensProvider({ language: "csharp" }, new TypeToggleProvider()),
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

    for (const f of features) {
        if (f.enabled) {
            f.register();
        }
    }
}

export function deactivate() {
    metaFileSync.deactivate();
}
