<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack" title="Visual Studio Code Marketplace" target="_blank">
    <img src="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/images/icon.png?raw=true" width="150px" />
  </a>
  <br/>
</p>

## Overview
This extension provides a Unity development environment for VS Code.  
> All features can be enabled or disabled in the settings.

### Features
- **Unity code snippets** (C#)
- **Scene / Prefab usage references**  
  Shows where a script is used inside Scene or Prefab assets.
- **Unity event bindings indicator**  
  Displays CodeLens above UnityEvent fields.
- **Unity message indicator**  
  Adds CodeLens above Unity lifecycle methods (e.g., `Start`, `Update`).
- **Unity message hover descriptions**  
  Shows documentation/explanation of Unity lifecycle methods when hovering.
- **Coroutine toggle (void ↔ IEnumerator)**  
  Quickly change method return type between `void` and `IEnumerator`.
- **.meta file sync**  
  Detects creation/deletion of assets and keeps `.meta` files in sync.
- **Unity documentation search**  
  Search Unity API docs directly (shortcut: `Shift+1`).  
  → Works with selection or the word under the cursor.
- **Theme**  
  Includes `Unity SW Pack Dark` theme.

---

## Prerequisites
1. Install the [VS Code C# Extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp).
2. Install the [.NET SDK](https://dotnet.microsoft.com/download), which includes the Runtime and the `dotnet` command.
   - **Windows only**: Logout or restart Windows to allow changes to `%PATH%` to take effect.
   - **macOS only**: To avoid seeing "Some projects have trouble loading. Please review the output for more details", install the latest stable [Mono](https://www.mono-project.com/download/) release.

---

## Features in Action

- **Unity code snippets**

  ![CodeSnippets](gifs/01.gif)

- **Scene and Prefab references**

  ![UsageScenePrefab](gifs/02.gif)

- **Unity event bindings**

  ![UnityEventBinding](gifs/03.gif)

- **Unity message indicator**

  ![UnityEventMessage](gifs/04.gif)

- **Unity message hover descriptions**

  ![Hover](gifs/05.gif)

- **Coroutine toggle (void ↔ IEnumerator)**

  ![TypeToggle](gifs/06.gif)

- **.meta file sync**

  ![metaFile](gifs/07.gif)