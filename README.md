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

## Optional: yt-dlp cookies for YouTube/Google challenges

If anonymous `yt-dlp` extraction becomes unreliable, the server can pass a Netscape-format cookies file to `yt-dlp`.

1. Put a cookies file on disk, for example `./secrets/youtube.cookies.txt`
2. Mount it into the container, for example in `docker-compose.override.yml`:
```yml
services:
  app:
    volumes:
      - ./secrets/youtube.cookies.txt:/run/secrets/youtube.cookies.txt:ro
```
3. Set the env var in `.env`:
```bash
YT_DLP_COOKIES_FILE="/run/secrets/youtube.cookies.txt"
```

If `YT_DLP_COOKIES_FILE` is unset, the server continues to use anonymous extraction.

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
