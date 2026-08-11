---
type: Playbook
title: "インシデント対応(データ鮮度アラート)"
description: orders パイプラインの鮮度アラートを切り分ける手順。
tags: [oncall, incident]
status: stable
generated: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
verified: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
stale_after: 2026-12-31
---
# Trigger

鮮度アラートは `orders` が期待 SLA から 30 分以上遅延したときに発火する。

# Steps

1. ingestion job のダッシュボードを確認する。
2. 失敗ジョブがあれば再実行を依頼する。
3. 復旧後、SLA メトリクスが正常に戻ったことを確認する。
4. 原因を bundle の `log.md`(okf/log.md)に追記する。

