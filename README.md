# okf-seedling

**知識は、作るものではなく育てるもの。**

okf-seedling は、あなたのドキュメントを **OKF(Open Knowledge Format)準拠の知識バンドル** として育て、エージェントにも人間にも読める形で公開する Quarto テンプレートツールです。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.3.2-blue.svg)](https://github.com/watanabe3tipapa/okf-seedling/releases)
[![OKF](https://img.shields.io/badge/OKF-v0.2-8b5cf6.svg)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/okf-seedling/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-live-orange.svg)](https://okf-seedling.pages.dev/)
[![GitHub](https://img.shields.io/github/issues/watanabe3tipapa/okf-seedling.svg)](https://github.com/watanabe3tipapa/okf-seedling/issues)

[日本語](README.md) | [English](README_en.md)

## コンセプト

### なぜ「育苗箱(seedling)」なのか

育苗箱は、種を **本番の畑に移植できるまで守り育てる小さな箱** です。完成品の保管庫ではなく、育成の途中地点です。

このツールも同じ。ドキュメントを「作って放置」するのではなく、**開いた芽に水をやり、間引きをし、実がなるところまで寄り添います**。あなたの知識はこの箱で育ち、公開サイト・RAG・エージェントという「畑」へ移植されていきます。([Vision 記事](https://watanabe3tipapa.github.io/okf-seedling/tutorial/why-seedling.html)で詳しく解説)

| 育苗箱の営み | okf-seedling の対応物 |
|---|---|
| 種を蒔く | `quarto use template` でバンドル雛形を生成 |
| 育苗箱で守る | `okf/` バンドル + OKF 形式の管理された生育環境 |
| 水やり・間引き・検査 | `validate-okf` リンター(準拠 + 鮮度・欠落の品質警告) |
| 育ちの記録 | `status` / `generated` / `verified` / `stale_after` |
| 双葉が開く | 1 ソースから人間用 HTML と機械用 OKF バンドルの二系統出力 |
| 畑へ移植する | GitHub Pages / Cloudflare Pages へのデプロイ、RAG ・エージェントへ受け渡し |

### OKF と RAG は競合しない

OKF は **データ表現の規格**、RAG は **利用側の推論アーキテクチャ**。レイヤーが違うため、対立する選択肢ではありません。

- **OKF** = 知識の持ち方・交換・更新を定義するデータ側の基盤
- **RAG** = その知識を検索して回答を生成する利用側の基盤

OKF で知識を構造化しておけば、RAG のフィルタ・ランキング・コンテキスト設計が安定します。**RAG の精度を左右するのは「断片の質」** であり、OKF はその質を規格で保証します。([OKF × RAG Synergy 記事](https://watanabe3tipapa.github.io/okf-seedling/tutorial/okf-rag.html)で実バンドル例つきで解説)

### 情報バンドル向けリンター

単に「作る」だけでなく「**正しく整っているか**」も見ます。ESLint がコードを見るように、このツールは情報バンドルを対象にしたリンターを内蔵しています。

- **準拠(エラー=失敗)**: frontmatter の有無、必須 `type`、型ごとの必須フィールド、内部リンクの解決
- **品質(警告)**: `stale_after` の期限切れ、`title` / `description` の欠落、本文が空、未登録 type、推奨見出しの不足

## 特徴

- エージェントにも人間にも読める `.qmd` を単一の source of truth として執筆
- `quarto use template` の 1 コマンドで知識バンドルの雛形を生成
- 1 source から二系統出力: **人間用 HTML** と **機械用 OKF バンドル**(`okf/` の `index.md` / `log.md` / `concepts/*.md`)
- concept 単位で知識を構成 — API / Playbook / Metric / Attested Computation(1 ファイル 1 概念)
- レジストリ駆動の検証: `tools/okf-types.json` を source of truth とし、スキーマ生成・必須 frontmatter / provenance / 見出しチェック・リンク解決検証を駆動
- GitHub Pages / Cloudflare Pages への並行デプロイ
- 任意の Playwright ベース学習パイプラインで、レンダリング HTML を concept 単位の構造化 JSON に抽出

## インストール

### 前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---|---|
| [Quarto](https://quarto.org/docs/get-started/) | >= 1.3 | `quarto --version` |
| [Node.js](https://nodejs.org/) | >= 20 | `node --version` |
| Git | 任意(デプロイ・貢献時) | `git --version` |

macOS では `brew install quarto node` で両方入ります。Windows / Linux は公式インストーラ、または [Quarto の導入方法](https://quarto.org/docs/get-started/)を参照してください。

### 1. バンドルの雛形を作る

```bash
quarto use template watanabe3tipapa/okf-seedling
```

空のディレクトリで実行すると、知識バンドルの雛形(`concepts/` / `tools/` / `_quarto.yml` など)だけが展開されます。テンプレートを GitHub から自動取得するため、**git clone は不要**です(開発・貢献時のみ [コントリビューション](#コントリビューション) から clone してください)。

### 2. 人間用 HTML と機械用バンドルを両方レンダリング

```bash
quarto render
```

- `_site/` … 人間用 HTML(LP・チュートリアル)
- `okf/` … 機械用 OKF バンドル(`index.md` / `log.md` / `concepts/*.md`)

### 3. 準拠を検証(リンター)

```bash
node tools/validate-okf.mjs
```

バンドルが OKF 準拠か、品質警告(鮮度・欠落)がないかをチェックします。

### 4. 育てた知識を公開

デプロイ方法は [3. Deploy](https://watanabe3tipapa.github.io/okf-seedling/tutorial/03-deploy.html) を参照してください。概念を書き足す手順は [1. Create a Bundle](https://watanabe3tipapa.github.io/okf-seedling/tutorial/01-create-bundle.html) へ。

### (任意) Playwright 学習パイプライン

レンダリング HTML から概念単位の構造化 JSON を抽出します。

```bash
cd pipeline && npm install && npm run learn
```

## Concept 型

| 型 | 用途 |
|----|------|
| API Overview | API 全体の概要(認証・バージョン・エラー) |
| API Endpoint | 1 エンドポイントの仕様 |
| API Schema | 入出力の型・JSON スキーマ |
| Playbook | 手順書・対処手順 |
| Metric | 指標の定義 |
| Attested Computation | 検証可能な計算定義 |

## ドキュメント

初心者の方は **この順** で読むと全体像が掴めます。

1. [0. What is OKF](https://watanabe3tipapa.github.io/okf-seedling/tutorial/00-what-is-okf.html) — OKF・バンドル・用語の基礎
2. [1. Create a Bundle](https://watanabe3tipapa.github.io/okf-seedling/tutorial/01-create-bundle.html) — 実際に作ってみる
3. [2. Concept Types](https://watanabe3tipapa.github.io/okf-seedling/tutorial/02-concept-type.html) — 型の書き方
4. [3. Deploy](https://watanabe3tipapa.github.io/okf-seedling/tutorial/03-deploy.html) — 公開する
5. [OKF × RAG Synergy](https://watanabe3tipapa.github.io/okf-seedling/tutorial/okf-rag.html) — なぜエージェントに効くのか
6. [Vision](https://watanabe3tipapa.github.io/okf-seedling/tutorial/why-seedling.html) — 「育苗箱」に込めた思い

開発メモは [DEV-MEMO](DEV-MEMO.md) を参照してください。

## コントリビューション

コントリビューションは大歓迎です。大きな変更を進める前に、まず [issue](https://github.com/watanabe3tipapa/okf-seedling/issues) を開いて内容を共有してください。

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 連絡先

GitHub: [https://github.com/watanabe3tipapa/okf-seedling](https://github.com/watanabe3tipapa/okf-seedling)

公開サイト: [https://watanabe3tipapa.github.io/okf-seedling/](https://watanabe3tipapa.github.io/okf-seedling/) / [Cloudflare Pages](https://okf-seedling.pages.dev/)

## ライセンス

MITライセンス — 詳細は [LICENSE](LICENSE) ファイルを参照してください。
