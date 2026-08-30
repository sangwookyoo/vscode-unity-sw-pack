import {
    workspace,
    ExtensionContext,
    languages,
    commands,
    env,
} from "vscode";
import * as fs from "fs";
import * as path from "path";

import AssetParser from "./AssetParser";
import Parser from "./Parser";
import { UnityEventMessageProvider } from "./UnityEventMessage";
import { UsageScenePrefabProvider } from "./UsageScenePrefab";
import UnityMessageHoverProvider from "./Hover";
import { TypeToggleProvider, returnMethodType } from "./TypeToggle";
import { searchUnityDocs } from "./SearchUnityDocs";
import * as metaFileSync from "./MetaFileSync";
import * as unityLens from "./event-lens/unity-lens";

export const parser = new Parser();
export const assetParser = new AssetParser();
export const language = env.language;

function shouldEnableMetaFileSync(): boolean {
    const root = workspace.rootPath;
    if (!root) return false;

    const required = ["Library", "Assets", "ProjectSettings"];
    return required.every((dir) => fs.existsSync(path.join(root, dir)));
}

export function activate(context: ExtensionContext) {
    const unitySWpack = workspace.getConfiguration("unitySWpack");

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
            register: () =>
                context.subscriptions.push(
                    languages.registerCodeLensProvider({ language: "csharp" }, new UsageScenePrefabProvider())
                ),
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
                        returnMethodType(returnType, line);
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
            register: () => unityLens.activate(context),
        },
    ];

    for (const f of features) {
        if (f.enabled) {
            f.register();
        }
    }
}

export function deactivate() {
    try {
        assetParser.dispose();
    } catch {}
    try {
        metaFileSync.deactivate();
    } catch {}
}
