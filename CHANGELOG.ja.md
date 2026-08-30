# 変更履歴

<p>
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.md">English</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.ko.md">한국어</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.zh-cn.md">简体中文</a> ·
  <b>日本語</b>
</p>

このプロジェクトは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に従い、最新の
リリースを先頭に置いています。

## [2.2 Released]

### 追加

- エディターでは見えない Unity の問題を報告します。既定で有効です。
    - ファイル名とクラス名が一致しない MonoBehaviour。Unity はアタッチできず、
      しかも何も知らせずに失敗します。
    - プロジェクトにもう存在しないスクリプトを参照するシーンやプレハブ。
    - GUID が重複したスクリプト。多くは .meta ファイルのコピーが原因です。
- 毎フレーム実行されるコールバック内のコストの高い呼び出しを指摘します。
  Camera.main、GameObject.Find 系、GetComponent、SendMessage、Debug.Log、
  CompareTag ではなく文字列で tag を比較するコード、ループ内で生成される
  yield 命令が対象です。空の Unity コールバックも報告します。Unity が呼び出し
  続けるためです。構文ベースの検査なので、認識できる Unity API 名を扱うもので、
  型を解決する解析器が見つけるすべてを網羅するものではありません。
  Microsoft.Unity.Analyzers を使っている場合は
  `unitySWpack.performanceDiagnostics` でオフにしてください。
- シーンとプレハブの参照表示がクリックできるようになりました。アセットを開き、
  複数ある場合は選択できます。
- 設定 `unitySWpack.diagnostics` と `unitySWpack.performanceDiagnostics` を追加しました。

## [2.1 Released]

### 変更

- Unity 6 を対象にしました。ドキュメント検索は常に最新版ではなく、
  `ProjectSettings/ProjectVersion.txt` のバージョンに合ったドキュメントを開きます。
- 外部から取り込んでいた Unity Event Lens サブシステムを自前の実装に置き換えました。生成された
  ANTLR C# パーサーと `antlr4ts`、`inflection`、`@vscode-logging/logger` の依存は削除され、
  残るのは `js-yaml` だけです。
- アセットのインデックスを `Assets/` の一度の走査として作り直しました。参照の検索は毎回すべての
  シーンとプレハブを走査するのではなく GUID インデックスを使い、ファイルの内容をメモリに
  保持しません。
- ファイル監視の範囲を `Assets/` 配下のアセット種別に絞りました。Unity が `Library/` や
  `Temp/` を書き換え続けても拡張機能が起こされません。
- 拡張機能をバンドルしました。パッケージは 50 MB から 100 KB 未満になりました。
- ドキュメント検索のショートカットを `Shift+1` から `Ctrl+Alt+U` / `Cmd+Alt+U` に変更しました。
  以前の割り当ては実質 `!` であり、選択範囲に感嘆符を入力する操作を横取りしていました。
- `.meta` の同期はエディター自身の名前変更・削除イベントに反応します。ターミナルや Unity から
  行った変更は Unity 自身が `.meta` を管理するため、そのままにしています。

### 追加

- 英語・韓国語に加えて簡体字中国語と日本語に対応しました。設定の説明、コマンド名、
  マーケットプレースの紹介文も翻訳しています。
- シーンだけでなくプレハブ内の UnityEvent の接続も見つけます。
- 設定 `unitySWpack.onlyScenesInBuildSettings` と `unitySWpack.debugLogging` を追加しました。
- 実際の拡張ホストで動く統合テストと、インデックス・C# 解析・多言語カタログの単体テストを
  用意しました。

### 修正

- シーンとプレハブの参照数がインデックス完了時点で表示されるようになりました。以前はファイルを
  編集するまで空のままでした。
- 名前空間の中にあるクラスでも UnityEvent の表示が機能します。従来の比較方法では一致する
  ことがありませんでした。
- クラス宣言のないファイル（インターフェイスや列挙型だけのファイル）で CodeLens の生成時に
  例外が出る問題を修正しました。
- `.meta` の同期が、どの削除がどの作成と対になるかを推測しなくなりました。以前は無関係な
  ファイルの `.meta` を移動してしまう可能性がありました。
- スクリプトの名前を変更しても、表示が依存するクラス名が消えなくなりました。
- 起動時にユーザーのグローバル設定 `omnisharp.useModernNet` を書き換えず、拡張機能自身の
  `package.json` も毎回書き換えません。

### 削除

- `NetworkBehaviour` テンプレートを含め、Unity にすでに存在しない UNET などの API に対応する
  スニペット 13 個を削除しました。

## [2.0 Released]

### 変更

- 内部の大規模なリファクタリングと最適化を行いました。
    - 同期のファイル入出力を非同期（`fs.promises`）に置き換えました。
    - `.meta`、`.unity`、`.prefab` にキャッシュを導入し、参照検索を高速化しました。
    - 複数のプロバイダーに重複していたロジックを統合しました。
    - `extension.ts` の初期化フローを簡素化しました。

### 追加

- Unity ドキュメント検索が、選択したテキストとカーソル位置の語の両方に対応しました。

### 修正

- `.meta` ファイル同期の作成・削除イベントの扱いをより確実にしました。
- `Parser` のクラスとメソッドの認識を改善し、誤検出を減らしました。

## [1.0 Released]

- 「Type toggle」を「Change coroutine」に名称変更しました。

## [0.0.8 Released]

- `Parser` の性能を改善しました。

## [0.0.7 Released]

- 韓国語を追加しました。

## [0.0.6 Released]

- Unity イベント関数を示す機能を追加しました。

## [0.0.5 Released]

- 不具合を修正しました。

## [0.0.4 Released]

- 既定の言語を英語にしました。

## [0.0.3 Released]

- 「Type toggle」の不具合を修正しました。

## [0.0.2 Released]

- 機能ごとのオン／オフを追加しました。
- 「Unity SW Pack Dark」テーマを追加しました。

## [0.0.1 Released]

- 最初のリリースです。
