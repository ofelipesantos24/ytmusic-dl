FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl ffmpeg nodejs npm \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install -U yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
