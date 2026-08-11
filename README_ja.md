# okf-seedling

**OKF v0.2 準拠の知識バンドル**を、エージェントにも人間にも読める形で執筆・レンダリング・検証・公開する Quarto テンプレートツールです。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/okf-seedling/)
[![GitHub](https://img.shields.io/github/issues/watanabe3tipapa/okf-seedling.svg)](https://github.com/watanabe3tipapa/okf-seedling/issues)

[English](README.md) | [日本語](README_ja.md)

## 特徴

- エージェントにも人間にも読める `.qmd` を単一の source of truth として執筆
- `quarto use template` の 1 コマンドで知識バンドルの雛形を生成
- 1 source から二系統出力: **人間用 HTML** と **機械用 OKF バンドル**(`okf/` の `index.md` / `log.md` / `concepts/*.md`)

- concept 単位で知識を構成 — API / Playbook / Metric / Attested Computation(1 ファイル 1 概念)
- レジストリ駆動の検証: `tools/okf-types.json` を source of truth とし、スキーマ生成・必須 frontmatter / provenance / 見出しチェック・リンク解決検証を駆動
- GitHub Pages / Cloudflare Pages への並行デプロイ
- 任意の Playwright ベース学習パイプラインで、レンダリング HTML を concept 単位の構造化 JSON に抽出

## インストール

```bash
# テンプレートから新しい知識バンドルを生成
quarto use template watanabe3tipapa/okf-seedling
```

## 使い方

```bash
# 人間用 HTML(_site/)と機械用 OKF バンドル(okf/)を両方レンダリング
quarto render

# 生成されたスキーマがレジストリと同期しているか確認
node tools/gen-schema.mjs --check

# OKF バンドルをバージョン規則に対して検証
node tools/validate-okf.mjs

# (任意)レンダリング HTML から concept 単位で学習
cd pipeline && npm install && npm run learn
```

詳細は[チュートリアル](/tutorial/01-create-bundle.qmd)と [DEV-MEMO](DEV-MEMO.md) を参照してください。

## Concept 型

| 型 | 用途 |
|----|------|
| API Overview | API 全体の概要(認証・バージョン・エラー) |
| API Endpoint | 1 エンドポイントの仕様 |
| API Schema | 入出力の型・JSON スキーマ |
| Playbook | 手順書・対処手順 |
| Metric | 指標の定義 |
| Attested Computation | 検証可能な計算定義 |

## コントリビューション

コントリビューションは大歓迎です。大きな変更を進める前に、まず [issue](https://github.com/watanabe3tipapa/okf-seedling/issues) を開いて内容を共有してください。

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 連絡先

GitHub: [https://github.com/watanabe3tipapa/okf-seedling](https://github.com/watanabe3tipapa/okf-seedling)

公開サイト: [https://watanabe3tipapa.github.io/okf-seedling/](https://watanabe3tipapa.github.io/okf-seedling/)

## ライセンス

MITライセンス — 詳細は [LICENSE](LICENSE) ファイルを参照してください。