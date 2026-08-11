---
type: APIOverview
title: "MyService API"
description: MyService の基本仕様(認証・バージョン・エラー形式など)
resource: https://example.com/api
tags: [api, myservice]
status: stable
generated: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
verified: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
stale_after: 2026-12-31
sources:
  - id: swagger
    resource: https://example.com/openapi.json
    title: OpenAPI 定義
---
# Base URL

`https://example.com`

# Versioning

`v1`。破壊的変更はメジャーアップグレードで行う。

# Authentication

- リクエストヘッダ `Authorization: Bearer <token>` で認証する。
- トークン発行は `POST /v1/auth/token` を参照。

# Common Errors

| Status | Meaning |
|--------|---------|
| 400 | Bad Request(バリデーションエラー) |
| 401 | Unauthorized(トークン欠落・失効) |
| 404 | Not Found(リソース不存在) |
| 429 | Too Many Requests(レート制限) |
| 500 | Internal Server Error |

共通スキーマは [API Overview の各エンドポイント](api-endpoint.md) と共有する。[^swagger]

[^swagger]: OpenAPI 定義

