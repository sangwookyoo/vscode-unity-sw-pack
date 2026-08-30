import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
    collectGuidReferences,
    parseBuildSettingsScenePaths,
    parseMetaGuid,
    parseUnityAsset,
    splitUnityDocuments,
} from "../../unity-yaml";

const fixturesDir = path.resolve(__dirname, "..", "..", "..", "src", "test", "fixtures");

function fixture(name: string): string {
    return fs.readFileSync(path.join(fixturesDir, name), "utf-8");
}

const buttonGuid = "1a11111111111111111111111111111a";
const managerGuid = "2b22222222222222222222222222222b";
const prefabScriptGuid = "3c33333333333333333333333333333c";

suite("UnityYaml Test Suite", () => {
    test("splitUnityDocuments splits on the !u! header", () => {
        const documents = splitUnityDocuments(fixture("SampleScene.unity"));

        assert.strictEqual(documents.length, 5);
        assert.deepStrictEqual(
            documents.map((doc) => doc.classId),
            ["29", "1", "114", "1", "114"]
        );
        assert.strictEqual(documents[1].fileId, "519420031");
        assert.ok(documents[1].body.includes("m_Name: StartButton"));
    });

    test("splitUnityDocuments accepts the 'stripped' header suffix", () => {
        const documents = splitUnityDocuments(fixture("SampleButton.prefab"));

        assert.deepStrictEqual(
            documents.map((doc) => doc.fileId),
            ["1234567890123456789", "1234567890123456790"]
        );
    });

    test("parseUnityAsset extracts scene UnityEvent connections", () => {
        const data = parseUnityAsset(fixture("SampleScene.unity"));

        assert.strictEqual(data.connections.length, 2);

        const [first, second] = data.connections;
        assert.strictEqual(first.event, "m_OnClick");
        assert.strictEqual(first.calledMethod, "StartGame");
        assert.strictEqual(first.callingClassGuid, buttonGuid);
        // The target was stored as a fileID and resolved to the script GUID.
        assert.strictEqual(first.calledClassGuid, managerGuid);
        assert.strictEqual(first.calledClassName, undefined);
        assert.strictEqual(first.gameObjectId, "519420031");

        assert.strictEqual(second.calledMethod, "PlayClick");
        assert.strictEqual(second.calledClassName, "Game.AudioManager");
        assert.strictEqual(second.calledClassGuid, undefined);
    });

    test("parseUnityAsset maps GameObject names", () => {
        const data = parseUnityAsset(fixture("SampleScene.unity"));

        assert.strictEqual(data.gameObjectNames.get("519420031"), "StartButton");
        assert.strictEqual(data.gameObjectNames.get("771030991"), "GameManager");
    });

    test("parseUnityAsset also reads prefabs", () => {
        const data = parseUnityAsset(fixture("SampleButton.prefab"));

        assert.strictEqual(data.connections.length, 1);
        assert.strictEqual(data.connections[0].event, "onQuit");
        assert.strictEqual(data.connections[0].calledMethod, "Quit");
        assert.strictEqual(data.connections[0].calledClassName, "Game.ApplicationController");
        assert.strictEqual(data.connections[0].callingClassGuid, prefabScriptGuid);
        assert.strictEqual(data.gameObjectNames.get("1234567890123456789"), "QuitButton");
    });

    test("parseUnityAsset reports referenced GUIDs", () => {
        const data = parseUnityAsset(fixture("SampleScene.unity"));

        assert.deepStrictEqual([...data.referencedGuids].sort(), [buttonGuid, managerGuid].sort());
    });

    test("parseUnityAsset survives a malformed document", () => {
        const warnings: string[] = [];
        const text = [
            "--- !u!114 &1",
            "MonoBehaviour:",
            "  m_GameObject: {fileID: 2}",
            "\tm_Script: {fileID: 11500000, guid: aaaa, type: 3}",
            "--- !u!1 &2",
            "GameObject:",
            "  m_Name: Fine",
            "",
        ].join("\n");

        const data = parseUnityAsset(text, (message) => warnings.push(message));

        assert.strictEqual(data.connections.length, 0);
        assert.strictEqual(data.gameObjectNames.get("2"), "Fine");
        assert.strictEqual(warnings.length, 1);
    });

    test("collectGuidReferences finds every GUID reference", () => {
        const guids = collectGuidReferences("m_Script: {fileID: 11500000, guid: " + buttonGuid + ", type: 3}");

        assert.deepStrictEqual([...guids], [buttonGuid]);
    });

    test("collectGuidReferences ignores values that are not GUIDs", () => {
        assert.strictEqual(collectGuidReferences("guid: not-a-guid").size, 0);
        assert.strictEqual(collectGuidReferences("").size, 0);
    });

    test("parseMetaGuid reads the GUID of a .meta file", () => {
        assert.strictEqual(parseMetaGuid(fixture("Player.cs.meta")), "4d44444444444444444444444444444d");
        assert.strictEqual(parseMetaGuid("fileFormatVersion: 2\n"), undefined);
    });

    test("parseBuildSettingsScenePaths reads the Unity tagged document", () => {
        const scenePaths = parseBuildSettingsScenePaths(fixture("EditorBuildSettings.asset"));

        assert.deepStrictEqual(scenePaths, ["Assets/Scenes/SampleScene.unity", "Assets/Scenes/Menu.unity"]);
    });

    test("parseBuildSettingsScenePaths returns an empty list on garbage", () => {
        assert.deepStrictEqual(parseBuildSettingsScenePaths("\tnot: [valid"), []);
    });
});
