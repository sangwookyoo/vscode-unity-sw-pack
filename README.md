<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack" title="Visual Studio Code Marketplace" target="_blank">
    <img src="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/images/icon.png?raw=true" width="150px" />
  </a>
  <br/>
  </p>
<p align="center">
<img src="https://img.shields.io/badge/Unity%20SW%20Pack%20v1.0.0%20-%23000000.svg?&style=flat&logo=unity&logoColor=white" style="height : auto; margin-left : 2px; margin-right : 2px;"/>
<a href="https://paypal.me/sangwookyoo"><img src="https://img.shields.io/badge/Donate-PayPal-green.svg" style="height : auto; margin-left : 2px; margin-right : 2px;"/></a>
</p>

## Overview
- This extension provides a Unity development environment for VS Code.
> All features can be turned on or off in the settings!
- Provides code snippets for Unity
- Shows Scene and Prefab referenced by Script
- Indicates Unity event bindings
- Indicates Unity event function
- Displays explanations of Unity messages on Hover
- Provide function signature change between void-IEnumerator
- Checks for changes in .meta files and syncs them if there are any
- Provides documentation navigation for Unity messages. (Shortcut: Shift+1)
- Provides theme 'Unity SW Pack Dark'

**Prerequisites**
1. Install the [VS Code C# Extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp).
2. Install the [.NET SDK](https://dotnet.microsoft.com/download), which includes the Runtime and the dotnet command.
- [Windows only] Logout or restart Windows to allow changes to %PATH% to take effect.
- [macOS only] To avoid seeing "Some projects have trouble loading. Please review the output for more details", make sure to install the latest stable [Mono](https://www.mono-project.com/download/) release.

> Install Build Tools for Visual Studio (Windows only)
> - The C# extension no longer ships with Microsoft Build Tools so they must be installed manually.
> - Download the [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022).
> - Install the <b>.NET desktop build tools</b> workload. No other components are required.

**Features**
- Provides code snippets for Unity.

	![CodeSnippets](gifs/01.gif)

- Shows Scene and Prefab referenced by Script.

	![UsageScenePrefab](gifs/02.gif)

- Indicates Unity event bindings.

	![UnityEventBinding](gifs/03.gif)

- Indicates Unity event function.

	![UnityEventMessage](gifs/04.gif)

- Displays explanations of Unity messages on Hover.

	![Hover](gifs/05.gif)

- Provide function signature change between void-IEnumerator.

	![TypeToggle](gifs/06.gif)

- Checks for changes in .meta files and syncs them if there are any.

	![metaFile](gifs/07.gif)
