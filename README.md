<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack" title="Visual Studio Code Marketplace" target="_blank">
    <img src="https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/images/icon.png" width="150px" />
  </a>
</p>

<p align="center">
  <b>English</b> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.ko.md">한국어</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.zh-cn.md">简体中文</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.ja.md">日本語</a>
</p>

## Overview

Unity SW Pack makes Visual Studio Code a comfortable place to write Unity C#. It tells you which
methods Unity calls for you, where a script is actually used, and how your UnityEvents are wired —
without leaving the editor.

Built for **Unity 6**. Every feature can be turned off individually in the settings.

## Features

- **Snippets for Unity messages** — 65 templates covering the `MonoBehaviour` lifecycle,
  `ScriptableObject` and editor scripts.
- **Unity message markers** — a marker above `Awake`, `Start`, `Update` and the rest, so they are
  never mistaken for dead code.
- **Hover documentation** — hover a Unity message to read what it does and when it runs.
- **Scene and prefab usage** — see how many scenes and prefabs use the script you are looking at,
  and which ones.
- **UnityEvent wiring** — see where a method or `UnityEvent` field is connected in the Inspector,
  in both scenes and prefabs.
- **Coroutine toggle** — switch a method between `void` and `IEnumerator` in one click, and the
  `using System.Collections;` is added for you.
- **.meta file sync** — rename or delete an asset in the explorer and its `.meta` follows.
- **Documentation search** — search the selected word in the Unity documentation for the version
  your project actually uses. `Ctrl+Alt+U` (`Cmd+Alt+U` on macOS).
- **Unity SW Pack Dark** — a theme tuned for Unity C#.

Available in English, Korean, Simplified Chinese and Japanese. The extension follows the display
language of VS Code.

## Requirements

1. The [C# extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp).
2. The [.NET SDK](https://dotnet.microsoft.com/download).
    - **Windows**: sign out and back in after installing, so the `PATH` change takes effect.

Open the folder that contains `Assets/`, `Library/` and `ProjectSettings/` — that is, the Unity
project root. Scene and prefab features need it to find your assets.

## Features in action

**Snippets**

![Snippets](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/01.gif)

**Scene and prefab usage**

![Scene and prefab usage](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/02.gif)

**UnityEvent wiring**

![UnityEvent wiring](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/03.gif)

**Unity message markers**

![Unity message markers](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/04.gif)

**Hover documentation**

![Hover documentation](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/05.gif)

**Coroutine toggle**

![Coroutine toggle](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/06.gif)

**.meta file sync**

![.meta file sync](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/07.gif)

## Settings

| Setting                                 | Default | What it does                                                  |
| --------------------------------------- | ------- | ------------------------------------------------------------- |
| `unitySWpack.unityEventMessage`         | `true`  | Mark the methods Unity calls for you                          |
| `unitySWpack.usageScenePrefab`          | `true`  | Show how many scenes and prefabs use the script               |
| `unitySWpack.unityMessageHover`         | `true`  | Explain a Unity message on hover                              |
| `unitySWpack.typeToggle`                | `true`  | Offer the `void` ↔ `IEnumerator` switch                       |
| `unitySWpack.metaFileSync`              | `true`  | Keep `.meta` files in step with renames and deletes           |
| `unitySWpack.searchInUnityDocs`         | `true`  | Add the documentation search command                          |
| `unitySWpack.unityEventLens`            | `true`  | Show where UnityEvents are wired up                           |
| `unitySWpack.onlyScenesInBuildSettings` | `false` | Read UnityEvent wiring only from scenes in the build settings |
| `unitySWpack.debugLogging`              | `false` | Log indexing details to the Unity SW Pack output channel      |

## Notes

`.meta` sync reacts to renames and deletes made **in the editor**. Changes made from a terminal or
from Unity itself are left to Unity, which maintains its own `.meta` files.

If a feature seems quiet on a large project, turn on `unitySWpack.debugLogging` and check the
"Unity SW Pack" output channel — the first index of a big `Assets/` folder takes a moment.

## License

[MIT](LICENSE)
