import { commands, ConfigurationTarget, ExtensionContext, languages, workspace } from 'vscode';
import { UnityMessageCodeLensProvider, UnityMethodCodeLensProvider, UsagesCodeLensProvider } from './CodeLens';
import UnityMessageHoverProvider from "./Hover";
import { returnMethodType, searchInUnityDocumentation } from './Command';
import Parser from './Parser';
import AssetParser from './AssetParser';
import * as fs from "fs";
import * as metaFileSync from "./MetaFileSync";

export const parser = new Parser();
export const assetParser = new AssetParser();

export function activate(context: ExtensionContext) {
    if (workspace.getConfiguration('omnisharp')) {
        const omnisharp = workspace.getConfiguration('omnisharp');
        omnisharp.update('useModernNet', false, ConfigurationTarget.Global);
    }

    languages.registerCodeLensProvider({ language: "csharp" }, new UnityMessageCodeLensProvider());
    languages.registerCodeLensProvider({ language: "csharp" }, new UnityMethodCodeLensProvider());
    languages.registerCodeLensProvider({ language: "csharp" }, new UsagesCodeLensProvider());
    languages.registerHoverProvider({ language: "csharp" }, new UnityMessageHoverProvider());

    commands.registerCommand('unitySWpack.searchInUnityDocumentation', searchInUnityDocumentation);
    commands.registerCommand('unitySWpack.changeReturnType', (returnType: string, line: number) => {
        returnMethodType(returnType, line);
    });

    if (
        fs.existsSync(workspace.rootPath + "/Library") &&
        fs.existsSync(workspace.rootPath + "/Assets") &&
        fs.existsSync(workspace.rootPath + "/ProjectSettings")
    ) {
        metaFileSync.activate(context);
    }
}

export function deactivate() {
    metaFileSync.deactivate();
}