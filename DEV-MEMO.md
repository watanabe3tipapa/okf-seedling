# DEV-MEMO.md

okf-seedling 開発メモ。OKF(Open Knowledge Format) v0.2 準拠のテンプレート作成ツールを Quarto で構築する。

## ゴール

- OKF v0.2 準拠の知識バンドル(.qmd オーサリング → .md ミラー)を作成できる **Quarto テンプレートツール**
- チュートリアル用 **LP を GitHub Pages と Cloudflare Pages に並行公開**
- **Playwright スタック**(レンダリングHTMLの読み取りによる知識蓄積)を後続実装予定。その前提(安定した見出し規約・frontmatterのHTML出力)を織り込んで実装する
- コマンドは `quarto` 一択で統一(`quarto use template <org>/okf-seedling`)

## 決定事項

1. **モノレポ構成**
2. **concept型は初回から全種**(API/Playbook/Metric/Attested Computation)+ typeレジストリ方式で拡張可能
3. **GitHub Pages と Cloudflare Pages に並行デプロイ**
4. **frontmatter を学習に含める(最重要)** → メタデータを HTML にも出力 + `.md` ミラー生成
5. テンプレートは `quarto use template`

## 技術制約(検証済み)

1. `quarto use template` は **repo 全体をコピー**する
   - → リポジトリルート自体をテンプレート化し、`.quartoignore` で `node_modules/`・`_site/`・`okf/`・`pipeline/`・`.github/` をスキャフォールドから除外
   - `tools/` はスキャフォールドに含める(`_quarto.yml` の post-render が参照するため、ツールキットとして同梱)
2. Quarto の md/gfm 出力は **カスタム frontmatter を完全には保持しない**(既知の制約)
   - → OKF 本体 `.md` は `tools/stamp-okf.mjs`(post-render)でソース `.qmd` から整形生成し、`okf/` に配置
3. frontmatter を学習に入れるには HTML 上に出す必要がある
   - → `_extensions/okf/` の小さなフィルタで各ページに metadata ブロックを描画。Playwright は DOM から取得(PLAY.md の「frontmatterをHTMLに残すか」問題への回答)

## リポジトリ構造

```
okf-seedling/                        ← quarto use template 対象 (ルート=Quarto website)
├── _quarto.yml                      # サイト設定・theme・OKF v0.2 デフォルト
├── index.qmd                        # LP(ランディング。about テンプレート)
├── tutorial/
│   ├── 01-create-bundle.qmd         # quarto use template → 新バンドル作成
│   ├── 02-concept-type.qmd          # concept型の書き方(全種)
│   └── 03-deploy.qmd                # 2系統デプロイ手順
├── concepts/                        # オーサリング対象(.qmd 雛形)
│   ├── api-overview.qmd / api-endpoint.qmd / api-schema.qmd
│   ├── playbook.qmd / metric.qmd / attested-computation.qmd
├── okf/                             # 生成物: OKF v0.2準拠バンドル(.md ミラー)
│   ├── index.md / log.md
│   └── concepts/*.md
├── _extensions/okf/                 # Quartoカスタムformat拡張(frontmatter→HTML表示フィルタ)
├── tools/
│   ├── okf-types.json               # typeレジストリ(キー追加で概念型を拡張)
│   ├── stamp-okf.mjs                # post-render: .qmd→okf/*.md 整形
│   └── validate-okf.mjs             # v0.2準拠チェック(type必須等)
├── pipeline/                        # (M5) Playwright学習パイプライン(予定)
├── .github/workflows/
│   ├── deploy-gh-pages.yml
│   └── deploy-cloudflare-pages.yml
├── .quartoignore                    # pipeline/ .github/ tools/ をスキャフォールド除外
└── AGENTS.md
```

## 拡張性の仕組み(typeレジストリ)

`tools/okf-types.json` に型定義を集約し、テンプレート生成・frontmatter検証・サイト描画・Playwrightのセクション規約がすべてこれを参照。

```json
{
  "APIEndpoint": {
    "frontmatter": ["method", "path", "tags"],
    "headings": ["Summary", "Responses", "Examples"],
    "icon": "endpoint"
  },
  "AttestedComputation": {
    "frontmatter": ["runtime", "parameters", "executor", "attester"],
    "headings": ["Computation"]
  }
}
```

新type追加 = JSONに1エントリ追加のみ。OKF v0.2 の `type`(必須)・`sources`・`generated`・`verified`・`status`・`stale_after` は全型共通で必ず付与。

## 2系統出力

| 系統 | 出力 | 用途 | 生成方法 |
|------|------|------|----------|
| 人間用 | `_site/`(HTML)+ metadataブロック | LP・チュートリアル・閲覧 | `quarto render` |
| 機械用 | `okf/` (.md + frontmatter) | OKF準拠バンドル・学習 | `tools/stamp-okf.mjs`(post-render) |

学習(#4): Playwright は**人間用HTML**から「metadataブロック + 見出しベースセクション」を安定セレクタで抽出。`.md`ミラーを保険に使える。

## マイルストーン

| # | 内容 | 完了条件 |
|---|------|----------|
| M1 | リポジトリ初期化・`.quartoignore`・typeレジストリ・`_quarto.yml` | `quarto render` が空サイトを出力 |
| M2 | 6種concept雛形 + `stamp-okf.mjs` + `validate-okf.mjs` | `okf/`に準拠バンドルが生成されvalidatorがPASS |
| M3 | `_extensions/okf/`(metadata描画) + LP + チュートリアル | 各ページにmetadataブロックが出る |
| M4 | GH Pages / Cloudflare Pages 2系統デプロイ | 両URLにサイト公開 |
| M5 | Playwright学習パイプライン(concept単位差分更新) | 知識蓄積のdry-run成功 |

## 実装メモ

- `_quarto.yml` の `format: okf-html` は拡張 `_extensions/okf/`(Custom Format)が提供する形式。Quarto 1.3 は `website: footer` 非対応のためフッターは未使用
- `project.render: ["*.qmd"]` のみを対象にし、DEV-MEMO.md / okf/ の .md をサイト入力から除外
- frontmatter の HTML 描画(`.concept-meta`)は okf-meta.lua が担当。Quarto 経由の metadata 値は「平テーブル(インライン要素)」「MetaList」「MetaMap」等が混在するため、型を判別して整形する

## デプロイ状況

- GitHub Pages: https://watanabe3tipapa.github.io/okf-seedling/ 公開済み
- Cloudflare Pages: https://okf-seedling.pages.dev/ **公開済み**(2026-08-11、GH Actions 経由で `pages project create` + deploy / 31 files)。git 連携ビルドは停止済み
- GitHub Actions の `deploy-cloudflare-pages.yml` はシェルベース(`npx wrangler@4.120.1` を直接実行)に変更。シークレット `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 未設定時は `::notice::` を出してジョブ成功のままスキップする
- ※ `if:` 内での `secrets` 参照は GitHub Actions の validation で弾かれる(ジョブ生成 0 件で "workflow file issue")ため使用しない
- **決定: Cloudflare は git 連携ビルドを停止し、GitHub Actions(`deploy-cloudflare-pages.yml`)に一本化**。シークレット設定後に初回デプロイ(プロジェクトは自動 `pages project create`)

## M5: Playwright 学習パイプライン

- `pipeline/src/learn.mjs` + `extract.mjs`。`_site/concepts/*.html` を file:// で読み、concept 単位で `pipeline/knowledge/concepts/<id>.json` に蓄積
- 安定セレクタ: ルート `#quarto-document-content`、メタ情報 `.concept-meta` の dt/dd、セクションは h1/h3(Quarto は `<section class="levelN">` でラップするため文書順に h1/h3 を辿って切り出す)
- 差分更新: meta + sections の sha256(先頭16桁)を `hash` として保持し、同一なら `unchanged` でスキップ(updated / new / unchanged を index.json に集計)
- 実行: `quarto render && cd pipeline && npm run learn`
- 環境: Playwright 1.49.1 を固定(macOS 13 対応の最終版。1.62 は mac13 非対応)

## その他メモ

- M4 の Cloudflare Pages は GitHub Actions 経由(`wrangler-action` + APIトークン)で統一。Cloudflare側のプロジェクト作成はユーザー側のダッシュボード操作が必要。
- OKF v0.2 仕様は https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md に準拠。

## M6: OKF バージョンアップ対応(validate ツール)

- 目的: OKF 仕様の将来バージョン(0.3 以降)に CI が初日から壊れず、段階的に対応できるようにする
- 構成(バージョンの単一 source of truth)
  - `tools/okf-version.json` … `{ "current": "0.2", "supported": ["0.2"] }`
  - `stamp-okf.mjs` → `index.md` の `okf_version:` をこの config から読む(ハードコード廃止)
  - `validate-okf.mjs` → バンドル宣言の `okf_version` を照合して 3 分岐
- 3 分岐の挙動

  | バンドル宣言 | 挙動 |
  |---|---|
  | `supported` 内 | 厳密チェック → PASS / FAIL |
  | current より新しい(未知) | 基本チェック + **警告のみで PASS**(CI 非破壊) |
  | 古い / 未指定 | 警告 + current として扱う |

- バージョン比較は semver 風に `major.minor` の数値比較(custom ヘルパー)
- CLI: `node tools/validate-okf.mjs --versions` で current / supported / 各バージョンのルール概要を表示
- 将来 OKF 0.3 対応手順 … ① `okf-version.json` に `"0.3"` 追加 + `current` 更新、② `validate-okf.mjs` の `RULES` マップに `"0.3"` ルール追加。宣言バンドルは自動で厳密チェックへ切替
- 落とし穴対策: `okf_version` は stamp 生成値と config を常に同期(生成現場で直書きしない)

## M7: LP ダークテーマ(hatch-marimo-sandbox 踏襲)

- 参照: https://watanabe3tipapa.github.io/hatch-marimo-sandbox/ の配色(ダーク + 青→紫グラデーション)
- 実装: `assets/styles.css` で CSS 変数 + Bootstrap 変数(`--bs-*`)を上書き。`theme: cosmo` は維持し、スタイルシートが最後に読み込まれるのを利用
- パレット: bg `#0f1117` / panel `#1c202b` / border `#2a2f3d` / text `#e8eaf0` / dim `#9aa2b5` / accent `#4f8cff` / accent2 `#8b5cf6`
- navbar-brand はグラデーションテキスト、カードは panel 背景 + 角丸 12px、テーブルは border 色 + セル本文色を明色に
- 注意: テーブルは Bootstrap のセル実色が cosmo の濃色に勝つため `.table th/td` は `!important` で上書き

## M8: Apple Notes バンドル手法(検討メモ・特記事項)

- アイデア: 自分のデバイス/アカウントの Apple「メモ」(SQLite)を OKF バンドルに取り込む手法の紹介を追加
- 調査で確認した事実
  - `~/Library/Group Containers/group.com.apple.notes/` は **Full Disk Access 未付与だと読めない**(Operation not permitted)
  - **AppleScript / JXA 経由なら許可なしで全ノートにアクセス可能**(本機では 8,255 ノート・name/body/日付/フォルダ/id 取得可。body は HTML タグ混じり)
  - `node:sqlite`(Node 22+)が利用可能 → SQLite 直読みに外部依存不要
  - 本文は新世代では `ZICNOTEDATA.ZBODY`(NSKeyedArchiver バイナリ)等で、**素直なテキスト抽出は困難**

### 気になる点(重要度順) — 実装時の必須ガード

1. **プライバシー/秘密情報の流出**: 検証中に先頭ノートから Cloudflare API トークンが出現。メモをバンドル→コミットすると機密が git に載る。
   対策: 専用フォルダ運用 / `--skip-folders` / コミット対象になる旨の警告表示 / 機密を想定した UI ガード。
2. **型の相性**: OKF の 6 型(API/Playbook/Metric/…)は汎用メモに不向き。`type: Playbook` 強制は無理筋 → **型は明示指定**(デフォルト `Playbook`、`--type` で変更可)にとどめ、無理に当てはめない。
3. **SQLite の本文抽出は脆い**: `ZBODY` はバイナリのため抽出はヒューリスティック。**信頼できる抽出は AppleScript/JXA 経路**。SQLite 直読みは「高速だが best-effort」の副経路と明記。
4. **差分の頻度**: メモは頻繁に変わる → バンドル hash が毎回更新され、Playwright 知識パイプラインの差分(updated)ノイズになりがち。

### 方針(仮)

- 「tutorial/04 + 任意導入 importer(`tools/import-apple-notes.mjs`)」として **手法紹介枠** で実装(コア機能にしない)
- 抽出: AppleScript/JXA 主 + SQLite 副(auto でフォールバック)
- 「実験的機能」と明記し、上記 4 点のガードをセットで実装

### 結論(2026-08-11 更新)

- **検討の結果、実装は回避する**(このアイデアを採用しない)
- 理由: 秘密情報(API トークン等)がメモ内に実在し、バンドル/コミット経路で流出リスクが発生する点が致命的。型の相性・SQLite 本文抽出の脆さ・差分頻度の課題を考慮しても、ガードを十分に設けるコストと期待価値が見合わない
- 今後この方向を再検討する場合は: 抽出対象を「専用フォルダのみ」に限定し、機密スキャン(`--skip`/検出)を必須とする前提で、実装前に改めて本件の再評価を行うこと

## M9: Notion バンドル手法(検討メモ)

- 検証した事実(本機)
  - ローカルキャッシュ: `~/Library/Application Support/Notion/notion.db`(**336MB の SQLite が実在**、読取可能)
  - Notion はオフィシャルブログで SQLite キャッシュの存在を明言(best-effort な record cache)。notion-mcp-fast 等が 2 万ページを 3 秒で読む実績
  - 公式 **Notion API**(blocks 形式)は安定だが、Integration トークン(秘密)・ネットワーク・レート制限(約 3 req/s)・Markdown 変換が必要
- 抽出経路の比較

  | 経路 | 速度 | 完全性 | 秘密 | 備考 |
  |---|---|---|---|---|
  | ローカル `notion.db` | 高速 | **キャッシュで不確実**(未ドキュメントスキーマ) | 不要 | アプリ版の LRU キャッシュに依存、版間で壊れやすい |
  | Notion API | 低速(制限あり) | 正(クラウドが正) | **必要** | blocks → Markdown 変換必須 |
  | UI エクスポート | 手動 | 正 | 不要 | スケールしない |

- 気になる点
  1. **秘密情報**: Notion ページもトークン等を含み得る。バンドル/コミット経路で流出リスク(M8 と同型)
  2. **キャッシュの不確実性**: `notion.db` はあくまでキャッシュであり、実体はクラウド。完全性の保証なし + スキーマ非公開 → 壊れやすい。「ローカルが正」の Apple Notes と性質が異なる
  3. **型の相性**: OKF 6 型に当てはまらないページ多数
  4. **API 経路はシークレット管理**が追加で必要
  5. 差分頻度(M8 と同型)
- 結論: **実装は回避/保留が妥当**。抽出自体は可能(notion.db 実在確認)だが、キャッシュの脆さ + 秘密情報リスク + 型の相性が Apple Notes より悪く、価値対リスクが見合わない

## M10: Obsidian バンドル手法(検討メモ)

- 検証した事実(本機)
  - ボルトは **プレーン Markdown のファイル群**がそのまま source of truth(クラウド同期は iCloud Drive)
  - iCloud ボルト `/Documents` に **13,472 の .md** 実在。しかもボルト内に「Apple Notes」フォルダがあり、**Apple メモの Obsidian 同期が既に存在する**可能性が高い
  - 形式: Markdown + YAML frontmatter(Properties)/ wikilink `[[...]]` / embed `![[...]]` / callout / tag
- 抽出経路: ほぼ自明。`.md` をコピー → wikilink/embed/callout を標準 Markdown へ変換 → OKF frontmatter(`type` 等)を付与 → バンドルへ stamp。秘密・API・ネットワーク不要
- 気になる点(リスクは 3 ツール中最小)
  1. **Obsidian 固有構文の変換**: `[[wikilink]]`→標準リンク、`![[embed]]` 解決、`[!NOTE]` callout→標準化(移植性)
  2. **frontmatter 規格化**: 既存ノートに OKF `type` がない → フォルダ→型の対応付け or 明示指定で付与する設計が必要
  3. **秘密情報**: ボルトにも含み得るため警告は同様(M8 のガードを流用)
  4. **規模/差分**: 1.3 万超の .md。全量 import は hash 更新ノイズ大 → フォルダ/glob で対象を絞る運用が前提
- 結論: **3 ツール中で最も実現性が高い**(Markdown + YAML = 実質 OKF の形)。「手法紹介」の枠で扱うなら Obsidian が最有力候補。実装是非は指示待ち

## M8-M10 比較まとめ(Apple Notes / Notion / Obsidian)

| 項目 | Apple Notes | Notion | Obsidian |
|---|---|---|---|
| データの正体 | SQLite(暗号化・FD 制限) | クラウド + ローカル cache | **ローカル .md が正** |
| 抽出経路 | AppleScript(可) / SQLite(不可) | notion.db / API | ファイル読取 |
| 実現性 | 中 | 中(だが脆い) | **高** |
| 主なリスク | 秘密情報 / ZBODY 難 | キャッシュ脆さ / 秘密 / API秘密 | wikilink変換 / 型付与 |
| 判断 | 回避 | 回避/保留 | **最有力(要指示)** |

## M11: ツールバージョン管理(v0.3.0 以降)

- ツール本体のバージョンは `tools/tool-version.json`(単一 source of truth)。現行 `0.3.0`
- **方針: 機能追加はマイナーアップデートで積み上げる**(0.3.x / 0.4.0 / …)
- 表示: README バッジ(Version)・`node tools/validate-okf.mjs --versions` の `tool:` 行
- リリース時: `tools/tool-version.json` の `current` 更新 → README バッジ URL 更新 → `git tag vX.Y.Z` → push
- 注意: ツール版と **OKF 仕様対応版(`tools/okf-version.json`)は別物**。仕様準拠 v0.2 の読者は OKF current が指す物を参照
