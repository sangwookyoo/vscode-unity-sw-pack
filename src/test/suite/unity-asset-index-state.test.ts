import * as assert from "assert";
import * as path from "path";

import {
    assetKindOf,
    assetPathOfMeta,
    hasIgnoredSegment,
    isScriptMeta,
    UnityAssetIndexState,
} from "../../unity-asset-index-state";
import { RawEventConnection } from "../../unity-yaml";

const ROOT = path.join("C:", "Proj");
const ASSETS = path.join(ROOT, "Assets");

function scriptPath(name: string): string {
    return path.join(ASSETS, "Scripts", `${name}.cs`);
}

function scenePath(name: string): string {
    return path.join(ASSETS, "Scenes", `${name}.unity`);
}

function prefabPath(name: string): string {
    return path.join(ASSETS, "Prefabs", `${name}.prefab`);
}

function connection(overrides: Partial<RawEventConnection> = {}): RawEventConnection {
    return {
        calledMethod: "Play",
        event: "m_OnClick",
        callingClassGuid: "guid-button",
        gameObjectId: "100",
        calledClassGuid: "guid-audio",
        ...overrides,
    };
}

function content(
    connections: RawEventConnection[] = [],
    gameObjectNames: Array<[string, string]> = [],
    guids: string[] = []
) {
    return {
        connections,
        gameObjectNames: new Map(gameObjectNames),
        guids: new Set(guids),
    };
}

suite("path helpers", () => {
    test("classifies asset kinds by extension, case-insensitively", () => {
        assert.strictEqual(assetKindOf(scenePath("Main")), "scene");
        assert.strictEqual(assetKindOf(prefabPath("Button")), "prefab");
        assert.strictEqual(assetKindOf(path.join(ASSETS, "Main.UNITY")), "scene");
        assert.strictEqual(assetKindOf(scriptPath("Player")), undefined);
        assert.strictEqual(assetKindOf(`${scriptPath("Player")}.meta`), undefined);
    });

    test("recognises script meta files only", () => {
        assert.ok(isScriptMeta(`${scriptPath("Player")}.meta`));
        assert.ok(!isScriptMeta(`${scenePath("Main")}.meta`));
        assert.ok(!isScriptMeta(scriptPath("Player")));
    });

    test("strips the .meta suffix", () => {
        assert.strictEqual(assetPathOfMeta(`${scriptPath("Player")}.meta`), scriptPath("Player"));
    });

    test("ignores the folders Unity ignores, at any depth", () => {
        assert.ok(hasIgnoredSegment(path.join("Assets", "Vendor~", "Thing.unity")));
        assert.ok(hasIgnoredSegment(path.join("Assets", ".hidden", "Thing.unity")));
        assert.ok(hasIgnoredSegment("Assets/Vendor~/Thing.unity"));
        assert.ok(!hasIgnoredSegment(path.join("Assets", "Scenes", "Main.unity")));
    });
});

suite("UnityAssetIndexState scripts", () => {
    test("maps a script path to its GUID and class name", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Player"), "guid-player");

        assert.strictEqual(state.getGuid(scriptPath("Player")), "guid-player");
        assert.strictEqual(state.getClassName("guid-player"), "Player");
        assert.strictEqual(state.getGuid(scriptPath("Missing")), undefined);
        assert.strictEqual(state.getClassName(undefined), undefined);
    });

    test("removing a script drops its GUID and class name", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Player"), "guid-player");
        state.removeScript(scriptPath("Player"));

        assert.strictEqual(state.getGuid(scriptPath("Player")), undefined);
        assert.strictEqual(state.getClassName("guid-player"), undefined);
    });

    // A rename delivers a delete of the old .meta and a create of the new one
    // carrying the SAME GUID. Whichever order they arrive in, the surviving path
    // must keep the class name — otherwise every lens on that script goes blank.
    test("rename keeps the class name when the create is applied first", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Player"), "guid-shared");

        state.setScript(scriptPath("Enemy"), "guid-shared");
        state.removeScript(scriptPath("Player"));

        assert.strictEqual(state.getClassName("guid-shared"), "Enemy");
        assert.strictEqual(state.getGuid(scriptPath("Enemy")), "guid-shared");
        assert.strictEqual(state.getGuid(scriptPath("Player")), undefined);
    });

    test("rename keeps the class name when the delete is applied first", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Player"), "guid-shared");

        state.removeScript(scriptPath("Player"));
        state.setScript(scriptPath("Enemy"), "guid-shared");

        assert.strictEqual(state.getClassName("guid-shared"), "Enemy");
        assert.strictEqual(state.getGuid(scriptPath("Enemy")), "guid-shared");
    });

    test("a regenerated GUID does not leave the old class name behind", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Player"), "guid-old");
        state.setScript(scriptPath("Player"), "guid-new");

        assert.strictEqual(state.getGuid(scriptPath("Player")), "guid-new");
        assert.strictEqual(state.getClassName("guid-new"), "Player");
        assert.strictEqual(state.getClassName("guid-old"), undefined);
    });

    test("removing an unknown script is a no-op", () => {
        const state = new UnityAssetIndexState();
        state.removeScript(scriptPath("Nothing"));
        assert.strictEqual(state.getGuid(scriptPath("Nothing")), undefined);
    });
});

suite("UnityAssetIndexState assets", () => {
    test("separates scene and prefab references for the same GUID", () => {
        const state = new UnityAssetIndexState();
        state.setAsset(scenePath("Main"), "scene", content([], [], ["guid-player"]));
        state.setAsset(prefabPath("Button"), "prefab", content([], [], ["guid-player"]));

        assert.deepStrictEqual(state.getReferences("guid-player", "scene"), [scenePath("Main")]);
        assert.deepStrictEqual(state.getReferences("guid-player", "prefab"), [prefabPath("Button")]);
        assert.deepStrictEqual(state.getReferences("guid-unknown", "scene"), []);
    });

    // Re-indexing must behave exactly like a fresh scan of that one file.
    test("re-indexing an asset evicts its previous GUIDs, connections and names", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Audio"), "guid-audio");
        state.setScript(scriptPath("Button"), "guid-button");

        state.setAsset(
            scenePath("Main"),
            "scene",
            content([connection()], [["100", "StartButton"]], ["guid-player", "guid-button"])
        );
        assert.strictEqual(state.getConnectionsForClass("Button").length, 1);
        assert.deepStrictEqual(state.getReferences("guid-player", "scene"), [scenePath("Main")]);

        // The user deleted the button from the scene.
        state.setAsset(scenePath("Main"), "scene", content([], [], ["guid-player"]));

        assert.deepStrictEqual(state.getConnectionsForClass("Button"), []);
        assert.deepStrictEqual(state.getReferences("guid-button", "scene"), []);
        assert.deepStrictEqual(state.getReferences("guid-player", "scene"), [scenePath("Main")]);
        assert.strictEqual(state.assetCount, 1);
    });

    test("removing an asset drops it from the reverse index and the connections", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Button"), "guid-button");
        state.setAsset(scenePath("Main"), "scene", content([connection()], [], ["guid-button"]));

        state.removeAsset(scenePath("Main"));

        assert.strictEqual(state.assetCount, 0);
        assert.deepStrictEqual(state.getReferences("guid-button", "scene"), []);
        assert.deepStrictEqual(state.getConnectionsForClass("Button"), []);
    });

    test("removing an unknown asset is a no-op", () => {
        const state = new UnityAssetIndexState();
        state.setAsset(scenePath("Main"), "scene", content([], [], ["guid-a"]));
        state.removeAsset(scenePath("Other"));
        assert.strictEqual(state.assetCount, 1);
    });

    test("references are reported with the original path casing", () => {
        const state = new UnityAssetIndexState();
        state.setAsset(scenePath("Main"), "scene", content([], [], ["guid-a"]));
        assert.deepStrictEqual(state.getReferences("guid-a", "scene"), [scenePath("Main")]);
    });
});

suite("UnityAssetIndexState connections", () => {
    test("resolves GUIDs to class names and the GameObject id to its name", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("ButtonHandler"), "guid-button");
        state.setScript(scriptPath("AudioManager"), "guid-audio");
        state.setAsset(scenePath("Main"), "scene", content([connection()], [["100", "StartButton"]], ["guid-button"]));

        const [resolved] = state.getConnectionsForClass("ButtonHandler");
        assert.strictEqual(resolved.callingClass, "ButtonHandler");
        assert.strictEqual(resolved.calledClass, "AudioManager");
        assert.strictEqual(resolved.calledMethod, "Play");
        assert.strictEqual(resolved.gameObject, "StartButton");
        assert.strictEqual(resolved.assetName, "Main");
        assert.strictEqual(resolved.kind, "scene");
    });

    test("an unknown GameObject id falls back to a placeholder", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("ButtonHandler"), "guid-button");
        state.setAsset(scenePath("Main"), "scene", content([connection()], [], []));

        assert.strictEqual(state.getConnectionsForClass("ButtonHandler")[0].gameObject, "Unknown Game Object");
    });

    test("an assembly-qualified target name is matched by its simple name", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("ButtonHandler"), "guid-button");
        state.setAsset(
            scenePath("Main"),
            "scene",
            content([connection({ calledClassGuid: undefined, calledClassName: "Game.Audio.AudioManager" })], [], [])
        );

        assert.strictEqual(state.getConnectionsForClass("AudioManager").length, 1);
    });

    test("a connection whose caller and target are the same class is listed once", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Self"), "guid-self");
        state.setAsset(
            scenePath("Main"),
            "scene",
            content([connection({ callingClassGuid: "guid-self", calledClassGuid: "guid-self" })], [], [])
        );

        assert.strictEqual(state.getConnectionsForClass("Self").length, 1);
    });

    test("connections from prefabs are reported too", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("ButtonHandler"), "guid-button");
        state.setAsset(prefabPath("Button"), "prefab", content([connection()], [], []));

        const [resolved] = state.getConnectionsForClass("ButtonHandler");
        assert.strictEqual(resolved.kind, "prefab");
        assert.strictEqual(resolved.assetName, "Button");
    });

    // The class name resolves through the GUID map, so indexing order must not matter.
    test("a script indexed after the scene still resolves its connections", () => {
        const state = new UnityAssetIndexState();
        state.setAsset(scenePath("Main"), "scene", content([connection()], [], []));
        assert.deepStrictEqual(state.getConnectionsForClass("ButtonHandler"), []);

        state.setScript(scriptPath("ButtonHandler"), "guid-button");

        assert.strictEqual(state.getConnectionsForClass("ButtonHandler").length, 1);
    });
});

suite("UnityAssetIndexState build settings", () => {
    test("prefabs and unfiltered scenes are always indexed", () => {
        const state = new UnityAssetIndexState();
        assert.ok(state.shouldIndexConnections(prefabPath("Button"), "prefab", ROOT, true));
        assert.ok(state.shouldIndexConnections(scenePath("Main"), "scene", ROOT, false));
    });

    test("with no build settings read yet, every scene is indexed", () => {
        const state = new UnityAssetIndexState();
        assert.ok(state.shouldIndexConnections(scenePath("Main"), "scene", ROOT, true));

        state.setBuildSettingsScenes(ROOT, []);
        assert.ok(state.shouldIndexConnections(scenePath("Main"), "scene", ROOT, true));
    });

    test("only the listed scenes are indexed once build settings are known", () => {
        const state = new UnityAssetIndexState();
        state.setBuildSettingsScenes(ROOT, ["Assets/Scenes/Main.unity"]);

        assert.ok(state.shouldIndexConnections(scenePath("Main"), "scene", ROOT, true));
        assert.ok(!state.shouldIndexConnections(scenePath("Menu"), "scene", ROOT, true));
        // A prefab is never filtered, even when it is not listed.
        assert.ok(state.shouldIndexConnections(prefabPath("Button"), "prefab", ROOT, true));
    });

    test("a scene outside any known project root is indexed", () => {
        const state = new UnityAssetIndexState();
        state.setBuildSettingsScenes(ROOT, ["Assets/Scenes/Main.unity"]);
        assert.ok(state.shouldIndexConnections(scenePath("Menu"), "scene", undefined, true));
    });
});

suite("UnityAssetIndexState lifecycle", () => {
    test("clear() drops scripts as well as assets", () => {
        const state = new UnityAssetIndexState();
        state.setScript(scriptPath("Player"), "guid-player");
        state.setAsset(scenePath("Main"), "scene", content([connection()], [], ["guid-player"]));
        state.setBuildSettingsScenes(ROOT, ["Assets/Scenes/Main.unity"]);

        state.clear();

        assert.strictEqual(state.assetCount, 0);
        assert.strictEqual(state.getGuid(scriptPath("Player")), undefined);
        assert.strictEqual(state.getClassName("guid-player"), undefined);
        assert.deepStrictEqual(state.getReferences("guid-player", "scene"), []);
        assert.ok(state.shouldIndexConnections(scenePath("Menu"), "scene", ROOT, true));
    });
});
