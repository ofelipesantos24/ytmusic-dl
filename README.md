# 🎵 YTMusic DL — Baixador de Músicas do YouTube para iPhone

Interface PWA com visual iOS para baixar músicas do YouTube via backend Node.js.

---

## 📦 Requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 18+ |
| Python 3 | 3.8+ |
| yt-dlp | latest |
| ffmpeg | qualquer |

---

## 🚀 Instalação

### 1. Instale o yt-dlp e ffmpeg

**macOS (Homebrew):**
```bash
brew install yt-dlp ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install ffmpeg -y
pip3 install -U yt-dlp
```

**Windows:**
```bash
# Instale o ffmpeg: https://ffmpeg.org/download.html
pip install yt-dlp
```

### 2. Instale as dependências Node.js
```bash
cd ytmusic-dl
npm install
```

### 3. Inicie o servidor
```bash
npm start
```

O servidor roda em **http://localhost:3000**

---

## 📱 Acessar pelo iPhone

### Na mesma rede Wi-Fi:

1. Descubra o IP da sua máquina:
   - **macOS/Linux:** `ifconfig | grep "inet " | grep -v 127`
   - **Windows:** `ipconfig` → procure "Endereço IPv4"

2. No Safari do iPhone, acesse:
   ```
   http://192.168.X.X:3000
   ```
   (substitua pelo IP real da sua máquina)

3. **Adicionar à Tela Inicial (PWA):**
   - Toque no ícone de compartilhar (□↑)
   - Selecione "Adicionar à Tela de Início"
   - O app terá visual nativo iOS!

### Onde o arquivo fica no iPhone?
- Safari salva automaticamente em **Arquivos → Downloads**
- Você pode mover para a Música ou abrir no app que preferir

---

## ⚙️ Configuração avançada

### Porta personalizada
```bash
PORT=8080 npm start
```

### HTTPS (necessário para clipboard API funcionar)
Use o Caddy ou nginx como proxy reverso, ou um serviço como ngrok para expor com HTTPS:
```bash
ngrok http 3000
```
Isso gera um link `https://xxxx.ngrok.io` — acesse do iPhone!

---

## 📁 Estrutura do projeto

```
ytmusic-dl/
├── server.js          ← Backend Express + yt-dlp
├── package.json
├── downloads/         ← Arquivos temporários (auto-limpeza em 1h)
└── public/
    ├── index.html     ← Frontend iOS PWA
    └── manifest.json  ← Configuração do PWA
```

---

## 🔒 Segurança

- Rate limiting: 10 downloads por IP a cada 15 minutos
- Validação de URL (apenas YouTube)
- Sanitização de nomes de arquivo
- Limpeza automática de arquivos temporários (1 hora)
- Apenas formatos permitidos: mp3, m4a, opus, wav, mp4

---

## ❓ Problemas comuns

**"yt-dlp não encontrado"**
```bash
pip3 install yt-dlp
# ou
sudo pip3 install yt-dlp
```

**"ffmpeg não encontrado" (erro na conversão MP3)**
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

**Não consigo acessar pelo iPhone**
- Verifique se o PC e iPhone estão na mesma rede Wi-Fi
- Desative o firewall temporariamente ou libere a porta 3000
- Confirme o IP correto com `ifconfig`

**O Safari não oferece salvar o arquivo**
- Certifique-se de usar o Safari (não Chrome iOS) para melhor suporte a downloads
- Vá em Configurações → Safari → Downloads → selecione "iPhone" ou "iCloud Drive"

---

## ⚠️ Aviso Legal

Este projeto é para uso pessoal e educacional. Respeite os Termos de Serviço do YouTube e os direitos autorais dos artistas. Baixe apenas conteúdo que você tem permissão para usar.
