const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from src directory
app.use(express.static(path.join(__dirname, 'src')));

// API endpoint to list music files with metadata from playlist.json
app.get('/api/music', (req, res) => {
  const musicDir = path.join(__dirname, 'src', 'assets', 'music');
  const configPath = path.join(musicDir, 'playlist.json');
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) { config = []; }
  try {
    const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];
    const files = fs.readdirSync(musicDir).filter(f => audioExts.includes(path.extname(f).toLowerCase()));
    const result = files.map(f => {
      const cfg = config.find(c => c.file === f);
      const basename = path.basename(f, path.extname(f));
      const coverFile = cfg && cfg.cover ? cfg.cover : null;
      const coverExt = coverFile ? path.extname(coverFile).toLowerCase() : '';
      const validCover = ['.jpg', '.jpeg', '.png'].includes(coverExt);
      return {
        name: cfg && cfg.title ? cfg.title : basename,
        file: f,
        path: `assets/music/${f}`,
        cover: coverFile && validCover ? `assets/music/${coverFile}` : null
      };
    });
    res.json(result);
  } catch (e) {
    res.json([]);
  }
});

// Serve index.html for all routes (SPA routing)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});