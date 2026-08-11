---
type: APISchema
title: "UserResponse"
description: Get User のレスポンスボディ
resource: https://example.com/api/schema/user-response
tags: [schema, users]
status: stable
generated: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
verified: { by: human:okf-seedling, at: 2026-08-11T00:00:00Z }
stale_after: 2026-12-31
---
# Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | ユーザーID |
| `name` | string | yes | 表示名 |
| `email` | string | no | メールアドレス |

# JSON Example

```json
{
  "id": "123",
  "name": "Taro",
  "email": "taro@example.com"
}
```

