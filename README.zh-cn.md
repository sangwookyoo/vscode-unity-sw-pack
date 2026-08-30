<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack" title="Visual Studio Code Marketplace" target="_blank">
    <img src="https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/images/icon.png" width="150px" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.md">English</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.ko.md">한국어</a> ·
  <b>简体中文</b> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.ja.md">日本語</a>
</p>

## 简介

Unity SW Pack 让你在 Visual Studio Code 中更顺手地编写 Unity C#。它会告诉你哪些方法由 Unity 自动调用、
当前脚本实际被哪里使用，以及 UnityEvent 连接在何处——都不需要离开编辑器。

面向 **Unity 6** 构建。每项功能都可以在设置中单独关闭。

## 功能

- **Unity 消息代码片段** —— 涵盖 `MonoBehaviour` 生命周期、`ScriptableObject` 和编辑器脚本的
  65 个模板。
- **Unity 消息标记** —— 在 `Awake`、`Start`、`Update` 等方法上方加标记，避免被误认为无用代码。
- **悬停说明** —— 将鼠标悬停在 Unity 消息上，即可了解它的作用和调用时机。
- **场景与预制件用量** —— 显示有多少个场景和预制件使用当前脚本，以及具体是哪些。
- **UnityEvent 连接** —— 在场景和预制件中查找方法或 `UnityEvent` 字段在 Inspector 中的连接位置。
- **协程切换** —— 一键在 `void` 与 `IEnumerator` 之间切换，并自动补上
  `using System.Collections;`。
- **.meta 文件同步** —— 在资源管理器中重命名或删除资源时，`.meta` 会一起处理。
- **文档搜索** —— 在与项目实际版本匹配的 Unity 文档中搜索选中的词。
  `Ctrl+Alt+U`（macOS 为 `Cmd+Alt+U`）。
- **Unity SW Pack Dark** —— 为 Unity C# 调校的主题。

支持英语、韩语、简体中文和日语，跟随 VS Code 的显示语言。

## 环境要求

1. [C# 扩展](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp)
2. [.NET SDK](https://dotnet.microsoft.com/download)
    - **Windows**：安装后请注销并重新登录，使 `PATH` 变更生效。

请打开包含 `Assets/`、`Library/` 和 `ProjectSettings/` 的文件夹，也就是 Unity 项目根目录。
场景和预制件相关功能需要它来定位资源。

## 功能演示

**代码片段**

![代码片段](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/01.gif)

**场景与预制件用量**

![场景与预制件用量](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/02.gif)

**UnityEvent 连接**

![UnityEvent 连接](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/03.gif)

**Unity 消息标记**

![Unity 消息标记](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/04.gif)

**悬停说明**

![悬停说明](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/05.gif)

**协程切换**

![协程切换](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/06.gif)

**.meta 文件同步**

![.meta 文件同步](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/07.gif)

## 设置

| 设置项                                  | 默认值  | 作用                                         |
| --------------------------------------- | ------- | -------------------------------------------- |
| `unitySWpack.unityEventMessage`         | `true`  | 标记由 Unity 自动调用的方法                  |
| `unitySWpack.usageScenePrefab`          | `true`  | 显示使用该脚本的场景和预制件数量             |
| `unitySWpack.unityMessageHover`         | `true`  | 悬停时说明 Unity 消息                        |
| `unitySWpack.typeToggle`                | `true`  | 提供 `void` ↔ `IEnumerator` 切换             |
| `unitySWpack.metaFileSync`              | `true`  | 随重命名和删除维护 `.meta` 文件              |
| `unitySWpack.searchInUnityDocs`         | `true`  | 添加文档搜索命令                             |
| `unitySWpack.unityEventLens`            | `true`  | 显示 UnityEvent 的连接位置                   |
| `unitySWpack.onlyScenesInBuildSettings` | `false` | 仅从生成设置中列出的场景读取 UnityEvent 连接 |
| `unitySWpack.debugLogging`              | `false` | 将索引过程记录到输出通道                     |
| `unitySWpack.diagnostics`               | `true`  | 报告文件名不一致、缺失脚本和重复 GUID        |
| `unitySWpack.performanceDiagnostics`    | `true`  | 同时指出每帧回调中开销较大的调用             |

## 说明

`.meta` 同步只响应**在编辑器中**进行的重命名和删除。从终端或 Unity 内部所做的更改交由 Unity 处理，
它会自行维护 `.meta` 文件。

如果在大型项目中某项功能长时间没有反应，请开启 `unitySWpack.debugLogging` 并查看
“Unity SW Pack” 输出通道——`Assets/` 较大时首次索引需要一点时间。

## 许可证

[MIT](LICENSE)
