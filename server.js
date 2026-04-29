const express = require('express');
const cors = require('cors');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

// Garante que a pasta de downloads existe
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting: max 10 downloads por IP a cada 15 min
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});
app.use('/api/', limiter);

// ─── Utilitários ───────────────────────────────────────────────────────────────

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9áéíóúàèìòùâêîôûãõäëïöüç \-_]/gi, '').trim().slice(0, 100);
}

function isValidYoutubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w\-]{11}/.test(url);
}

function getYtDlpPath() {
  try { execSync('yt-dlp --version', { stdio: 'ignore' }); return 'yt-dlp'; } catch {}
  try { execSync('python3 -m yt_dlp --version', { stdio: 'ignore' }); return 'python3 -m yt_dlp'; } catch {}
  throw new Error('yt-dlp não encontrado. Instale com: pip3 install yt-dlp');
}

// ─── Rota: informações do vídeo ────────────────────────────────────────────────

app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  if (!url || !isValidYoutubeUrl(url)) {
    return res.status(400).json({ error: 'URL do YouTube inválida.' });
  }

  try {
    const ytdlp = getYtDlpPath();
    const args = ['--dump-json', '--no-playlist', url];
    const cmd = ytdlp === 'yt-dlp' ? 'yt-dlp' : 'python3';
    const cmdArgs = ytdlp === 'yt-dlp' ? args : ['-m', 'yt_dlp', ...args];

    let output = '';
    let errOutput = '';
    const proc = spawn(cmd, cmdArgs);

    proc.stdout.on('data', d => output += d.toString());
    proc.stderr.on('data', d => errOutput += d.toString());

    proc.on('close', code => {
      if (code !== 0) {
        console.error('yt-dlp info error:', errOutput);
        return res.status(500).json({ error: 'Não foi possível obter informações do vídeo.' });
      }
      try {
        const info = JSON.parse(output);
        res.json({
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          channel: info.channel || info.uploader,
          viewCount: info.view_count,
        });
      } catch {
        res.status(500).json({ error: 'Erro ao processar informações do vídeo.' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Rota: download ────────────────────────────────────────────────────────────

app.get('/api/download', async (req, res) => {
  const { url, format = 'mp3', quality = '320' } = req.query;

  if (!url || !isValidYoutubeUrl(url)) {
    return res.status(400).json({ error: 'URL do YouTube inválida.' });
  }

  const allowedFormats = ['mp3', 'mp4', 'm4a', 'opus', 'wav'];
  const allowedQualities = ['320', '256', '192', '128'];
  if (!allowedFormats.includes(format)) return res.status(400).json({ error: 'Formato inválido.' });
  if (format !== 'mp4' && !allowedQualities.includes(quality)) {
    return res.status(400).json({ error: 'Qualidade inválida.' });
  }

  try {
    const ytdlp = getYtDlpPath();
    const timestamp = Date.now();
    const outputTemplate = path.join(DOWNLOADS_DIR, `${timestamp}_%(title)s.%(ext)s`);

    // Monta os argumentos conforme o formato
    let args;
    if (format === 'mp4') {
      args = [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', outputTemplate,
        '--no-playlist',
        url
      ];
    } else {
      args = [
        '-x',
        '--audio-format', format,
        '--audio-quality', format === 'mp3' || format === 'wav' ? `${quality}K` : '0',
        '-o', outputTemplate,
        '--no-playlist',
        url
      ];
    }

    const cmd = ytdlp === 'yt-dlp' ? 'yt-dlp' : 'python3';
    const cmdArgs = ytdlp === 'yt-dlp' ? args : ['-m', 'yt_dlp', ...args];

    let errOutput = '';
    const proc = spawn(cmd, cmdArgs);
    proc.stderr.on('data', d => errOutput += d.toString());

    proc.on('close', code => {
      if (code !== 0) {
        console.error('yt-dlp download error:', errOutput);
        return res.status(500).json({ error: 'Erro no download. O vídeo pode estar indisponível.' });
      }

      // Encontra o arquivo gerado
      const files = fs.readdirSync(DOWNLOADS_DIR)
        .filter(f => f.startsWith(`${timestamp}_`))
        .map(f => path.join(DOWNLOADS_DIR, f));

      if (!files.length) {
        return res.status(500).json({ error: 'Arquivo não encontrado após download.' });
      }

      const filePath = files[0];
      const fileName = sanitizeFilename(path.basename(filePath));
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.opus': 'audio/ogg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
      };

      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      // Limpa o arquivo após envio
      stream.on('end', () => {
        fs.unlink(filePath, () => {});
      });
      res.on('close', () => {
        fs.unlink(filePath, () => {});
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Limpeza automática de arquivos antigos (a cada hora) ──────────────────────

setInterval(() => {
  const now = Date.now();
  fs.readdir(DOWNLOADS_DIR, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(DOWNLOADS_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && now - stats.mtimeMs > 60 * 60 * 1000) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 60 * 60 * 1000);

// ─── Inicia o servidor ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎵 YTMusic DL rodando em http://localhost:${PORT}`);
  console.log(`📱 Acesse pelo iPhone na mesma rede WiFi`);
  console.log(`\nPara descobrir o IP da sua máquina:`);
  console.log(`  macOS/Linux: ifconfig | grep "inet "`);
  console.log(`  Windows:     ipconfig\n`);
});
