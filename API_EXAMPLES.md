# API Usage Examples

## Setup

Generate admin token:
```bash
node generate-token.js
```

## Admin Operations

### Create Account
```bash
curl -X POST http://localhost:3000/admin/accounts \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}'
```

Response:
```json
{
  "id": "uuid",
  "name": "Test User",
  "token": "account-token-uuid",
  "created_at": "2025-10-30T..."
}
```

### List All Accounts
```bash
curl http://localhost:3000/admin/accounts \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

### Get Account
```bash
curl http://localhost:3000/admin/accounts/{id} \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

### Update Account
```bash
curl -X PUT http://localhost:3000/admin/accounts/{id} \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'
```

### Delete Account
```bash
curl -X DELETE http://localhost:3000/admin/accounts/{id} \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

## User Operations

Save your account token from account creation response.

### Get My Info
```bash
curl http://localhost:3000/me \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Search Channels
```bash
curl -X POST http://localhost:3000/channels/search \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"q": "kurzgesagt"}'
```

### Get Channel Info
```bash
curl http://localhost:3000/channels/UC_CHANNEL_ID \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Get Channel Videos
```bash
curl "http://localhost:3000/channels/UC_CHANNEL_ID/videos?page=1&page_size=40" \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Subscribe to Channel
```bash
curl -X POST http://localhost:3000/subscriptions \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"yt_channel_id": "UC_CHANNEL_ID"}'
```

### List Subscriptions
```bash
curl http://localhost:3000/subscriptions \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Unsubscribe
```bash
curl -X DELETE http://localhost:3000/subscriptions/{subscription_id} \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Get Video Info
```bash
curl http://localhost:3000/videos/VIDEO_ID \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Get Video Stream URL
```bash
curl http://localhost:3000/videos/VIDEO_ID/stream \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

With custom quality:
```bash
curl "http://localhost:3000/videos/VIDEO_ID/stream?quality=1080p" \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Get Settings
```bash
curl http://localhost:3000/settings \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN"
```

### Update Setting
```bash
curl -X PUT http://localhost:3000/settings/DEFAULT_QUALITY \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "1080p"}'
```

```bash
curl -X PUT http://localhost:3000/settings/PAGE_SIZE \
  -H "x-account-token: YOUR_ACCOUNT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": 50}'
```

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "db": "ok",
  "cache": "ok"
}
```
