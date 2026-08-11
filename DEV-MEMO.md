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
