import {
    workspace,
    ExtensionContext,
    ConfigurationTarget,
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

function configureSnippets(context: ExtensionContext) {
    const snippetsConfig = {
        language: "csharp",
        path: language === "ko" ? "./out/snippets/ko.json" : "./out/snippets/en.json",
    };

    const packageJSONPath = path.join(context.extensionPath, "package.json");
    try {
        const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, "utf-8"));
        packageJSON.contributes.snippets = [snippetsConfig];
        fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 4));
    } catch (err) {
        console.error("Failed to configure snippets:", err);
    }
}

function configureOmnisharp() {
    const omnisharp = workspace.getConfiguration("omnisharp");
    if (omnisharp) {
        omnisharp.update("useModernNet", false, ConfigurationTarget.Global);
    }
}

function shouldEnableMetaFileSync(): boolean {
    const root = workspace.rootPath;
    if (!root) return false;

    const required = ["Library", "Assets", "ProjectSettings"];
    return required.every((dir) => fs.existsSync(path.join(root, dir)));
}

export function activate(context: ExtensionContext) {
    configureSnippets(context);
    configureOmnisharp();

    const unitySWpack = workspace.getConfiguration("unitySWpack");

    const features = [
        {
            enabled: unitySWpack.get("unityEventMessage"),
            register: () =>
                languages.registerCodeLensProvider({ language: "csharp" }, new UnityEventMessageProvider()),
        },
        {
            enabled: unitySWpack.get("usageScenePrefab"),
            register: () =>
                languages.registerCodeLensProvider({ language: "csharp" }, new UsageScenePrefabProvider()),
        },
        {
            enabled: unitySWpack.get("unityMessageHover"),
            register: () =>
                languages.registerHoverProvider({ language: "csharp" }, new UnityMessageHoverProvider()),
        },
        {
            enabled: unitySWpack.get("typeToggle"),
            register: () => {
                languages.registerCodeLensProvider({ language: "csharp" }, new TypeToggleProvider());
                commands.registerCommand("unitySWpack.changeReturnType", (returnType: string, line: number) => {
                    returnMethodType(returnType, line);
                });
            },
        },
        {
            enabled: unitySWpack.get("metaFileSync") && shouldEnableMetaFileSync(),
            register: () => metaFileSync.activate(context),
        },
        {
            enabled: unitySWpack.get("searchInUnityDocs"),
            register: () =>
                commands.registerCommand("unitySWpack.searchInUnityDocumentation", searchUnityDocs),
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