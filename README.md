# okf-seedling

**知識は、作るものではなく育てるもの。**

okf-seedling は、あなたのドキュメントを OKF (Open Knowledge Format) 準拠の知識バンドルとして育て、エージェントにも人間にも読める形で公開する Quarto テンプレートツールです。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.1-blue.svg)](https://github.com/watanabe3tipapa/okf-seedling/releases)
[![OKF](https://img.shields.io/badge/OKF-v0.2-8b5cf6.svg)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/okf-seedling/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-live-orange.svg)](https://okf-seedling.pages.dev/)
[![GitHub](https://img.shields.io/github/issues/watanabe3tipapa/okf-seedling.svg)](https://github.com/watanabe3tipapa/okf-seedling/issues)

[日本語](README.md) | [English](README_en.md)

---

## 概要

okf-seedling は Quarto のテンプレートとして動作し、1 つのソース (`.qmd`) から 1) 人間向けの HTML、2) 機械向けの OKF バンドル (okf/) の二系統の出力を生成します。ドキュメントを単なる公開物ではなく「育てる」過程に置き、準拠チェックや品質警告を通して鮮度と完結性を保つことを目的としています。

## コンセプト (なぜ「育苗箱」か)

育苗箱は、種を本番の畑に移植できるまで守り育てる小さな箱です。本ツールも同様に、ドキュメントを育てて公開やRAG・エージェント利用へと移植できる状態にします。詳しい解説は Vision 記事にあります。

okf-seedling の主な対応:

- `quarto use template` でバンドル雛形を生成
- `okf/` に OKF 形式の機械用バンドルを出力
- リンター(`validate-okf`)で準拠性と品質を検査
- 1 ソースから人間用 HTML と機械用バンドルを生成
- GitHub Pages / Cloudflare Pages での公開を想定した構成

OKF はデータ表現の規格、RAG は利用側の推論アーキテクチャであり、両者は競合する選択肢ではないという考え方を本プロジェクトは採っています。

---

## 主な特徴

- Quarto の `.qmd` を source of truth にして執筆
- `quarto use template watanabe3tipapa/okf-seedling` で雛形を作成
- 1 ソースから人間用 HTML と OKF バンドルを二系統で出力
- concept 単位 (API / Playbook / Metric など) の設計 (1 ファイル = 1 概念)
- レジストリ駆動の検証: `tools/okf-types.json` を基にスキーマ/検証を実行
- 内蔵リンターで準拠(エラー)と品質(警告)を検出
- オンライン編集: ブラウザから `.qmd` を編集・コミット (Quarto Editor PE 連携)
- 任意の Playwright ベース学習パイプラインでレンダリング HTML から構造化 JSON を抽出

リンターの検査例:

- 準拠(エラー): frontmatter の有無、必須 `type`、型ごとの必須フィールド、内部リンク解決
- 品質(警告): `stale_after` の期限切れ、`title`/`description` の欠落、本文が空、未登録 type、推奨見出しの不足

---

## 前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---:|---|
| Quarto | >= 1.3 | `quarto --version` |
| Node.js | >= 20 | `node --version` |
| Git | 任意 (デプロイ・貢献時) | `git --version` |

macOS では `brew install quarto node` で両方導入できます。Windows / Linux は Quarto の導入方法に従ってください。

---

## 開始手順（確認できる事実のみ）

1. 空ディレクトリでテンプレートを展開:

```bash
quarto use template watanabe3tipapa/okf-seedling
```

2. 人間用 HTML と機械用バンドルをレンダリング:

```bash
quarto render
```

出力例:
- `_site/` — 人間用 HTML
- `okf/` — 機械用 OKF バンドル (`index.md`, `log.md`, `concepts/*.md` など)

3. 準拠検証 (リンター):

```bash
node tools/validate-okf.mjs
```

4. （任意）Playwright ベースの学習パイプラインを実行する手順:

```bash
cd pipeline && npm install && npm run learn
```

---

## オンライン編集（Quarto Editor PE）

ローカルに Quarto を入れなくても、ブラウザから OKF 概念ファイルを編集・コミットできます。[Quarto Editor PE](https://quarto-editor-pe.vercel.app/editor) が GitHub OAuth でリポジトリに直接アクセスするため、エディタ上での保存がそのまま GitHub へのコミットになり、GitHub Actions が自動レンダリング・デプロイまで行います。

- 公開サイトの[オンライン編集室](https://okf-seedling.pages.dev/editor.html)
- 手順の詳細: [4. Online Editor で育てる](https://okf-seedling.pages.dev/tutorial/04-online-editor.html)
- concept 雛形への深層リンクをローカルで生成:

```bash
node tools/editor-link.mjs YOURNAME/my-knowledge-bundle
```

---

## Concept 型（一覧）

- API Overview — API 全体の概要
- API Endpoint — 単一エンドポイントの仕様
- API Schema — 入出力の型・JSON スキーマ
- Playbook — 手順書・対処手順
- Metric — 指標の定義
- Attested Computation — 検証可能な計算定義

---

## ドキュメントと学習順序

まずは以下を順に読むと全体像が掴みやすいです（公開サイト上のチュートリアル）:

1. 0. What is OKF — OKF・バンドル・用語の基礎
2. 1. Create a Bundle — 実際に作ってみる
3. 2. Concept Types — 型の書き方
4. 3. Deploy — 公開する
5. 4. Online Editor — ブラウザで育てる
6. OKF × RAG Synergy — 実バンドル例つきの解説
7. Vision — 「育苗箱」に込めた思い

（各ページへのリンクとチュートリアルは公開サイトにあります）

開発メモ: DEV-MEMO を参照してください。

---

## リポジトリ構成（主なファイル・ディレクトリ）

- _quarto.yml
- index.qmd
- concepts/ — 概念ごとの `.qmd` や生成物
- okf/ — 機械用 OKF バンドル出力
- tools/ — 検証ツール等 (`tools/validate-okf.mjs` 等)
- pipeline/ — 学習パイプライン関連
- tutorial/ — チュートリアル用コンテンツ
- DEV-MEMO.md, LICENSE, README_en.md

---

## コントリビューション

コントリビューションは歓迎します。大きな変更は事前に issue を立ててください。

基本的なワークフロー:

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/your-feature`)
3. 変更をコミット (`git commit -m 'Add your change'`)
4. ブランチをプッシュし、Pull Request を作成

詳細はリポジトリの Issue ページを参照してください。

---

## 連絡先 / 公開サイト

- GitHub: https://github.com/watanabe3tipapa/okf-seedling
- 公開サイト (GitHub Pages): https://watanabe3tipapa.github.io/okf-seedling/
- 公開サイト (Cloudflare Pages): https://okf-seedling.pages.dev/

---

## ライセンス

MIT ライセンス — 詳細は LICENSE ファイルを参照してください。

---

## 開発・保守状態

- リポジトリはアーカイブされていません。
- 最終更新: 2026-08-13 (リポジトリ情報に基づく)
