# Ekydum Server

Free media server

## Features:

- Server accounts management
- YouTube library management
- HLS CORS proxy (m3u8 manifest, segment)

## Requirements

- Docker & Docker Compose

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

Run a Ekydum client to connect to the server using your server URL and the admin token.

## Development

Create `docker-compose.override.yml` from example.
Edit code...
Restart the `app` service

See [API_EXAMPLES.md](API_EXAMPLES.md)

## Architecture

- Node.js / Express.js
- PostgreSQL / Sequelize
- Redis / ioredis
- yt-dlp
