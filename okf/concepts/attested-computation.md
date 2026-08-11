---
type: AttestedComputation
title: "Revenue for fiscal year"
description: 特定会計年度の認識済み売上(Finance の定義に準拠)
tags: [finance, revenue]
status: stable
runtime: bigquery
parameters:
  - { name: year, type: integer, required: true }
executor:
  resource: references/skills/run-on-bq.md
  receipt: [job_id, executed_sql, result]
attester:
  resource: references/attesters/sql-equality.py
generated: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
verified: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
stale_after: 2026-12-31
sources:
  - id: rev-policy
    resource: https://wiki.example/finance/revenue-recognition
    title: 売上認識ポリシー
---
# Computation

```sql
SELECT SUM(amount) AS revenue
FROM finance.recognized_revenue
WHERE fiscal_year = @year
```

この計算は宣言された `parameters` のみをバインドし、売上認識ポリシーに従う。[^rev-policy]

[^rev-policy]: 売上認識ポリシー
