chrome-md3-markdown-viewer/
├── manifest.json          # 拡張機能の設定ファイル（MV3対応、.mdにマッチ）
├── content.js             # MDファイルのプレーンテキスト取得・全体のUI構築
├── marked.min.js          # MarkdownをHTMLに変換する軽量ライブラリ（外部スクリプト利用不可のため同梱）
├── styles.css             # MD3ベースのUIスタイル、目次、パンくず、MDプレビューの見た目
└── icons/
    ├── icon16.png
    └── icon48.png


既存のインデックス画面をMD3化する拡張機能に続き、**マークダウンViewerの拡張機能**ですね！
ローカルの開発ワークスペース内にある `.md` ファイルをChromeで直接開いた際、まるでGitHubや公式ドキュメントサイトのようにリッチで扱いやすいUIに変貌させる仕様です。

こちらもAIエージェント（AGY）に渡せば一発で理解して全ファイルを生成してくれるレベルの「プログラミング用設計書」を作成しました。

---

## 📂 プロジェクト名とディレクトリ構成

プロジェクト名は **`chrome-md3-markdown-viewer`** とします。

```text
chrome-md3-markdown-viewer/
├── manifest.json          # 拡張機能の設定ファイル（MV3対応、.mdにマッチ）
├── content.js             # MDファイルのプレーンテキスト取得・全体のUI構築
├── marked.min.js          # MarkdownをHTMLに変換する軽量ライブラリ（外部スクリプト利用不可のため同梱）
├── styles.css             # MD3ベースのUIスタイル、目次、パンくず、MDプレビューの見た目
└── icons/
    ├── icon16.png
    └── icon48.png

```

---

## 📝 設計書（AGY / Claude Code 向け指示書）

AIへのプロンプトとしてそのままコピペして使用できます。

### 1. 概要

本プロジェクトは、Google Chromeで拡張子が `.md` のローカルファイル（`file:///*.md`）を開いた際に、ブラウザ標準のプレーンテキスト表示を乗っ取り、Material Design 3 (MD3) 準拠の美しい「マークダウンプレビュー画面」へ動的に置換するManifest V3対応のChrome拡張機能である。

### 2. 機能要件

* **URLマッチング:** `file:///*.md` または `file:///*`（内部で拡張子が `.md` か判定）で動作する。
* **元のテキスト取得:** ページロード時に、ブラウザが標準出力した `<pre>` タグ内の生のMarkdownテキストを取得し、一旦変数に退避させる。
* **画面レイアウト（MD3 3カラム/2カラム構成）:**
* **ヘッダー:** ページ最上部に「パンくずリスト」と「表示モード切り替え（Preview / Plain）トグルボタン」、「Copyボタン」を配置。
* **左側サイドバー:** 抽出したHタグ（`#`〜`######`）を元にした動的な「目次（TOC）」を表示。
* **メインコンテンツ領域:** HTMLにレンダリングされたMarkdown、またはプレーンテキストを表示する領域。


* **表示切り替え機能:**
* **Previewモード:** `marked.js` 等でHTML化されたリッチなドキュメントを表示。
* **Plainモード:** 元の生Markdownテキストをプレーンな状態で表示（等幅フォント、シンタックスハイライト、またはシンプルなテキストエリア風）。


* **プレーンMDコピー機能:**
* Plainモード時、またはヘッダーにある「Copy」ボタンを押した際、クリップボードに生のMarkdownテキストをワンクリックでコピーする（`navigator.clipboard.writeText` を使用）。


* **パンくずリスト（Breadcrumbs）:**
* 現在の `file:///Users/hyugayuki/...` のURLパスを `/` で分割し、階層ごとにリンク（`<a>`）化してヘッダーに表示する。これにより上位ディレクトリへ1クリックで戻れるようにする。



### 3. 各ファイルの具体的な実装仕様

#### ① `manifest.json`

* `manifest_version`: 3
* `content_scripts`:
* `matches`: `["file:///*/*.md", "file:///*/*.MD"]`
* `js`: `["marked.min.js", "content.js"]`
* `css`: `["styles.css"]`
* `run_at`: `document_end`



#### ② `content.js`

1. `document.querySelector('pre').textContent` から生のMarkdownテキストを抽出。
2. 元の `body` の中身をクリア。
3. **パンくずの生成:** `window.location.pathname` から各階層の絶対パスを逆算して、リンク付きリストを生成。
4. **Markdownのパース:** 同梱の `marked.parse(rawMarkdown)` を用いてHTMLを生成。
5. **目次の抽出:** 生成したHTML、または元のテキストから `h1, h2, h3` をクエリし、それぞれに `id` を付与して左サイドバー用のリンク（アンカーリンク `#id`）を作成。
6. **UIの構築:** MD3コンポーネント（Top App Bar、Navigation Rail風の左サイドバー、Segmented Buttons風のモード切り替えトグル）のHTMLをインジェクション。
7. **イベントハンドリング:**
* 「Preview / Plain」の切り替えにより、メイン領域の表示/非表示（`display: none`）をスイッチ。
* 「Copy」ボタンクリックで退避させておいた生Markdownをコピーし、MD3の「Snackbar（トースト）」で「Copied!」と通知。



#### ③ `styles.css`

* **カラーパレット:** ダークモード優先（`background: #1c1b1f`、`surface: #2b2930`、`primary: #d0bcff`）。
* **レイアウト:** `display: flex` を使用。左サイドバー（目次）を幅 `280px` で固定し、メイン領域を `flex: 1` で広げる。
* **目次（TOC）:** スクロール追従（`position: sticky`）。現在見ているセクションがハイライトされるとベスト（余裕があれば実装）。
* **タイポグラフィ:** MD3のMarkdown用スタイル。`h1` などのマージンを適切に取り、リストアイテムのパディングは `12px` 以上を確保して誤タップを防ぐ。

---

## 🛠️ AGYへのファーストプロンプト

プロジェクトフォルダに上記の空ファイルを準備したら、まずはこう指示してみてください。

> 「マークダウンViewer拡張機能 `chrome-md3-markdown-viewer` を作成します。まずは `manifest.json` と、ページ内の生のMarkdownテキストを取得して、URLからパンくずリスト（階層リンク）を画面上部に生成するベースの `content.js` を実装して。marked.js は後で入れるので、まずはテキストのまま表示するUIの土台だけでOKです」

インデックス画面のMD3化とこのMarkdown Viewerが組み合わさると、Chrome上のローカル開発環境がめちゃくちゃ快適なドキュメントブラウザになりますね！応援しています！