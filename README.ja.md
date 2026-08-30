<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack" title="Visual Studio Code Marketplace" target="_blank">
    <img src="https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/images/icon.png" width="150px" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.md">English</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.ko.md">한국어</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.zh-cn.md">简体中文</a> ·
  <b>日本語</b>
</p>

## 概要

Unity SW Pack は、Visual Studio Code で Unity C# を書く作業を快適にします。どのメソッドを Unity が
自動的に呼び出すのか、そのスクリプトが実際どこで使われているのか、UnityEvent がどこに接続されて
いるのかを、エディターから離れずに確認できます。

**Unity 6** 向けに作られています。各機能は設定から個別にオフにできます。

## 機能

- **Unity メッセージのスニペット** — `MonoBehaviour` のライフサイクル、`ScriptableObject`、
  エディタースクリプトを含む 65 個のテンプレート。
- **Unity メッセージの目印** — `Awake`、`Start`、`Update` などの上に目印を付け、使われていない
  コードと誤解されないようにします。
- **ホバー説明** — Unity メッセージにカーソルを合わせると、役割と実行タイミングがわかります。
- **シーンとプレハブの使用箇所** — 表示中のスクリプトを使っているシーンとプレハブの数、および
  その内訳を表示します。
- **UnityEvent の接続** — メソッドや `UnityEvent` フィールドがインスペクターのどこに接続されて
  いるかを、シーンとプレハブの両方から探します。
- **コルーチンへの変更** — メソッドを `void` と `IEnumerator` の間でワンクリック切り替え。
  `using System.Collections;` も自動で追加します。
- **.meta ファイルの同期** — エクスプローラーでアセットの名前を変えたり削除すると、`.meta` も
  追従します。
- **ドキュメント検索** — 選択した語を、プロジェクトが実際に使っているバージョンの Unity
  ドキュメントで検索します。`Ctrl+Alt+U`（macOS は `Cmd+Alt+U`）。
- **Unity SW Pack Dark** — Unity C# 向けに調整したテーマ。

英語・韓国語・簡体字中国語・日本語に対応し、VS Code の表示言語に従います。

## 必要なもの

1. [C# 拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp)
2. [.NET SDK](https://dotnet.microsoft.com/download)
    - **Windows**: インストール後、`PATH` の変更を反映するためサインアウトして入り直してください。

`Assets/`、`Library/`、`ProjectSettings/` を含むフォルダー、つまり Unity プロジェクトのルートを
開いてください。シーンとプレハブの機能はアセットを見つけるためにこれを必要とします。

## 動作イメージ

**スニペット**

![スニペット](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/01.gif)

**シーンとプレハブの使用箇所**

![シーンとプレハブの使用箇所](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/02.gif)

**UnityEvent の接続**

![UnityEvent の接続](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/03.gif)

**Unity メッセージの目印**

![Unity メッセージの目印](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/04.gif)

**ホバー説明**

![ホバー説明](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/05.gif)

**コルーチンへの変更**

![コルーチンへの変更](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/06.gif)

**.meta ファイルの同期**

![.meta ファイルの同期](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/07.gif)

## 設定

| 設定                                    | 既定値  | 内容                                                   |
| --------------------------------------- | ------- | ------------------------------------------------------ |
| `unitySWpack.unityEventMessage`         | `true`  | Unity が自動的に呼び出すメソッドを示す                 |
| `unitySWpack.usageScenePrefab`          | `true`  | スクリプトを使うシーンとプレハブの数を表示する         |
| `unitySWpack.unityMessageHover`         | `true`  | ホバー時に Unity メッセージを説明する                  |
| `unitySWpack.typeToggle`                | `true`  | `void` ↔ `IEnumerator` の切り替えを提供する            |
| `unitySWpack.metaFileSync`              | `true`  | 名前変更・削除に合わせて `.meta` を保つ                |
| `unitySWpack.searchInUnityDocs`         | `true`  | ドキュメント検索コマンドを追加する                     |
| `unitySWpack.unityEventLens`            | `true`  | UnityEvent の接続先を表示する                          |
| `unitySWpack.onlyScenesInBuildSettings` | `false` | ビルド設定にあるシーンからのみ UnityEvent の接続を読む |
| `unitySWpack.debugLogging`              | `false` | インデックス処理を出力チャネルに記録する               |

## 補足

`.meta` の同期は**エディターで行われた**名前変更と削除にのみ反応します。ターミナルや Unity から
行った変更は Unity 自身が `.meta` を管理するため、そのままにしています。

大きなプロジェクトで反応が無いように見えるときは `unitySWpack.debugLogging` を有効にし、
「Unity SW Pack」出力チャネルを確認してください。`Assets/` が大きいと初回のインデックスに
少し時間がかかります。

## ライセンス

[MIT](LICENSE)
