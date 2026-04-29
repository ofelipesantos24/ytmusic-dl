FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl ffmpeg nodejs npm unzip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install -U yt-dlp

WORKDIR /app
COPY ytmusic-dl.zip .
RUN unzip ytmusic-dl.zip && rm ytmusic-dl.zip

RUN if [ -f package.json ]; then npm install; fi

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
