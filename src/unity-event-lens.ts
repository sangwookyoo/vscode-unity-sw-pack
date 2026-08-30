// Registration of the UnityEvent lens: a CodeLens over UnityEvent fields and over
// the public methods scenes and prefabs invoke, plus a hover listing them.
import { ExtensionContext, commands, languages } from "vscode";

import { UnityAssetIndex } from "./unity-asset-index";
import UnityEventCodeLensProvider, { showEventReferences } from "./unity-event-code-lens-provider";
import { UnityEventFinder } from "./unity-event-finder";
import UnityEventHoverProvider from "./unity-event-hover-provider";

export function activate(context: ExtensionContext, index: UnityAssetIndex): void {
    const finder = new UnityEventFinder(index);
    const codeLensProvider = new UnityEventCodeLensProvider(finder, index);
    const documentSelector = { language: "csharp" };

    context.subscriptions.push(
        codeLensProvider,
        languages.registerCodeLensProvider(documentSelector, codeLensProvider),
        languages.registerHoverProvider(documentSelector, new UnityEventHoverProvider(finder)),
        commands.registerCommand("unitySWpack.showEventReferences", showEventReferences)
    );
}
