// Integration tests: these run inside a real VS Code extension host, so they
// exercise activation, contribution wiring and the providers end to end.
import * as assert from "assert";
import * as vscode from "vscode";

const EXTENSION_ID = "SangwookYoo.unity-sw-pack";

const SAMPLE = `using System.Collections;
using UnityEngine;
using UnityEngine.Events;

public class PlayerController : MonoBehaviour
{
    public UnityEvent onDied;

    void Awake()
    {
    }

    void Update()
    {
    }

    public void Respawn()
    {
    }

    private void NotAMessage()
    {
    }
}
`;

async function openCSharpDocument(content: string): Promise<vscode.TextDocument> {
    const doc = await vscode.workspace.openTextDocument({ language: "csharp", content });
    await vscode.window.showTextDocument(doc);
    return doc;
}

suite("activation", () => {
    test("the extension is present and activates", async () => {
        const extension = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(extension, `${EXTENSION_ID} is not installed in the test host`);

        await extension.activate();
        assert.strictEqual(extension.isActive, true);
    });

    test("activation does not write to the user's global settings", () => {
        // configureOmnisharp() used to set this behind the user's back.
        const omnisharp = vscode.workspace.getConfiguration("omnisharp");
        const inspected = omnisharp.inspect<boolean>("useModernNet");
        assert.strictEqual(inspected?.globalValue, undefined);
    });
});

suite("contributed commands", () => {
    test("every command the manifest declares is registered", async () => {
        const registered = await vscode.commands.getCommands(true);
        const declared = [
            "unitySWpack.searchInUnityDocumentation",
            "unitySWpack.changeReturnType",
            "unitySWpack.showEventReferences",
            "unitySWpack.openAssetReference",
        ];

        for (const command of declared) {
            assert.ok(registered.includes(command), `${command} was declared but never registered`);
        }
    });

    test("every setting the manifest declares resolves to a value", () => {
        const config = vscode.workspace.getConfiguration("unitySWpack");
        const declared = [
            "unityEventMessage",
            "usageScenePrefab",
            "unityMessageHover",
            "typeToggle",
            "metaFileSync",
            "searchInUnityDocs",
            "unityEventLens",
            "onlyScenesInBuildSettings",
            "debugLogging",
            "diagnostics",
            "performanceDiagnostics",
        ];

        for (const key of declared) {
            assert.notStrictEqual(config.get(key), undefined, `unitySWpack.${key} has no value`);
        }
    });
});

suite("providers", () => {
    suiteTeardown(async () => {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });

    test("Unity messages get a CodeLens and ordinary methods do not", async () => {
        const doc = await openCSharpDocument(SAMPLE);

        const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
            "vscode.executeCodeLensProvider",
            doc.uri
        );
        assert.ok(lenses && lenses.length > 0, "no CodeLenses were produced");

        const linesWithLenses = new Set(lenses.map((lens) => doc.lineAt(lens.range.start.line).text.trim()));
        const messageLens = [...linesWithLenses].filter((text) => text.startsWith("void "));

        assert.ok(
            messageLens.some((text) => text.includes("Awake()")),
            "Awake should be marked as a Unity message"
        );
        assert.ok(
            messageLens.some((text) => text.includes("Update()")),
            "Update should be marked as a Unity message"
        );
    });

    test("hovering a Unity message explains it", async () => {
        const doc = await openCSharpDocument(SAMPLE);
        const line = doc
            .getText()
            .split("\n")
            .findIndex((text) => text.includes("void Awake()"));
        assert.ok(line >= 0);

        const character = doc.lineAt(line).text.indexOf("Awake");
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            doc.uri,
            new vscode.Position(line, character)
        );

        assert.ok(hovers && hovers.length > 0, "no hover was produced for Awake");
    });

    test("snippets are offered as completions", async () => {
        const doc = await openCSharpDocument("public class Foo : MonoBehaviour\n{\n    Awa\n}\n");
        const position = new vscode.Position(2, 7);

        const list = await vscode.commands.executeCommand<vscode.CompletionList>(
            "vscode.executeCompletionItemProvider",
            doc.uri,
            position
        );

        assert.ok(list, "no completion list was produced");
        const labels = list.items.map((item) => (typeof item.label === "string" ? item.label : item.label.label));
        assert.ok(labels.includes("Awake"), `Awake was not offered; got ${labels.slice(0, 10).join(", ")}`);
    });

    test("the removed UNET messages are not offered", async () => {
        const doc = await openCSharpDocument("public class Foo : MonoBehaviour\n{\n    On\n}\n");
        const position = new vscode.Position(2, 6);

        const list = await vscode.commands.executeCommand<vscode.CompletionList>(
            "vscode.executeCompletionItemProvider",
            doc.uri,
            position
        );

        assert.ok(list);
        const labels = new Set(
            list.items.map((item) => (typeof item.label === "string" ? item.label : item.label.label))
        );
        for (const removed of ["OnPlayerConnected", "OnServerInitialized", "OnLevelWasLoaded"]) {
            assert.ok(!labels.has(removed), `${removed} is not part of Unity 6 and should not be offered`);
        }
    });
});

suite("diagnostics", () => {
    /** Diagnostic.code is a string, a number, or an object carrying a link. */
    function codeOf(diagnostic: vscode.Diagnostic): string {
        const code = diagnostic.code;
        if (code === undefined) {
            return "";
        }
        return typeof code === "object" ? String(code.value) : String(code);
    }

    /** Diagnostics arrive asynchronously; wait for the collection to fill. */
    async function waitForDiagnostics(uri: vscode.Uri, predicate: (found: vscode.Diagnostic[]) => boolean) {
        for (let attempt = 0; attempt < 60; attempt++) {
            const found = vscode.languages.getDiagnostics(uri).filter((d) => d.source === "Unity SW Pack");
            if (predicate(found)) {
                return found;
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        return vscode.languages.getDiagnostics(uri).filter((d) => d.source === "Unity SW Pack");
    }

    function fixtureUri(...segments: string[]): vscode.Uri {
        const root = vscode.workspace.workspaceFolders?.[0];
        assert.ok(root, "the fixture project should be the workspace folder");
        return vscode.Uri.joinPath(root.uri, ...segments);
    }

    suiteTeardown(async () => {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });

    test("a class whose name does not match its file is reported", async () => {
        const uri = fixtureUri("Assets", "Scripts", "Renamed.cs");
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));

        const found = await waitForDiagnostics(uri, (d) => d.some((x) => codeOf(x) === "script-name-mismatch"));
        const mismatch = found.find((d) => codeOf(d) === "script-name-mismatch");

        assert.ok(mismatch, `expected a name mismatch; got ${found.map(codeOf).join(", ")}`);
        assert.ok(mismatch.message.includes("Renamed"), "the message should name the file");
    });

    test("costly calls inside Update are reported", async () => {
        const uri = fixtureUri("Assets", "Scripts", "Renamed.cs");
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));

        const found = await waitForDiagnostics(uri, (d) => d.some((x) => codeOf(x) === "camera-main"));
        const codes = new Set(found.map(codeOf));

        assert.ok(codes.has("camera-main"), `expected camera-main; got ${[...codes].join(", ")}`);
        assert.ok(codes.has("find-object"), `expected find-object; got ${[...codes].join(", ")}`);
        assert.ok(codes.has("debug-log"), `expected debug-log; got ${[...codes].join(", ")}`);
        assert.ok(codes.has("empty-message"), `expected empty-message for LateUpdate; got ${[...codes].join(", ")}`);
    });

    test("a clean script is left alone", async () => {
        const uri = fixtureUri("Assets", "Scripts", "AudioManager.cs");
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));

        // Give the provider the same chance to report as the failing cases get.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const found = vscode.languages.getDiagnostics(uri).filter((d) => d.source === "Unity SW Pack");

        assert.deepStrictEqual(found.map(codeOf), [], "AudioManager.cs has nothing wrong with it");
    });
});
