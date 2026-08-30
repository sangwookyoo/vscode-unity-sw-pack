# Changelog

<p>
  <b>English</b> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.ko.md">한국어</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.zh-cn.md">简体中文</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.ja.md">日本語</a>
</p>

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), so the newest
release is listed first.

## [2.1 Released]

### Changed

- Target Unity 6. The documentation search now opens the docs for the version in
  `ProjectSettings/ProjectVersion.txt` instead of always the latest.
- Replaced the vendored Unity Event Lens subsystem with a native implementation. The generated
  ANTLR C# parser and the `antlr4ts`, `inflection` and `@vscode-logging/logger` dependencies are
  gone; only `js-yaml` remains.
- Rebuilt asset indexing as a single pass over `Assets/`. Reference lookups use a GUID index
  instead of scanning every scene and prefab on each request, and the extension no longer keeps
  that file content in memory.
- Narrowed the file watchers to the asset types under `Assets/`, so Unity rewriting `Library/`
  and `Temp/` no longer wakes the extension.
- The extension is now bundled. The package went from 50 MB to under 100 KB.
- Changed the documentation search shortcut from `Shift+1`, which was literally `!` and hijacked
  typing over a selection, to `Ctrl+Alt+U` / `Cmd+Alt+U`.
- `.meta` sync now reacts to the editor's own rename and delete events. Changes made from a
  terminal or from Unity are left to Unity, which maintains its own `.meta` files.

### Added

- Simplified Chinese and Japanese, alongside English and Korean. Settings, command titles and the
  marketplace description are translated too.
- UnityEvent wiring is now found in prefabs, not only in scenes.
- Settings `unitySWpack.onlyScenesInBuildSettings` and `unitySWpack.debugLogging`.
- An integration test suite that runs in a real extension host, plus unit tests for the index,
  the C# parsing and the localization catalogs.

### Fixed

- The scene and prefab reference counts now appear once indexing finishes, instead of staying
  blank until the file was edited.
- The UnityEvent lens works for classes inside a namespace. The previous comparison could never
  match them.
- Files without a class declaration, such as interface- or enum-only files, no longer throw while
  producing CodeLenses.
- `.meta` sync no longer guesses which delete belongs to which create, which could move an
  unrelated file's `.meta`.
- Renaming a script no longer clears the class name that the lens depends on.
- Activation no longer writes `omnisharp.useModernNet` to the user's global settings, and no
  longer rewrites the extension's own `package.json` on every start.

### Removed

- The `NetworkBehaviour` template and 12 other snippets for UNET and other APIs that no longer
  exist in Unity.

## [2.0 Released]

### Changed

- Major internal refactoring and optimization:
    - Replaced synchronous file I/O with asynchronous I/O (`fs.promises`) for better performance.
    - Introduced caching for `.meta`, `.unity`, and `.prefab` files to speed up reference search.
    - Unified duplicate logic across multiple providers.
    - Simplified and optimized initialization flow in `extension.ts`.

### Added

- Unity documentation search now supports both selected text and the word under the cursor.

### Fixed

- Improved `.meta` file synchronization with more reliable handling of create and delete events.
- Enhanced class and method detection in `Parser` to reduce false positives.

## [1.0 Released]

- Renamed 'Type toggle' to 'Change coroutine'.

## [0.0.8 Released]

- Improved `Parser` performance.

## [0.0.7 Released]

- Added Korean.

## [0.0.6 Released]

- Added the feature that indicates Unity event functions.

## [0.0.5 Released]

- Fixed bugs.

## [0.0.4 Released]

- Made English the default language.

## [0.0.3 Released]

- Fixed a 'Type toggle' error.

## [0.0.2 Released]

- Added an on/off switch for each feature.
- Added the 'Unity SW Pack Dark' theme.

## [0.0.1 Released]

- Initial release.
