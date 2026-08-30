import * as assert from "assert";

import { findPublicMethods, findUnityEventFields, maskCommentsAndStrings } from "../../CSharpSyntax";

function names(members: { name: string }[]): string[] {
    return members.map((member) => member.name);
}

const menuButton = [
    "using UnityEngine;",
    "using UnityEngine.Events;",
    "",
    "namespace Game.UI",
    "{",
    "    internal sealed class MenuButton : MonoBehaviour",
    "    {",
    "        [SerializeField] private UnityEvent m_OnClick;",
    "        public UnityEvent<int> onValueChanged = new UnityEvent<int>();",
    "",
    "        // public void NotAMethod() { }",
    "        /* public UnityEvent notAField; */",
    "",
    "        public void StartGame() { }",
    "        public async Task<Result<int>> LoadAsync(string path) { return null; }",
    "        public static void Log(string message) { }",
    "        public override string ToString() { return \"public void Fake() {\"; }",
    "        private void Hidden() { }",
    "        public MenuButton() { }",
    "",
    "        public class Nested",
    "        {",
    "            public void Inner() { }",
    "        }",
    "    }",
    "}",
    "",
].join("\n");

suite("CSharpSyntax member finder Test Suite", () => {
    test("finds UnityEvent fields regardless of accessibility", () => {
        const fields = findUnityEventFields(menuButton);

        assert.deepStrictEqual(names(fields), ["m_OnClick", "onValueChanged"]);
        assert.strictEqual(fields[0].className, "Game.UI.MenuButton");
        assert.strictEqual(fields[0].simpleClassName, "MenuButton");
        assert.strictEqual(menuButton.substr(fields[0].index, fields[0].name.length), "m_OnClick");
    });

    test("finds public methods including generic and async ones", () => {
        const methods = findPublicMethods(menuButton);

        assert.deepStrictEqual(names(methods), ["StartGame", "LoadAsync", "Log", "ToString", "Inner"]);
        assert.strictEqual(methods[0].className, "Game.UI.MenuButton");
        assert.strictEqual(menuButton.substr(methods[1].index, methods[1].name.length), "LoadAsync");
    });

    test("attributes nested members to the nested type", () => {
        const methods = findPublicMethods(menuButton);
        const inner = methods.find((method) => method.name === "Inner");

        assert.ok(inner);
        assert.strictEqual(inner?.simpleClassName, "Nested");
        assert.strictEqual(inner?.className, "Game.UI.MenuButton.Nested");
    });

    test("ignores private members, constructors, comments and string literals", () => {
        const methods = names(findPublicMethods(menuButton));

        assert.ok(!methods.includes("Hidden"));
        assert.ok(!methods.includes("MenuButton"));
        assert.ok(!methods.includes("NotAMethod"));
        assert.ok(!methods.includes("Fake"));
        assert.ok(!names(findUnityEventFields(menuButton)).includes("notAField"));
    });

    test("tracks brace nesting instead of taking the closest class declaration", () => {
        const source = [
            "public class First",
            "{",
            "    public class Inner { public void InnerMethod() { } }",
            "    public void AfterInner() { }",
            "}",
            "",
            "public partial class Second",
            "{",
            "    public void SecondMethod() { }",
            "}",
            "",
        ].join("\n");

        const methods = findPublicMethods(source);
        const byName = new Map(methods.map((method) => [method.name, method.className]));

        assert.strictEqual(byName.get("InnerMethod"), "First.Inner");
        assert.strictEqual(byName.get("AfterInner"), "First");
        assert.strictEqual(byName.get("SecondMethod"), "Second");
    });

    test("supports structs and file-scoped namespaces", () => {
        const source = [
            "namespace Game.Data;",
            "",
            "public struct Damage",
            "{",
            "    public UnityEvent onApplied;",
            "    public void Apply(int amount) { }",
            "}",
            "",
        ].join("\n");

        assert.strictEqual(findUnityEventFields(source)[0].className, "Game.Data.Damage");
        assert.strictEqual(findPublicMethods(source)[0].className, "Game.Data.Damage");
    });

    test("returns nothing when there is no type declaration", () => {
        assert.deepStrictEqual(findPublicMethods("public void Orphan() { }"), []);
        assert.deepStrictEqual(findUnityEventFields("UnityEvent orphan;"), []);
        assert.deepStrictEqual(findPublicMethods(""), []);
    });

    test("maskCommentsAndStrings blanks out comments and literals but keeps offsets", () => {
        const source = 'var a = "text {"; // note {\nint b = 0;';
        const masked = maskCommentsAndStrings(source);

        assert.strictEqual(masked.length, source.length);
        assert.ok(!masked.includes("text"));
        assert.ok(!masked.includes("note"));
        assert.ok(!masked.includes("{"));
        assert.ok(masked.includes("int b = 0;"));
    });
});
