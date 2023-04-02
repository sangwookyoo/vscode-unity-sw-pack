import { workspace, ExtensionContext, ConfigurationTarget, languages, commands } from "vscode";
import AssetParser from "./AssetParser";
import Parser from "./Parser";
import { UnityEventMessageProvider } from "./UnityEventMessage";
import { UsageScenePrefabProvider } from "./UsageScenePrefab";
import UnityMessageHoverProvider from "./Hover";
import { TypeToggleProvider, returnMethodType } from "./TypeToggle";
import { searchUnityDocs } from "./SearchUnityDocs";

import * as fs from 'fs';
import * as metaFileSync from "./MetaFileSync";

export const parser = new Parser();
export const assetParser = new AssetParser();

const unitySWpack = workspace.getConfiguration('unitySWpack');
const unityEventMessageEnabled = unitySWpack.get('unityEventMessage');
const usageScenePrefabEnabled = unitySWpack.get('usageScenePrefab');
const unityMessageHoverEnabled = unitySWpack.get('unityMessageHover');
const typeToggleEnabled = unitySWpack.get('typeToggle');
const metaFileSyncEnabled = unitySWpack.get('metaFileSync');
const searchInUnityDocsEnabled = unitySWpack.get('searchInUnityDocs');

export function activate(context: ExtensionContext) {
    if (workspace.getConfiguration('omnisharp')) {
        const omnisharp = workspace.getConfiguration('omnisharp');
        omnisharp.update('useModernNet', false, ConfigurationTarget.Global);
    }

    if (unityEventMessageEnabled) {
        languages.registerCodeLensProvider({ language: "csharp" }, new UnityEventMessageProvider());
    }

    if (usageScenePrefabEnabled) {
        languages.registerCodeLensProvider({ language: "csharp" }, new UsageScenePrefabProvider());
    }

    if (unityMessageHoverEnabled) {
        languages.registerHoverProvider({ language: "csharp" }, new UnityMessageHoverProvider());
    }

    if (typeToggleEnabled) {
        languages.registerCodeLensProvider({ language: "csharp" }, new TypeToggleProvider());
        commands.registerCommand('unitySWpack.changeReturnType', (returnType: string, line: number) => {
            returnMethodType(returnType, line);
        });
    }

    if (metaFileSyncEnabled) {
        if (
            fs.existsSync(workspace.rootPath + "/Library") &&
            fs.existsSync(workspace.rootPath + "/Assets") &&
            fs.existsSync(workspace.rootPath + "/ProjectSettings")
        ) {
            metaFileSync.activate(context);
        }
    }

    if (searchInUnityDocsEnabled) {
        commands.registerCommand('unitySWpack.searchInUnityDocumentation', searchUnityDocs);
    }
}

export function deactivate() {
    if (metaFileSyncEnabled) {
        metaFileSync.deactivate();
    }
}