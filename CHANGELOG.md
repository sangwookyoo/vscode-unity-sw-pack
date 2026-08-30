# Change Log

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.1 Released]

- Initial release

## [0.0.2 Released]

- Added ON/OFF function for each feature.
- Added 'Unity SW Pack Dark' theme.

## [0.0.3 Released]

- Fixed 'Type toggle' error.

## [0.0.4 Released]

- Support for English as the default language.

## [0.0.5 Released]

- Fixed bugs.

## [0.0.6 Released]

- Added feature that indicates Unity event functions.

## [0.0.7 Released]

- Support for Korean.

## [0.0.8 Released]

- Improved 'Parser' performance.

## [1.0 Released]

- Renaming 'Type toggle' → 'Change coroutine'.

## [3.0 Released]

### Changed

- Target Unity 6. The documentation search now opens the docs for the version in
  `ProjectSettings/ProjectVersion.txt` instead of always the latest.
- Replaced the vendored Unity Event Lens subsystem with a native implementation. The
  generated ANTLR C# parser and the `antlr4ts`, `inflection` and `@vscode-logging/logger`
  dependencies are gone; only `js-yaml` remains.
- Rebuilt asset indexing as a single pass over `Assets/`. Reference lookups use a GUID
  index instead of scanning every scene and prefab on each request, and the extension no
  longer keeps that file content in memory.
- Narrowed the file watchers to the asset types under `Assets/`, so Unity rewriting
  `Library/` and `Temp/` no longer wakes the extension.
- The extension is now bundled. The package went from 50 MB to under 100 KB.
- Changed the documentation search shortcut from `Shift+1`, which was literally `!` and
  hijacked typing over a selection, to `Ctrl+Alt+U` / `Cmd+Alt+U`.

### Added

- Simplified Chinese and Japanese, alongside English and Korean. Settings, command titles
  and the marketplace description are translated too.
- UnityEvent wiring is now found in prefabs, not only in scenes.
- Settings `unitySWpack.onlyScenesInBuildSettings` and `unitySWpack.debugLogging`.
- An integration test suite that runs in a real extension host, plus unit tests for the
  index, the C# parsing and the localization catalogs.

### Fixed

- The scene and prefab reference counts now appear once indexing finishes, instead of
  staying blank until the file was edited.
- The UnityEvent lens works for classes inside a namespace. The previous comparison could
  never match them.
- Files without a class declaration, such as interface- or enum-only files, no longer
  throw while producing CodeLenses.
- `.meta` sync no longer guesses which delete belongs to which create, which could move an
  unrelated file's `.meta`. It now uses the editor's rename and delete events.
- Renaming a script no longer clears the class name that the lens depends on.
- Activation no longer writes `omnisharp.useModernNet` to the user's global settings, and
  no longer rewrites the extension's own `package.json` on every start.
- Removed 13 snippets for UNET and other APIs that no longer exist in Unity.

### Removed

- The `NetworkBehaviour` template and the UNET lifecycle messages.

## [2.0 Released]

### Changed

- Major internal refactoring and optimization:
    - Replaced synchronous file I/O with asynchronous I/O (`fs.promises`) for better performance.
    - Introduced caching for `.meta`, `.unity`, and `.prefab` files to speed up reference search.
    - Unified duplicate logic across multiple providers (`Hover`, `UsageScenePrefab`, `UnityEventMessage`, `TypeToggle`).
    - Simplified and optimized initialization flow in `extension.ts`.

### Added

- Unity Documentation Search now supports both:
    - Selected text, or
    - Word under the cursor (when no text is selected).

### Fixed

- Improved `.meta` file synchronization logic with more reliable handling of create/delete events.
- Enhanced class/method detection regex in `Parser` to reduce false positives.
