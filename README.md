# ekydum-server

YouTube proxy server using yt-dlp.

## Requirements

- Docker & Docker Compose
- Admin token (min 128 characters)

## Quick Start

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Generate admin token (128+ chars):
```bash
node generate-token.js
```

3. Update `.env` with generated token

4. Start services:
```bash
docker-compose up -d
```

4. Server runs at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Check service status

### Admin Endpoints (requires `x-admin-token` header)

**Account Management:**
- `POST /admin/accounts` - Create account `{ name }`
- `GET /admin/accounts` - List all accounts
- `GET /admin/accounts/:id` - Get account by ID
- `PUT /admin/accounts/:id` - Update account `{ name }`
- `DELETE /admin/accounts/:id` - Delete account

### User Endpoints (requires `x-account-token` header)

**Account Info:**
- `GET /me` - Get current account info (without token)

**Channels:**
- `POST /channels/search` - Search channels `{ q: string }`
- `GET /channels/:yt_channel_id` - Get channel info
- `GET /channels/:yt_channel_id/videos?page=1&page_size=40` - Get channel videos

**Videos:**
- `GET /videos/:yt_video_id` - Get video info
- `GET /videos/:yt_video_id/stream?quality=720p` - Get stream URL

**Subscriptions:**
- `POST /subscriptions` - Subscribe `{ yt_channel_id }`
- `GET /subscriptions` - List subscriptions
- `DELETE /subscriptions/:id` - Unsubscribe

**Settings:**
- `GET /settings` - Get all settings
- `PUT /settings/:key` - Update setting `{ value }`

**Available Settings:**
- `DEFAULT_QUALITY`: min, 360p, 480p, 720p (default), 1080p, 2k, 4k, max
- `PAGE_SIZE`: 10, 20, 30, 40 (default), 50, 100, 200, 300, 500

## Database

PostgreSQL 17 with Sequelize migrations (auto-run on startup).

**Migrations:**
- `20250101000001-create-accounts.js` - Creates accounts table
- `20250101000002-create-subscriptions.js` - Creates subscriptions table
- `20250101000003-create-settings.js` - Creates settings table

Migrations are automatically executed when the server starts using Umzug.

**Tables:**
- `accounts` - User accounts with tokens
- `subscriptions` - Channel subscriptions per account
- `settings` - User settings per account

## Cache

Redis 7.4 for caching yt-dlp results:
- Channel info: 1 hour
- Channel videos: 30 minutes
- Search results: 1 hour
- Video URLs: 6 hours
- Video info: 1 hour

## Development

Local development with hot reload:
```bash
npm install
npm run dev
```

## Architecture

- Express.js 4.21
- Sequelize ORM
- ioredis client
- Joi validation
- yt-dlp for YouTube data
