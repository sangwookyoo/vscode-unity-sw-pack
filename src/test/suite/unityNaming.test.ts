import * as assert from "assert";

import { assetBaseName, simpleClassName, toFriendlyName } from "../../unity-naming";

suite("UnityNaming Test Suite", () => {
    test("toFriendlyName turns serialized field names into readable text", () => {
        assert.strictEqual(toFriendlyName("m_OnClick"), "On Click");
        assert.strictEqual(toFriendlyName("onClick"), "On Click");
        assert.strictEqual(toFriendlyName("OnClick"), "On Click");
        assert.strictEqual(toFriendlyName("on_click"), "On Click");
        assert.strictEqual(toFriendlyName("_onValueChanged"), "On Value Changed");
    });

    test("toFriendlyName keeps acronyms together", () => {
        assert.strictEqual(toFriendlyName("OnUIClick"), "On UI Click");
        assert.strictEqual(toFriendlyName("m_UIRoot"), "UI Root");
    });

    test("toFriendlyName handles class names and digits", () => {
        assert.strictEqual(toFriendlyName("PlayerController"), "Player Controller");
        assert.strictEqual(toFriendlyName("onClick2"), "On Click2");
    });

    test("toFriendlyName is safe on empty input", () => {
        assert.strictEqual(toFriendlyName(""), "");
        assert.strictEqual(toFriendlyName("m_"), "");
        assert.strictEqual(toFriendlyName("_"), "");
    });

    test("assetBaseName strips folders and every extension", () => {
        assert.strictEqual(assetBaseName("Assets/Scripts/Player.cs.meta"), "Player");
        assert.strictEqual(assetBaseName("C:\\Proj\\Assets\\Scenes\\Main Scene.unity"), "Main Scene");
        assert.strictEqual(assetBaseName("Button.prefab"), "Button");
        assert.strictEqual(assetBaseName(""), "");
    });

    test("simpleClassName returns the last segment", () => {
        assert.strictEqual(simpleClassName("Game.Audio.AudioManager"), "AudioManager");
        assert.strictEqual(simpleClassName("Game.Player+Inner"), "Inner");
        assert.strictEqual(simpleClassName("Player"), "Player");
    });
});
