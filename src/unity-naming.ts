// Naming helpers shared by the UnityEvent lens. Free of "vscode" imports so the
// rules stay unit testable.

/**
 * Turns a serialized Unity member name into something readable.
 * "m_OnClick" / "onClick" / "on_click" all become "On Click".
 * Acronyms are preserved: "OnUIClick" becomes "On UI Click".
 */
export function toFriendlyName(name: string): string {
    if (!name) {
        return "";
    }

    // Drop Unity's serialized field prefixes ("m_OnClick", "_onClick").
    let value = name.startsWith("m_") ? name.substring(2) : name;
    value = value.replace(/^_+/, "");

    // snake_case / kebab-case separators become spaces.
    value = value.replace(/[_-]+/g, " ");

    // camelCase and PascalCase boundaries become spaces.
    value = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    value = value.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

    value = value.replace(/\s+/g, " ").trim();
    if (!value) {
        return "";
    }

    return value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
        .join(" ");
}

/**
 * Returns the asset name of a file path without any extension.
 * "Assets/Scripts/Player.cs.meta" -> "Player", "Assets/Main Scene.unity" -> "Main Scene".
 */
export function assetBaseName(filePath: string): string {
    const fileName = filePath.split(/[\\/]/).pop() ?? "";
    const dot = fileName.indexOf(".");
    return dot === -1 ? fileName : fileName.substring(0, dot);
}

/**
 * Returns the last segment of a possibly qualified type name.
 * "Game.Player+Inner" -> "Inner".
 */
export function simpleClassName(className: string): string {
    return className.split(/[.+]/).pop() ?? className;
}
