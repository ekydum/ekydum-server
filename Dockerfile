FROM node:22-alpine

RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install --no-cache-dir yt-dlp --break-system-packages

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
