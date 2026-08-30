import * as assert from "assert";

import { GuidReferenceIndex } from "../../guid-reference-index";
import { collectGuidReferences } from "../../unity-yaml";

const playerGuid = "1a11111111111111111111111111111a";
const enemyGuid = "2b22222222222222222222222222222b";

suite("GuidReferenceIndex Test Suite", () => {
    test("records which assets reference a GUID", () => {
        const index = new GuidReferenceIndex();
        index.set("scene.unity", [playerGuid, enemyGuid]);
        index.set("button.prefab", [playerGuid]);

        assert.deepStrictEqual(index.getAssets(playerGuid).sort(), ["button.prefab", "scene.unity"]);
        assert.deepStrictEqual(index.getAssets(enemyGuid), ["scene.unity"]);
        assert.deepStrictEqual(index.getAssets("unknown"), []);
    });

    test("re-indexing an asset replaces its previous references", () => {
        const index = new GuidReferenceIndex();
        index.set("scene.unity", [playerGuid, enemyGuid]);
        index.set("scene.unity", [enemyGuid]);

        assert.deepStrictEqual(index.getAssets(playerGuid), []);
        assert.deepStrictEqual(index.getAssets(enemyGuid), ["scene.unity"]);
    });

    test("removing an asset drops its references", () => {
        const index = new GuidReferenceIndex();
        index.set("scene.unity", [playerGuid]);
        index.set("button.prefab", [playerGuid]);
        index.remove("scene.unity");

        assert.deepStrictEqual(index.getAssets(playerGuid), ["button.prefab"]);

        index.remove("button.prefab");
        assert.deepStrictEqual(index.getAssets(playerGuid), []);

        // Removing an unknown asset is a no-op.
        index.remove("nothing.unity");
    });

    test("clear empties the index", () => {
        const index = new GuidReferenceIndex();
        index.set("scene.unity", [playerGuid]);
        index.clear();

        assert.deepStrictEqual(index.getAssets(playerGuid), []);
    });

    test("builds from the GUIDs collected out of an asset file", () => {
        const sceneText = [
            "--- !u!114 &1",
            "MonoBehaviour:",
            `  m_Script: {fileID: 11500000, guid: ${playerGuid}, type: 3}`,
            "--- !u!114 &2",
            "MonoBehaviour:",
            `  m_Script: {fileID: 11500000, guid: ${enemyGuid}, type: 3}`,
            "",
        ].join("\n");

        const index = new GuidReferenceIndex();
        index.set("scene.unity", collectGuidReferences(sceneText));

        assert.deepStrictEqual(index.getAssets(playerGuid), ["scene.unity"]);
        assert.deepStrictEqual(index.getAssets(enemyGuid), ["scene.unity"]);
    });
});
