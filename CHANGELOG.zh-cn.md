# 更新日志

<p>
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.md">English</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.ko.md">한국어</a> ·
  <b>简体中文</b> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.ja.md">日本語</a>
</p>

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，最新版本列在最前面。

## [2.2 Released]

### 新增

- 报告编辑器看不到的 Unity 问题，默认开启：
    - 文件名与类名不一致的 MonoBehaviour，Unity 根本无法附加，且不会给出任何提示；
    - 引用了项目中已不存在脚本的场景或预制件；
    - 共用同一 GUID 的脚本，通常源于复制的 .meta 文件。
- 指出每帧运行的回调中开销较大的调用：Camera.main、GameObject.Find 系列、
  GetComponent、SendMessage、Debug.Log、用字符串而非 CompareTag 比较 tag，
  以及在循环内分配的 yield 指令。空的 Unity 回调也会报告，因为 Unity 仍会调用它们。
  这是基于语法的检查，覆盖能够识别的 Unity API 名称，并非类型感知分析器所能发现的全部。
  若已使用 Microsoft.Unity.Analyzers，可通过 `unitySWpack.performanceDiagnostics` 关闭。
- 场景与预制件引用提示现在可点击，会直接打开资源；有多个时提供选择列表。
- 新增设置 `unitySWpack.diagnostics` 和 `unitySWpack.performanceDiagnostics`。

## [2.1 Released]

### 变更

- 面向 Unity 6。文档搜索改为打开与 `ProjectSettings/ProjectVersion.txt` 中版本匹配的文档，
  而不是始终使用最新版。
- 用自有实现替换了此前引入的 Unity Event Lens 子系统。生成的 ANTLR C# 解析器以及
  `antlr4ts`、`inflection`、`@vscode-logging/logger` 依赖全部移除，仅保留 `js-yaml`。
- 将资源索引重建为对 `Assets/` 的单次遍历。查找引用改用 GUID 索引，不再在每次请求时扫描所有
  场景和预制件，也不再把这些文件内容保留在内存中。
- 将文件监视范围收窄到 `Assets/` 下的资源类型，Unity 频繁改写 `Library/` 和 `Temp/`
  不会再唤醒扩展。
- 扩展现已打包。安装包从 50 MB 降到 100 KB 以内。
- 文档搜索快捷键由 `Shift+1` 改为 `Ctrl+Alt+U` / `Cmd+Alt+U`。原快捷键实际上就是 `!`，
  会拦截在选中文本上输入感叹号的操作。
- `.meta` 同步改为响应编辑器自身的重命名和删除事件。从终端或 Unity 中所做的更改交由 Unity 处理，
  它会自行维护 `.meta` 文件。

### 新增

- 在英语和韩语之外新增简体中文与日语。设置说明、命令名称和市场简介也一并翻译。
- 现在也能在预制件中找到 UnityEvent 连接，不再限于场景。
- 新增设置 `unitySWpack.onlyScenesInBuildSettings` 与 `unitySWpack.debugLogging`。
- 增加在真实扩展宿主中运行的集成测试，以及针对索引、C# 解析和本地化目录的单元测试。

### 修复

- 场景和预制件的引用数在索引完成后即可显示，不再需要先编辑文件才出现。
- 命名空间内的类现在也能正常显示 UnityEvent 连接。此前的比较方式永远无法匹配。
- 没有类声明的文件（例如只包含接口或枚举的文件）在生成 CodeLens 时不再抛出异常。
- `.meta` 同步不再猜测哪次删除对应哪次创建，此前可能移动无关文件的 `.meta`。
- 重命名脚本不会再清除连接所依赖的类名。
- 激活时不再向用户的全局设置写入 `omnisharp.useModernNet`，也不再每次启动都改写扩展自身的
  `package.json`。

### 移除

- 移除 `NetworkBehaviour` 模板，以及其他 12 个对应 UNET 等 Unity 中已不存在 API 的代码片段。

## [2.0 Released]

### 变更

- 大规模内部重构与优化：
    - 将同步文件 I/O 替换为异步 I/O（`fs.promises`）以提升性能。
    - 为 `.meta`、`.unity`、`.prefab` 文件引入缓存，加快引用搜索。
    - 统一多个 provider 中的重复逻辑。
    - 简化并优化 `extension.ts` 的初始化流程。

### 新增

- Unity 文档搜索同时支持选中的文本和光标所在的词。

### 修复

- 改进 `.meta` 文件同步，更可靠地处理创建和删除事件。
- 改进 `Parser` 的类与方法识别，减少误判。

## [1.0 Released]

- 将 “Type toggle” 更名为 “Change coroutine”。

## [0.0.8 Released]

- 提升 `Parser` 性能。

## [0.0.7 Released]

- 新增韩语。

## [0.0.6 Released]

- 新增标识 Unity 事件函数的功能。

## [0.0.5 Released]

- 修复若干问题。

## [0.0.4 Released]

- 将默认语言改为英语。

## [0.0.3 Released]

- 修复 “Type toggle” 的错误。

## [0.0.2 Released]

- 为每项功能加入开关。
- 新增 “Unity SW Pack Dark” 主题。

## [0.0.1 Released]

- 首次发布。
