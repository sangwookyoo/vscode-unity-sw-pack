# Change Log

Check [Keep a Changelog](https://github.com/sangwookyoo/vscode-unity-sw-pack/) for recommendations on how to structure this file.

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