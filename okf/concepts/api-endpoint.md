---
type: APIEndpoint
title: "Get User"
description: ユーザー情報を取得する。
resource: https://example.com/api/v1/users/{userId}
method: GET
path: /v1/users/{userId}
tags: [read, users]
status: stable
generated: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
verified: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
stale_after: 2026-12-31
---
# Summary

ユーザーID からユーザー情報を取得する。

# Path Params

- `userId` (string, required): ユーザーID。

# Query Params

- なし。

# Headers

- `Authorization: Bearer <token>`

# Responses

- 200: OK
  - schema: [UserResponse](api-schema.md)
- 404: Not Found
- 429: Too Many Requests

# Examples

### Request

```
GET /v1/users/123
```

### Response (200)

```json
{ "id": "123", "name": "Taro" }
```

