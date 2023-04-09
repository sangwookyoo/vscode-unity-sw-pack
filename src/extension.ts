import { workspace, ExtensionContext, ConfigurationTarget, languages, commands, env } from "vscode";
import AssetParser from "./AssetParser";
import Parser from "./Parser";
import { UnityEventMessageProvider } from "./UnityEventMessage";
import { UsageScenePrefabProvider } from "./UsageScenePrefab";
import UnityMessageHoverProvider from "./Hover";
import { TypeToggleProvider, returnMethodType } from "./TypeToggle";
import { searchUnityDocs } from "./SearchUnityDocs";

import * as fs from 'fs';
import * as path from 'path';
import * as metaFileSync from "./MetaFileSync";

import * as unityLens from "./event-lens/unity-lens";

export const parser = new Parser();
export const assetParser = new AssetParser();

export const language = env.language;

const unitySWpack = workspace.getConfiguration('unitySWpack');
const unityEventMessageEnabled = unitySWpack.get('unityEventMessage');
const usageScenePrefabEnabled = unitySWpack.get('usageScenePrefab');
const unityMessageHoverEnabled = unitySWpack.get('unityMessageHover');
const typeToggleEnabled = unitySWpack.get('typeToggle');
const metaFileSyncEnabled = unitySWpack.get('metaFileSync');
const searchInUnityDocsEnabled = unitySWpack.get('searchInUnityDocs');
const unityEventLensEnabled = unitySWpack.get('unityEventLens');

export function activate(context: ExtensionContext) {
    let snippetsConfig;
    if (language === 'ko') {
        snippetsConfig = {
            "language": "csharp",
            "path": `./out/snippets/ko.json`
        };
    }
    else {
        snippetsConfig = {
            "language": "csharp",
            "path": `./out/snippets/en.json`
        };
    }

    const packageJSONPath = path.join(context.extensionPath, 'package.json');
    const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
    packageJSON.contributes.snippets = [snippetsConfig];
    fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 4));
    
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

    if (unityEventLensEnabled) {
        unityLens.activate(context);
    }
}

export function deactivate() {
    if (metaFileSyncEnabled) {
        metaFileSync.deactivate();
    }
}