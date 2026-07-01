// ─── PAGE LOADER ─────────────────────────────────────────────────────
window.addEventListener('load', () => {
  document.getElementById('loader').classList.add('hide');
});

// ─── STATE ───────────────────────────────────────────────────────────
let audioCtx, analyser, dataArray, bufferLength;
let isAudioReady = false;
let animFrame;
let simFrame = 0;
let simBeat = 0;
let simBpm = 120;
let beatHistory = [];
let layerVisible = [true,true,true,true,true,true,true,true,true];
let globalAmp = 0;
let globalBass = 0;

// ─── MUSIC PLAYER ─────────────────────────────────────────────────────
const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playerSong = document.getElementById('playerSong');
const playerCover = document.getElementById('playerCover');
let playlist = [];
let currentTrack = 0;
let isPlaying = false;

async function loadPlaylist() {
  try {
    const res = await fetch('/api/music');
    playlist = await res.json();
    if (playlist.length > 0) loadTrack(0);
  } catch (e) {
    playerSong.textContent = window.i18n ? window.i18n.translate('player-no-files') : 'SIN ARCHIVOS';
  }
}

function loadTrack(index) {
  if (playlist.length === 0) return;
  currentTrack = index;
  const track = playlist[index];
  audioPlayer.src = track.path;
  playerSong.textContent = track.name;
  if (track.cover) {
    const img = document.createElement('img');
    img.src = track.cover;
    img.alt = track.name;
    img.loading = 'lazy';
    playerCover.innerHTML = '';
    playerCover.appendChild(img);
  } else {
    playerCover.innerHTML = '';
  }
}

playBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (isPlaying) {
    audioPlayer.pause();
    playBtn.textContent = '▶';
  } else {
    initAudioAnalyser();
    resumeAudioCtx();
    audioPlayer.play();
    playBtn.textContent = '⏸';
  }
  isPlaying = !isPlaying;
});

prevBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  const prev = (currentTrack - 1 + playlist.length) % playlist.length;
  loadTrack(prev);
  if (isPlaying) { initAudioAnalyser(); resumeAudioCtx(); audioPlayer.play(); playBtn.textContent = '⏸'; }
  else { playBtn.textContent = '▶'; }
});

nextBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  const next = (currentTrack + 1) % playlist.length;
  loadTrack(next);
  if (isPlaying) { initAudioAnalyser(); resumeAudioCtx(); audioPlayer.play(); playBtn.textContent = '⏸'; }
  else { playBtn.textContent = '▶'; }
});

// ─── VOLUME CONTROL ──────────────────────────────────────────────────
const volBtn = document.getElementById('volBtn');
const volSlider = document.getElementById('volSlider');
const volRange = document.getElementById('volRange');
let volOpen = false;
audioPlayer.volume = 0.3;
volBtn.textContent = '🔉';

volBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  volOpen = !volOpen;
  volSlider.classList.toggle('open', volOpen);
});

volRange.addEventListener('input', () => {
  const v = volRange.value;
  audioPlayer.volume = v;
  volBtn.textContent = v === '0' ? '🔇' : v < 0.5 ? '🔉' : '🔊';
});

document.addEventListener('click', (e) => {
  if (volOpen && !e.target.closest('.volume-wrap')) {
    volOpen = false;
    volSlider.classList.remove('open');
  }
});

audioPlayer.addEventListener('ended', () => {
  const next = (currentTrack + 1) % playlist.length;
  loadTrack(next);
  initAudioAnalyser();
  resumeAudioCtx();
  audioPlayer.play();
});

loadPlaylist();

// ─── AUTOPLAY ─────────────────────────────────────────────────────────
function tryAutoplay() {
  if (playlist.length === 0) return;
  initAudioAnalyser();
  resumeAudioCtx();
  audioPlayer.play().then(() => {
    isPlaying = true;
    playBtn.textContent = '⏸';
  }).catch(() => {
    // autoplay blocked — start on first user click anywhere
    const handler = () => {
      initAudioAnalyser();
      resumeAudioCtx();
      audioPlayer.play().then(() => {
        isPlaying = true;
        playBtn.textContent = '⏸';
      }).catch(() => {});
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
  });
}
tryAutoplay();

// ─── INIT FREQ BARS ──────────────────────────────────────────────────
const freqBarsEl = document.getElementById('freqBars');
const NUM_BARS = 32;
let freqBarEls = [];
for (let i = 0; i < NUM_BARS; i++) {
  const b = document.createElement('div');
  b.className = 'freq-bar';
  freqBarsEl.appendChild(b);
  freqBarEls.push(b);
}

// ─── AUDIO ANALYSER (connected to music player) ──────────────────────
function initAudioAnalyser() {
  if (isAudioReady) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  const source = audioCtx.createMediaElementSource(audioPlayer);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  isAudioReady = true;
}

function resumeAudioCtx() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function getAudioData() {
  if (isAudioReady && analyser) {
    analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
  // Fallback: silence until music plays
  const sim = new Uint8Array(1024);
  simFrame++;
  simBeat += simBpm / 60 / 60;
  const beat = (Math.sin(simBeat * Math.PI * 2) + 1) / 2;
  const kick = beat > 0.85 ? 1 : 0;
  if (kick > 0 && (beatHistory.length === 0 || simFrame - beatHistory[beatHistory.length-1] > 20)) {
    beatHistory.push(simFrame);
    if (beatHistory.length > 8) beatHistory.shift();
  }
  for (let i = 0; i < 1024; i++) {
    const f = i / 1024;
    const bass = i < 80 ? (kick * 180 + Math.random() * 40) : 0;
    const wave = Math.sin(simFrame * 0.04 + i * 0.15) * 80 + 80;
    const noise = Math.random() * 30;
    sim[i] = Math.min(255, Math.round(bass + wave * (1-f) + noise));
  }
  if (simFrame % 180 === 0) simBpm = [90,100,110,120,128,140][Math.floor(Math.random()*6)];
  return sim;
}

function calcBPM() {
  if (beatHistory.length < 2) return simBpm;
  const gaps = [];
  for (let i = 1; i < beatHistory.length; i++) gaps.push(beatHistory[i] - beatHistory[i-1]);
  const avg = gaps.reduce((a,b)=>a+b,0)/gaps.length;
  return Math.round(60 / (avg / 60));
}

// ─── HERO CANVAS ─────────────────────────────────────────────────────
const heroCanvas = document.getElementById('hero-canvas');
const hctx = heroCanvas.getContext('2d');
const heroImg = new Image();
heroImg.src = 'assets/edifico.png';
const heroImgRed = new Image();
heroImgRed.src = 'assets/edifico_red.png';
// ponytail: building color cycle — 5s normal, 3s fade, 5s red, 3s fade, loop
let buildingCycleStart = performance.now();

function resizeHero() {
  heroCanvas.width = heroCanvas.offsetWidth;
  heroCanvas.height = heroCanvas.offsetHeight;
}
resizeHero();
window.addEventListener('resize', () => { resizeHero(); resizeBuilding(); resizeWave(); resizeMF(); });

function resizeMF() {
  if (!mfCanvas) return;
  const fl = mfFloors[mfIndex];
  const skillCount = (fl && fl.isData && fl.skills) ? fl.skills.length : 0;
  const neededH = 120 + skillCount * 30;
  mfCanvas.style.height = Math.max(220, Math.min(500, neededH)) + 'px';
  mfCanvas.width = mfCanvas.offsetWidth;
  mfCanvas.height = mfCanvas.offsetHeight;
  drawMobileFloor();
}

let heroFrame = 0;
function drawHero(data) {
  heroFrame++;
  const w = heroCanvas.width, h = heroCanvas.height;
  hctx.fillStyle = 'rgba(8,8,8,0.25)';
  hctx.fillRect(0, 0, w, h);

  // Code rain
  hctx.font = '11px IBM Plex Mono, monospace';
  const cols = Math.floor(w / 15);
  const codeChars = '01{}[]<>=;const let async';
  for (let i = 0; i < cols; i++) {
    const y = ((heroFrame * 0.5 + i * 19) % (h + 20));
    const ch = codeChars[(Math.floor(heroFrame * 0.08 + i * 2.7)) % codeChars.length];
    const alpha = 0.05 + (i % 5 === 0 ? 0.07 : 0);
    hctx.fillStyle = i % 4 === 0 ? `rgba(255,45,85,${alpha})` : `rgba(240,240,240,${alpha})`;
    hctx.fillText(ch, i * 15, y);
  }

  // Grid lines
  hctx.strokeStyle = 'rgba(42,42,42,0.4)';
  hctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 60) {
    hctx.beginPath(); hctx.moveTo(x, 0); hctx.lineTo(x, h); hctx.stroke();
  }
  for (let y = 0; y < h; y += 60) {
    hctx.beginPath(); hctx.moveTo(0, y); hctx.lineTo(w, y); hctx.stroke();
  }

  // Sound rings
  const cx = w * 0.75, cy = h * 0.55;
  const amp = globalAmp;
  for (let i = 0; i < 5; i++) {
    const r = ((heroFrame * 2 + i * 60) % 300);
    const a = Math.max(0, (1 - r/300) * 0.3 * (0.3 + amp * 0.7));
    hctx.strokeStyle = i%2===0 ? `rgba(255,45,85,${a})` : `rgba(0,212,255,${a})`;
    hctx.lineWidth = 1.5;
    hctx.beginPath();
    hctx.ellipse(cx, cy, r * 1.4, r * 0.4, 0, 0, Math.PI * 2);
    hctx.stroke();
  }

  document.getElementById('hFreq').textContent = isAudioReady ? Math.round(440 + globalAmp * 300) + 'hz' : '—';
  document.getElementById('hBpm').textContent = isAudioReady ? calcBPM() : '—';

  // Overlay building image with color cycle
  if (heroImg.complete && heroImg.naturalWidth > 0 && window.innerWidth > 480) {
    const imgW = Math.min(w * 0.41, 450);
    const imgH = imgW * (heroImg.naturalHeight / heroImg.naturalWidth);
    const ix = (w - imgW) * 0.82;
    const iy = h - imgH - 2;

    const elapsed = (performance.now() - buildingCycleStart) % 16000;
    if (elapsed < 5000) {
      hctx.drawImage(heroImg, ix, iy, imgW, imgH);
    } else if (elapsed < 8000) {
      const a = (elapsed - 5000) / 3000;
      hctx.drawImage(heroImg, ix, iy, imgW, imgH);
      if (heroImgRed.complete && heroImgRed.naturalWidth > 0) {
        hctx.globalAlpha = a;
        hctx.drawImage(heroImgRed, ix, iy, imgW, imgH);
        hctx.globalAlpha = 1;
      }
    } else if (elapsed < 13000) {
      if (heroImgRed.complete && heroImgRed.naturalWidth > 0) {
        hctx.drawImage(heroImgRed, ix, iy, imgW, imgH);
      } else {
        hctx.drawImage(heroImg, ix, iy, imgW, imgH);
      }
    } else {
      const a = 1 - (elapsed - 13000) / 3000;
      hctx.drawImage(heroImg, ix, iy, imgW, imgH);
      if (heroImgRed.complete && heroImgRed.naturalWidth > 0) {
        hctx.globalAlpha = a;
        hctx.drawImage(heroImgRed, ix, iy, imgW, imgH);
        hctx.globalAlpha = 1;
      }
    }
  }
}

// ─── BUILDING CANVAS ─────────────────────────────────────────────────
const buildingCanvas = document.getElementById('building-canvas');
const bctx = buildingCanvas.getContext('2d');

function resizeBuilding() {
  buildingCanvas.width = buildingCanvas.offsetWidth;
  buildingCanvas.height = buildingCanvas.offsetHeight || 1000;
}
resizeBuilding();

const FLOORS = [
  {
    name: 'FRONTEND',
    widthRatio: 0.42, h: 150,
    col: '#1a1a1a', tc: '#ff2d55', accent: '#ff2d55',
    isData: true,
    skills: [
      ['React','Avanzado'],['TypeScript','Avanzado'],['JavaScript','Experto'],
      ['Angular','Basico'],['Tailwind','Intermedio'],['CSS3','Avanzado'],['HTML5','Avanzado'],
    ],
  },
  {
    name: 'FOUNDATION',
    widthRatio: 0.68, h: 30,
    col: '#222', tc: '#f0f0f0', accent: '#f0f0f0',
    isData: false, skills: [],
    freq: 0.05, wins: 8,
  },
  {
    name: 'BACKEND',
    widthRatio: 0.52, h: 170,
    col: '#111', tc: '#00d4ff', accent: '#00d4ff',
    isData: true,
    skills: [
      ['Java','Avanzado'],['Spring Boot','Intermedio'],['C#','Avanzado'],['.NET','Intermedio'],
      ['Node.js','Avanzado'],['Python','Experto'],['C++','Intermedio'],
      ['REST APIs','Experto'],['JWT / Auth','Intermedio'],
    ],
  },
  {
    name: 'BASS_CORE',
    widthRatio: 0.72, h: 30,
    col: '#222', tc: '#888', accent: '#888',
    isData: false, skills: [],
    freq: 0.30, wins: 9,
  },
  {
    name: 'DATABASES',
    widthRatio: 0.58, h: 130,
    col: '#1c1c1c', tc: '#f0f0f0', accent: '#f0f0f0',
    isData: true,
    skills: [
      ['MySQL','Avanzado'],['SQL Server','Intermedio'],['PostgreSQL','Intermedio'],
      ['MongoDB','Basico'],['SQLite','Intermedio'],['Firebase','Basico'],
    ],
  },
  {
    name: 'MID_RANGE',
    widthRatio: 0.76, h: 30,
    col: '#222', tc: '#ff2d55', accent: '#ff2d55',
    isData: false, skills: [],
    freq: 0.48, wins: 10,
  },
  {
    name: 'AUTOMATION',
    widthRatio: 0.62, h: 95,
    col: '#080808', tc: '#ff2d55', accent: '#ff2d55',
    isData: true,
    skills: [
      ['N8N','Avanzado'],['Webhooks','Avanzado'],
    ],
  },
  {
    name: 'TREBLE',
    widthRatio: 0.80, h: 30,
    col: '#222', tc: '#00d4ff', accent: '#00d4ff',
    isData: false, skills: [],
    freq: 0.85, wins: 11,
  },
  {
    name: 'DEVOPS',
    widthRatio: 0.66, h: 130,
    col: '#1a1a1a', tc: '#00d4ff', accent: '#00d4ff',
    isData: true,
    skills: [
      ['Git','Experto'],['GitHub','Experto'],['CI/CD','Basico'],
      ['Docker','Basico'],['Postman','Avanzado'],['Linux','Intermedio'],
    ],
  },
];

const levelColors = {
  'Basico':    { c: '#666',   dots: 1 },
  'Intermedio':{ c: '#ffd700', dots: 2 },
  'Avanzado':  { c: '#ff2d55', dots: 3 },
  'Experto':   { c: '#00d4ff', dots: 4 },
};

function drawBuildingMain(data) {
  const w = buildingCanvas.width, h = buildingCanvas.height;
  bctx.clearRect(0, 0, w, h);

  bctx.fillStyle = '#080808';
  bctx.fillRect(0, 0, w, h);

  // Background grid
  bctx.strokeStyle = 'rgba(30,30,30,0.8)';
  bctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 40) {
    bctx.beginPath(); bctx.moveTo(x,0); bctx.lineTo(x,h); bctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    bctx.beginPath(); bctx.moveTo(0,y); bctx.lineTo(w,y); bctx.stroke();
  }

  // Sound rings from ground
  const cx = w / 2;
  const groundY = h - 40;
  for (let i = 0; i < 5; i++) {
    const r = ((simFrame * 1.8 + i * 55) % (w * 0.45));
    const a = Math.max(0, (1 - r/(w*0.45)) * 0.25 * (0.2 + globalAmp*0.8));
    bctx.strokeStyle = i%2===0 ? `rgba(255,45,85,${a})` : `rgba(0,212,255,${a})`;
    bctx.lineWidth = 1.5;
    bctx.beginPath();
    bctx.ellipse(cx, groundY, r, r * 0.18, 0, 0, Math.PI*2);
    bctx.stroke();
  }

  // Ground line
  bctx.strokeStyle = '#333';
  bctx.lineWidth = 2;
  bctx.beginPath(); bctx.moveTo(40, groundY); bctx.lineTo(w-40, groundY); bctx.stroke();
  for (let x = 40; x < w-40; x += 18) {
    bctx.strokeStyle = 'rgba(50,50,50,0.5)';
    bctx.lineWidth = 1;
    bctx.beginPath(); bctx.moveTo(x, groundY); bctx.lineTo(x, groundY+15); bctx.stroke();
  }

  // Floors
  let cursor = groundY;

  FLOORS.forEach((fl, i) => {
    if (!layerVisible[i]) { cursor -= fl.h + 2; return; }

    const pulseIdx = Math.floor((i / FLOORS.length) * (data.length * 0.5));
    const rawPulse = (data[pulseIdx] || 0) / 255;
    const pulse = rawPulse * 1.2 + globalAmp * 0.4;

    const offsetY = fl.isData ? Math.sin(simFrame * 0.03 + i * 0.7) * 2 * pulse : 0;
    const flW = w * fl.widthRatio;
    const flX = cx - flW / 2;
    const flY = cursor - fl.h + offsetY;

    if (fl.isData) {
      // ─── Data floor ────────────────────────────────────────────────
      bctx.fillStyle = 'rgba(0,0,0,0.4)';
      bctx.fillRect(flX + 4, flY + 4, flW, fl.h);

      bctx.fillStyle = fl.col;
      bctx.fillRect(flX, flY, flW, fl.h);

      // Texture lines
      bctx.strokeStyle = 'rgba(255,255,255,0.03)';
      bctx.lineWidth = 0.5;
      for (let ly = flY + 14; ly < flY + fl.h - 8; ly += 10) {
        bctx.beginPath(); bctx.moveTo(flX, ly); bctx.lineTo(flX+flW, ly); bctx.stroke();
      }

      // Border
      bctx.strokeStyle = fl.accent;
      bctx.lineWidth = 1;
      bctx.strokeRect(flX, flY, flW, fl.h);

      // Top accent bar (glows with music)
      bctx.fillStyle = `rgba(${fl.accent === '#ff2d55' ? '255,45,85' : fl.accent === '#00d4ff' ? '0,212,255' : '240,240,240'},${0.5 + pulse * 0.5})`;
      bctx.fillRect(flX, flY, flW, 3);

      // Floor name - top left
      bctx.font = '700 16px Space Mono, monospace';
      bctx.fillStyle = fl.accent;
      bctx.textAlign = 'left';
      bctx.fillText(fl.name, flX + 16, flY + 32);

      // Skills — two-column layout with bars
      const pad = 14;
      const colW = (flW - pad * 2) / 2;
      const rowH = 26;
      const colStart = flX + pad;
      const rowStart = flY + 45;

      fl.skills.forEach((skill, si) => {
        const col = si % 2;
        const row = Math.floor(si / 2);
        const sx = colStart + col * colW;
        const sy = rowStart + row * rowH;

        const lvl = levelColors[skill[1]] || { c: '#666', dots: 1 };

        // Row bg tint by level
        bctx.fillStyle = `rgba(${lvl.c === '#ffd700' ? '255,215,0' : lvl.c === '#ff2d55' ? '255,45,85' : lvl.c === '#00d4ff' ? '0,212,255' : '102,102,102'},0.08)`;
        bctx.fillRect(sx, sy - 17, colW - 4, rowH);

        // Skill name
        bctx.font = '700 13px IBM Plex Mono, monospace';
        bctx.fillStyle = '#f0f0f0';
        bctx.fillText(skill[0], sx + 4, sy);

        // Level bar (4 segments)
        const barX = sx + colW * 0.58;
        const barW = colW * 0.38;
        const segW = Math.max(barW / 4 - 2, 4);
        const segH = 8;
        for (let b = 0; b < 4; b++) {
          bctx.fillStyle = b < lvl.dots ? lvl.c : '#2a2a2a';
          bctx.fillRect(barX + b * (segW + 2), sy - 12, segW, segH);
        }
      });

      // Pulse energy bar (right side)
      const barH = Math.round(pulse * (fl.h - 20));
      bctx.fillStyle = `rgba(${fl.accent === '#ff2d55' ? '255,45,85' : fl.accent === '#00d4ff' ? '0,212,255' : '240,240,240'},0.3)`;
      bctx.fillRect(flX + flW - 6, flY + fl.h - 10 - barH, 4, barH);

    } else {
      // ─── Separator floor (reactive to frequency band) ─────────────
      const freqIdx = Math.floor(fl.freq * (data.length - 1));
      const rawPulse = (data[freqIdx] || 0) / 255;
      const sepPulse = Math.min(1, rawPulse * 1.5 + globalAmp * 0.5);

      bctx.fillStyle = 'rgba(0,0,0,0.4)';
      bctx.fillRect(flX + 3, flY + 3, flW, fl.h);

      bctx.fillStyle = fl.col;
      bctx.fillRect(flX, flY, flW, fl.h);

      // Top accent bar that glows with its frequency band
      bctx.fillStyle = `rgba(${fl.accent === '#f0f0f0' ? '240,240,240' : fl.accent === '#888' ? '136,136,136' : fl.accent === '#ff2d55' ? '255,45,85' : '0,212,255'},${0.3 + sepPulse * 0.7})`;
      bctx.fillRect(flX, flY, flW, 3);

      // Border
      bctx.strokeStyle = fl.accent;
      bctx.lineWidth = 0.5;
      bctx.strokeRect(flX, flY, flW, fl.h);

      // Reactive windows
      const winW = 10, winH = fl.h * 0.5;
      const winY = flY + fl.h * 0.25;
      const gap = (flW - fl.wins * winW) / (fl.wins + 1);
      for (let j = 0; j < fl.wins; j++) {
        const wx = flX + gap + j * (winW + gap);
        const brightness = 0.1 + sepPulse * 0.8;
        const wc = `rgba(${fl.accent === '#f0f0f0' ? '240,240,240' : fl.accent === '#888' ? '136,136,136' : fl.accent === '#ff2d55' ? '255,45,85' : '0,212,255'},${brightness})`;
        bctx.fillStyle = wc;
        bctx.fillRect(wx, winY, winW - 2, winH);
      }

      // Center label
      bctx.fillStyle = fl.tc;
      bctx.font = '9px Space Mono, monospace';
      bctx.textAlign = 'center';
      bctx.fillText(fl.name, cx, flY + fl.h - 12);
    }

    cursor = flY;
  });

  // Antenna
  const antennaX = cx + 40;
  const antennaTop = cursor - 60 - globalAmp * 30;
  bctx.strokeStyle = '#555';
  bctx.lineWidth = 2;
  bctx.beginPath(); bctx.moveTo(antennaX, cursor); bctx.lineTo(antennaX, antennaTop); bctx.stroke();
  bctx.fillStyle = globalAmp > 0.6 ? '#ff2d55' : '#333';
  bctx.beginPath(); bctx.arc(antennaX, antennaTop, 5, 0, Math.PI*2); bctx.fill();
  if (globalAmp > 0.5) {
    bctx.strokeStyle = `rgba(255,45,85,${globalAmp * 0.5})`;
    bctx.lineWidth = 1;
    bctx.beginPath(); bctx.arc(antennaX, antennaTop, 12 + globalAmp * 10, 0, Math.PI*2); bctx.stroke();
  }

  // Side freq bars
  const leftX = 40, rightX = w - 40;
  for (let i = 0; i < 7; i++) {
    const barData = (data[Math.floor(i * data.length / 8)] || 0) / 255;
    const barH = Math.round(barData * 120);
    const by2 = groundY - barH;
    bctx.fillStyle = i%2===0 ? `rgba(255,45,85,${0.4+barData*0.4})` : `rgba(0,212,255,${0.3+barData*0.3})`;
    bctx.fillRect(leftX - 16 + i*3, by2, 2, barH);
    bctx.fillRect(rightX + 10 - i*3, by2, 2, barH);
  }
}

// ─── MOBILE FLOOR VIEWER ─────────────────────────────────────────────
const mfCanvas = document.getElementById('mf-canvas');
const mfCtx = mfCanvas && mfCanvas.getContext('2d');
const mfFloorName = document.getElementById('mfFloorName');

let mfIndex = 0;
const mfFloors = FLOORS.filter(f => f.isData);


function drawMobileFloor() {
  if (!mfCtx || window.innerWidth > 768) return;
  const fl = mfFloors[mfIndex];
  if (!fl) return;
  const w = mfCanvas.width, h = mfCanvas.height;

  mfCtx.clearRect(0, 0, w, h);
  mfCtx.fillStyle = '#080808';
  mfCtx.fillRect(0, 0, w, h);

  // Grid
  mfCtx.strokeStyle = 'rgba(30,30,30,0.6)';
  mfCtx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 30) { mfCtx.beginPath(); mfCtx.moveTo(x,0); mfCtx.lineTo(x,h); mfCtx.stroke(); }
  for (let y = 0; y < h; y += 30) { mfCtx.beginPath(); mfCtx.moveTo(0,y); mfCtx.lineTo(w,y); mfCtx.stroke(); }

  const skillCount = (fl.isData && fl.skills) ? fl.skills.length : 0;
  const contentH = 60 + skillCount * 30;
  const flH = Math.min(contentH, h - 40);
  const flW = w * 0.7;
  const flX = (w - flW) / 2;
  const flY = (h - flH) / 2;

  const pulse = 0.3 + globalAmp * 0.7;
  const shake = globalAmp * 6;

  // Sound rings behind floor
  for (let i = 0; i < 5; i++) {
    const r = ((simFrame * 1.8 + i * 55) % (w * 0.5));
    const a = Math.max(0, (1 - r/(w*0.5)) * 0.2 * (0.2 + globalAmp*0.8));
    mfCtx.strokeStyle = i%2===0 ? `rgba(255,45,85,${a})` : `rgba(0,212,255,${a})`;
    mfCtx.lineWidth = 1.5;
    mfCtx.beginPath();
    mfCtx.ellipse(w/2, flY + flH, r, r * 0.18, 0, 0, Math.PI*2);
    mfCtx.stroke();
  }

  // Floor shadow (moves with shake)
  mfCtx.fillStyle = 'rgba(0,0,0,0.5)';
  mfCtx.fillRect(flX + 4 + shake, flY + 4 + shake, flW, flH);

  // Floor bg (vibrates with shake offset)
  mfCtx.fillStyle = fl.col || '#111';
  mfCtx.fillRect(flX + shake * 0.5, flY + shake * 0.3, flW, flH);

  // Texture lines
  mfCtx.strokeStyle = 'rgba(255,255,255,0.04)';
  mfCtx.lineWidth = 0.5;
  for (let ly = flY + 20; ly < flY + flH - 10; ly += 10) {
    mfCtx.beginPath(); mfCtx.moveTo(flX, ly + shake * 0.2); mfCtx.lineTo(flX+flW, ly + shake * 0.2); mfCtx.stroke();
  }

  // Accent bar (pulses with music)
  mfCtx.fillStyle = `rgba(${fl.accent === '#ff2d55' ? '255,45,85' : fl.accent === '#00d4ff' ? '0,212,255' : '240,240,240'},${0.4 + pulse * 0.6})`;
  mfCtx.fillRect(flX + shake * 0.5, flY + shake * 0.3, flW, 4);

  // Border (pulses width with music)
  mfCtx.strokeStyle = fl.accent;
  mfCtx.lineWidth = 1.5 + pulse * 2;
  mfCtx.strokeRect(flX + shake * 0.5, flY + shake * 0.3, flW, flH);

  // Floor name
  mfCtx.font = '700 22px Space Mono, monospace';
  mfCtx.fillStyle = fl.accent;
  mfCtx.textAlign = 'center';
  mfCtx.fillText(fl.name, w / 2, flY + 32);

  // Skills inside floor
  if (fl.isData && fl.skills) {
    const startY = flY + 52;
    const rowH = 28;
    fl.skills.forEach((skill, si) => {
      const sy = startY + si * rowH;
      const lvl = levelColors[skill[1]] || { c: '#666', dots: 1 };

      // Row bg tint by level
      mfCtx.fillStyle = `rgba(${lvl.c === '#ffd700' ? '255,215,0' : lvl.c === '#ff2d55' ? '255,45,85' : lvl.c === '#00d4ff' ? '0,212,255' : '102,102,102'},0.08)`;
      mfCtx.fillRect(flX + 4, sy - 16, flW - 8, rowH);

      mfCtx.font = '700 12px IBM Plex Mono, monospace';
      mfCtx.fillStyle = '#f0f0f0';
      mfCtx.textAlign = 'left';
      mfCtx.fillText(skill[0], flX + 16, sy);

      // Level bars
      const bx = flX + flW - 80;
      for (let b = 0; b < 4; b++) {
        mfCtx.fillStyle = b < lvl.dots ? lvl.c : '#2a2a2a';
        mfCtx.fillRect(bx + b * 17, sy - 7, 14, 8);
      }
    });
  }

  mfFloorName.textContent = fl.name;
  mfFloorName.style.color = fl.accent;
}

document.getElementById('mfPrev')?.addEventListener('click', () => {
  mfIndex = (mfIndex - 1 + mfFloors.length) % mfFloors.length;
  drawMobileFloor();
});

document.getElementById('mfNext')?.addEventListener('click', () => {
  mfIndex = (mfIndex + 1) % mfFloors.length;
  drawMobileFloor();
});

resizeMF();

// ─── WAVEFORM ────────────────────────────────────────────────────────
const waveCanvas = document.getElementById('wave-canvas');
const wctx = waveCanvas.getContext('2d');

function resizeWave() {
  waveCanvas.width = waveCanvas.offsetWidth;
  waveCanvas.height = 200;
}
resizeWave();

let waveHistory = [];
const WAVE_LEN = 300;

function drawWaveform(data) {
  const w = waveCanvas.width, h = waveCanvas.height;
  wctx.fillStyle = 'rgba(8,8,8,0.3)';
  wctx.fillRect(0, 0, w, h);

  // Center line
  wctx.strokeStyle = 'rgba(44,44,44,0.6)';
  wctx.lineWidth = 0.5;
  wctx.beginPath(); wctx.moveTo(0, h/2); wctx.lineTo(w, h/2); wctx.stroke();

  // Grid
  for (let x = 0; x < w; x += 60) {
    wctx.strokeStyle = 'rgba(30,30,30,0.4)';
    wctx.lineWidth = 0.5;
    wctx.beginPath(); wctx.moveTo(x, 0); wctx.lineTo(x, h); wctx.stroke();
  }

  // Collect waveform point
  let sum = 0;
  const step = Math.floor(data.length / 8);
  for (let i = 0; i < 8; i++) sum += (data[i * step] || 0);
  const avg = (sum / 8 / 255) * 2 - 1;
  waveHistory.push(avg);
  if (waveHistory.length > WAVE_LEN) waveHistory.shift();

  // Draw main wave
  wctx.beginPath();
  wctx.strokeStyle = '#ff2d55';
  wctx.lineWidth = 2;
  waveHistory.forEach((v, i) => {
    const x = (i / WAVE_LEN) * w;
    const y = h/2 + v * (h/2 - 10);
    i === 0 ? wctx.moveTo(x, y) : wctx.lineTo(x, y);
  });
  wctx.stroke();

  // Shadow wave
  wctx.beginPath();
  wctx.strokeStyle = 'rgba(0,212,255,0.4)';
  wctx.lineWidth = 1;
  waveHistory.forEach((v, i) => {
    const x = (i / WAVE_LEN) * w;
    const y = h/2 + v * (h/2 - 20) * 0.6;
    i === 0 ? wctx.moveTo(x, y) : wctx.lineTo(x, y);
  });
  wctx.stroke();
}

// ─── UPDATE UI ───────────────────────────────────────────────────────
function updateUI(data) {
  const N = data.length;
  const bassData = Array.from(data.slice(0, Math.floor(N*0.1)));
  const midData = Array.from(data.slice(Math.floor(N*0.1), Math.floor(N*0.4)));
  const highData = Array.from(data.slice(Math.floor(N*0.4), Math.floor(N*0.8)));
  const allData = Array.from(data);

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
  globalBass = avg(bassData);
  const midA = avg(midData);
  const highA = avg(highData);
  globalAmp = Math.min(1, avg(allData) / 128);

  document.getElementById('dVol').textContent = Math.round(audioPlayer.volume * 100);
  document.getElementById('dFreq').textContent = isAudioReady ? calcBPM() : '—';
  document.getElementById('dBass').textContent = Math.round(globalBass / 2.55);
  document.getElementById('dMid').textContent = Math.round(midA / 2.55);
  document.getElementById('dHigh').textContent = Math.round(highA / 2.55);
  document.getElementById('dLayers').textContent = layerVisible.filter(Boolean).length;

  // Beat detection
  if (isAudioReady && globalBass > 100) {
    const now = Date.now();
    if (beatHistory.length === 0 || now - beatHistory[beatHistory.length-1] > 300) {
      beatHistory.push(now);
      if (beatHistory.length > 8) beatHistory.shift();
    }
  }



  // Freq bars
  const step = Math.floor(data.length / NUM_BARS);
  freqBarEls.forEach((b, i) => {
    const val = data[i * step] || 0;
    b.style.height = Math.max(2, Math.round(val / 255 * 100)) + 'px';
  });
}

// ─── CODE RAIN ────────────────────────────────────────────────────────
const rainCanvas = document.getElementById('coderain-canvas');
const rctx = rainCanvas.getContext('2d');
const RAIN_COLS = 80;
let rainDrops = [];
let rainChars = [];

function initRain() {
  rainDrops = [];
  rainChars = [];
  for (let i = 0; i < RAIN_COLS; i++) {
    rainDrops[i] = Math.floor(Math.random() * -100);
    rainChars[i] = String.fromCharCode(0x30A0 + Math.random() * 96);
  }
}

function resizeRain() {
  rainCanvas.width = rainCanvas.offsetWidth;
  rainCanvas.height = rainCanvas.offsetHeight;
  initRain();
}
resizeRain();
window.addEventListener('resize', resizeRain);

function drawCodeRain(data) {
  const w = rainCanvas.width, h = rainCanvas.height;
  rctx.fillStyle = 'rgba(8,8,8,0.12)';
  rctx.fillRect(0, 0, w, h);

  const colW = w / RAIN_COLS;
  const amp = globalAmp;
  const bass = globalBass / 255;

  // Beat flash
  const flash = bass > 0.5 ? amp * 0.3 : 0;

  rctx.font = '14px IBM Plex Mono, monospace';

  for (let i = 0; i < RAIN_COLS; i++) {
    const x = i * colW;

    // Speed influenced by audio amplitude
    const speed = 0.5 + amp * 1.5 + (i % 5 === 0 ? bass * 2 : 0);
    rainDrops[i] += speed;

    const y = rainDrops[i] * 14;

    // Reset when out of bounds
    if (y > h + 50 && Math.random() > 0.975) {
      rainDrops[i] = Math.random() * -50;
      rainChars[i] = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
    }

    if (y < 0 || y > h) continue;

    // Alpha based on audio and position
    const distFromPeak = Math.abs(i - RAIN_COLS * (data[Math.floor(i * data.length / RAIN_COLS)] || 0) / 255);
    const alpha = Math.min(0.9, 0.15 + amp * 0.5 + Math.random() * 0.2 + flash);
    const tailAlpha = Math.max(0.05, alpha * (1 - y / h));

    // Lead character (brighter)
    rctx.fillStyle = `rgba(0,212,255,${alpha})`;
    rctx.fillText(rainChars[i], x, y);

    // Tail (dimmer, greenish)
    if (y > 14) {
      rctx.fillStyle = `rgba(168,255,120,${tailAlpha * 0.5})`;
      rctx.fillText(rainChars[i], x, y - 14);
    }

    // Random character change on beat
    if (bass > 0.6 && Math.random() > 0.7) {
      rainChars[i] = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
    }
  }
}

// ─── PROJECTS DATA ──────────────────────────────────────────────────
const projectsData = [
  {
    id: 0,
    titleKey: 'proj-1-title',
    descKey: 'proj-1-desc',
    longDescKey: 'proj-1-long',
    tags: ['Go', 'Gin', 'React', 'TypeScript', 'Vite'],
    cardCover: 'assets/la_chanchita.jpg',
    overlayCover: 'assets/la_chanchita_full.gif',
    techs: [
      { category: 'Backend', items: ['Go', 'Gin', 'GORM', 'JWT (golang-jwt)', 'bcrypt', 'PostgreSQL'] },
      { category: 'Frontend', items: ['React 19', 'TypeScript', 'Vite'] },
      { category: 'DB', items: ['PostgreSQL (Supabase / Neon)'] },
      { category: 'Deploy', items: ['Render (backend)', 'Vercel (frontend)'] },
    ],
    links: [
      { label: 'VER DEMO', url: 'https://lachanchita-web.vercel.app' },
      { label: 'VER DOCUMENTACIÓN', url: 'assets/LACHANCHITA_TECNICO.pdf', download: true },
    ],
  },
  {
    id: 1,
    titleKey: 'proj-2-title',
    descKey: 'proj-2-desc',
    longDescKey: 'proj-2-long',
    tags: ['React', 'FastAPI', 'Python', 'spaCy'],
    cardCover: 'assets/vitaldent.jpg',
    overlayVideo: 'assets/vitaldent.mp4',
    techs: [
      { category: 'Frontend', items: ['React + Vite'] },
      { category: 'Backend', items: ['FastAPI (Python)'] },
      { category: 'DB + Auth', items: ['Supabase (PostgreSQL + Auth + Storage)'] },
      { category: 'NLP', items: ['spaCy'] },
      { category: 'ML', items: ['scikit-learn'] },
      { category: 'Hosting', items: ['Render', 'Vercel'] },
    ],
    links: [
      { label: 'VER DEMO', url: 'https://plataforma-citas-gukw686dy-eduardoealvarezj.vercel.app' },
      { label: 'VER DOCUMENTACIÓN', url: 'assets/VITALDENT_TECNICO.pdf', download: true },
    ],
  },
  {
    id: 2,
    titleKey: 'proj-3-title',
    descKey: 'proj-3-desc',
    longDescKey: 'proj-3-long',
    tags: ['Agent skill'],
    cardCover: 'assets/body_doubling.png',
    overlayCover: 'assets/body_doubling_banner.png',
    links: [
      { label: 'VER REPOSITORIO', url: 'https://github.com/eduernesto/Body-Doubling' },
    ],
  },
];

// ─── PROJECT OVERLAY ────────────────────────────────────────────────
const overlayEl = document.getElementById('projectOverlay');
const overlayCover = document.getElementById('overlayCover');
const overlayVideo = document.getElementById('overlayVideo');
const overlayIcon = document.getElementById('overlayIcon');
const overlayTitle = document.getElementById('overlayTitle');
const overlayTags = document.getElementById('overlayTags');
const overlayDesc = document.getElementById('overlayDesc');
const overlayTechs = document.getElementById('overlayTechs');
const overlayLinks = document.getElementById('overlayLinks');

function openProjectOverlay(id) {
  const p = projectsData[id];
  if (!p) return;
  if (p.overlayVideo) {
    overlayCover.style.background = 'none';
    overlayVideo.style.display = '';
    overlayVideo.src = p.overlayVideo;
    overlayVideo.pause();
    overlayVideo.currentTime = 0;
  } else {
    overlayVideo.style.display = 'none';
    overlayVideo.src = '';
    if (p.overlayCover) {
      overlayCover.style.background = 'url(' + p.overlayCover + ') center/contain no-repeat #111';
    } else if (p.cardCover) {
      overlayCover.style.background = 'url(' + p.cardCover + ') center/cover no-repeat #111';
    } else {
      overlayCover.style.background = p.coverGradient || '#111';
    }
  }
  overlayIcon.textContent = '_' + String(id + 1).padStart(2, '0');
  overlayTitle.textContent = window.i18n.translate(p.titleKey);
  overlayTags.innerHTML = p.tags.map(t => '<span class="proj-tag">' + t + '</span>').join('');
  overlayDesc.textContent = window.i18n.translate(p.longDescKey);
  if (p.techs) {
    overlayTechs.style.display = '';
    overlayTechs.innerHTML = p.techs.map(t =>
      '<div class="overlay-tech-cat"><span class="overlay-tech-label">' + t.category + ':</span> ' + t.items.join(' · ') + '</div>'
    ).join('');
  } else {
    overlayTechs.style.display = 'none';
  }
  overlayLinks.innerHTML = p.links.map(l =>
    '<a href="' + l.url + '" class="btn btn-primary overlay-link" ' + (l.download ? 'download' : 'target="_blank" rel="noopener"') + '>' + l.label + ' →</a>'
  ).join('');

  overlayEl.dataset.currentProjId = id;
  overlayEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProjectOverlay() {
  overlayEl.classList.remove('open');
  document.body.style.overflow = '';
}

overlayEl.querySelector('.overlay-close').addEventListener('click', closeProjectOverlay);
overlayEl.querySelector('.overlay-backdrop').addEventListener('click', closeProjectOverlay);

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-proj-open');
  if (btn) {
    const card = btn.closest('.proj-card');
    if (card) openProjectOverlay(parseInt(card.dataset.projId));
  }
});

window.addEventListener('languagechange', () => {
  if (overlayEl.classList.contains('open')) {
    const id = overlayEl.dataset.currentProjId;
    if (id !== undefined) openProjectOverlay(parseInt(id));
  }
});

// ─── MAIN LOOP ───────────────────────────────────────────────────────
function mainLoop() {
  const data = getAudioData();
  updateUI(data);
  drawHero(data);
  if (window.innerWidth > 768) drawBuildingMain(data);
  else drawMobileFloor();
  drawWaveform(data);
  drawCodeRain(data);
  animFrame = requestAnimationFrame(mainLoop);
}

mainLoop();

// ─── HAMBURGER MENU ──────────────────────────────────────────────────
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

menuBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuBtn.textContent = open ? '✕' : '☰';
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuBtn.textContent = '☰';
  });
});

// ─── CONTACT FORM ────────────────────────────────────────────────────
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector('button[type="submit"]');
  const orig = btn.textContent;

  // ponytail: client-side rate-limit — 1 submit per 10s
  if (btn.dataset.sent) return;
  btn.dataset.sent = '1';
  setTimeout(() => delete btn.dataset.sent, 10000);

  btn.textContent = 'ENVIANDO...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (res.ok) {
      btn.textContent = '✓ ENVIADO';
      form.reset();
    } else {
      btn.textContent = '✗ ' + (json.error || 'ERROR');
    }
  } catch {
    btn.textContent = '✗ ERROR DE RED';
  }

  setTimeout(() => {
    btn.textContent = orig;
    btn.disabled = false;
  }, 3000);
});