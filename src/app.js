// ─── STATE ───────────────────────────────────────────────────────────
let audioCtx, analyser, dataArray, bufferLength;
let isAudioReady = false;
let animFrame;
let simFrame = 0;
let simBeat = 0;
let simBpm = 120;
let beatHistory = [];
let layerVisible = [true,true,true,true,true,true,true];
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
    playerSong.textContent = 'SIN ARCHIVOS';
  }
}

function loadTrack(index) {
  if (playlist.length === 0) return;
  currentTrack = index;
  const track = playlist[index];
  audioPlayer.src = track.path;
  playerSong.textContent = track.name;
  if (track.cover) {
    playerCover.innerHTML = `<img src="${track.cover}" alt="cover">`;
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

// ─── LAYER TOGGLE ────────────────────────────────────────────────────
function toggleLayer(btn, idx) {
  layerVisible[idx] = !layerVisible[idx];
  btn.classList.toggle('on');
  document.getElementById('dLayers').textContent = layerVisible.filter(Boolean).length;
  document.getElementById('hLayerCount').textContent = layerVisible.filter(Boolean).length;
}

// ─── HERO CANVAS ─────────────────────────────────────────────────────
const heroCanvas = document.getElementById('hero-canvas');
const hctx = heroCanvas.getContext('2d');

function resizeHero() {
  heroCanvas.width = heroCanvas.offsetWidth;
  heroCanvas.height = heroCanvas.offsetHeight;
}
resizeHero();
window.addEventListener('resize', () => { resizeHero(); resizeBuilding(); resizeWave(); });

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

  // Mini building silhouette in hero
  const bx = w * 0.72, by = h * 0.78;
  const bw = Math.min(300, w * 0.35);
  const floors2 = [0.4,0.5,0.6,0.7,0.8,0.9,1.0];
  let cy2 = by;
  floors2.forEach((fw, i) => {
    const fh = 16 + (i===6?6:0);
    const pulseIdx = Math.floor((i / floors2.length) * (data.length * 0.5));
    const p = (data[pulseIdx] || 0) / 255;
    const fx = bx - (bw * fw / 2);
    const col = i===2 ? `rgba(255,45,85,${0.6+p*0.4})` : i===3 ? `rgba(0,212,255,${0.3+p*0.3})` : `rgba(240,240,240,${0.08+p*0.12})`;
    hctx.fillStyle = col;
    hctx.fillRect(fx, cy2 - fh, bw * fw, fh - 1);
    cy2 -= fh;
  });

  document.getElementById('hFreq').textContent = isAudioReady ? Math.round(440 + globalAmp * 300) + 'hz' : '—';
  document.getElementById('hBpm').textContent = isAudioReady ? calcBPM() : '—';
}

// ─── BUILDING CANVAS ─────────────────────────────────────────────────
const buildingCanvas = document.getElementById('building-canvas');
const bctx = buildingCanvas.getContext('2d');

function resizeBuilding() {
  buildingCanvas.width = buildingCanvas.offsetWidth;
  buildingCanvas.height = buildingCanvas.offsetHeight || 600;
}
resizeBuilding();

const FLOORS = [
  { name:'PENTHOUSE',   widthRatio:0.38, h:42, col:'#f0f0f0', tc:'#080808', wins:6,  freq:0.95 },
  { name:'LAYER_07',    widthRatio:0.44, h:48, col:'#1a1a1a', tc:'#ff2d55', wins:7,  freq:0.82 },
  { name:'FREQ_BAND',   widthRatio:0.48, h:38, col:'#ff2d55', tc:'#080808', wins:8,  freq:0.65 },
  { name:'MID_RANGE',   widthRatio:0.52, h:52, col:'#111',    tc:'#00d4ff', wins:9,  freq:0.48 },
  { name:'BASS_CORE',   widthRatio:0.56, h:44, col:'#1c1c1c', tc:'#f0f0f0', wins:10, freq:0.30 },
  { name:'CODE_LAYER',  widthRatio:0.60, h:56, col:'#080808', tc:'#ff2d55', wins:10, freq:0.15 },
  { name:'FOUNDATION',  widthRatio:0.64, h:38, col:'#222',    tc:'#888',    wins:11, freq:0.05 },
];

const snippets2 = ['beat()','freq++','render()','0xFF','amp*2','draw()','sync()','bass()','{wave}','loop()'];
let snipIdx2 = 0;
let snipTimer = 0;

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
  snipTimer++;
  if (snipTimer % 70 === 0) snipIdx2++;

  FLOORS.forEach((fl, i) => {
    if (!layerVisible[i]) { cursor -= fl.h + 2; return; }

    const freqIdx = Math.floor(fl.freq * (data.length - 1));
    const rawPulse = (data[freqIdx] || 0) / 255;
    const pulse = rawPulse * 0.8 + globalAmp * 0.2;

    const offsetY = Math.sin(simFrame * 0.03 + i * 0.7) * 2 * pulse;
    const flW = w * fl.widthRatio;
    const flX = cx - flW / 2;
    const flY = cursor - fl.h + offsetY;

    // Shadow layer (depth effect)
    bctx.fillStyle = 'rgba(0,0,0,0.4)';
    bctx.fillRect(flX + 4, flY + 4, flW, fl.h);

    // Main floor
    bctx.fillStyle = fl.col;
    bctx.fillRect(flX, flY, flW, fl.h);

    // Horizontal accent lines (texture)
    if (fl.h > 40) {
      bctx.strokeStyle = 'rgba(255,255,255,0.04)';
      bctx.lineWidth = 0.5;
      for (let ly = flY + 10; ly < flY + fl.h - 6; ly += 8) {
        bctx.beginPath(); bctx.moveTo(flX, ly); bctx.lineTo(flX+flW, ly); bctx.stroke();
      }
    }

    // Border
    bctx.strokeStyle = i===2 ? '#ff2d55' : i===3 ? '#00d4ff' : '#333';
    bctx.lineWidth = i===2 ? 2 : 0.5;
    bctx.strokeRect(flX, flY, flW, fl.h);

    // Top accent bar
    const accentCol = i===2 ? '#ff2d55' : i===3 ? '#00d4ff' : i===0 ? '#f0f0f0' : '#333';
    bctx.fillStyle = accentCol;
    bctx.fillRect(flX, flY, flW, 3);

    // Windows
    const winW = 12, winH = fl.h * 0.42;
    const winY = flY + fl.h * 0.28;
    const gap = (flW - fl.wins * winW) / (fl.wins + 1);
    for (let j = 0; j < fl.wins; j++) {
      const wx = flX + gap + j * (winW + gap);
      const brightness = 0.15 + pulse * 0.7 + (j%3===0 ? globalAmp * 0.3 : 0);
      let wc;
      if (i===2) wc = `rgba(255,45,85,${brightness})`;
      else if (i===3) wc = `rgba(0,212,255,${brightness * 0.8})`;
      else if (i===0) wc = `rgba(255,255,255,${brightness * 0.7})`;
      else wc = `rgba(240,240,240,${brightness * 0.35})`;
      bctx.fillStyle = wc;
      bctx.fillRect(wx, winY, winW - 2, winH);
      bctx.strokeStyle = 'rgba(255,255,255,0.06)';
      bctx.lineWidth = 0.5;
      bctx.strokeRect(wx, winY, winW - 2, winH);
    }

    // Code snippet in CODE_LAYER
    if (i===5 && pulse > 0.1) {
      bctx.font = '8px IBM Plex Mono, monospace';
      bctx.fillStyle = `rgba(255,45,85,${0.3 + pulse * 0.5})`;
      bctx.fillText(snippets2[snipIdx2 % snippets2.length], flX + 10, flY + fl.h/2 + 3);
    }

    // Floor label
    bctx.font = '700 9px Space Mono, monospace';
    bctx.fillStyle = fl.tc;
    bctx.textAlign = 'left';
    bctx.fillText(fl.name, flX + 10, flY + fl.h/2 + 3);

    // Pulse indicator right side
    const indW = Math.round(pulse * 40);
    bctx.fillStyle = i===2 ? 'rgba(255,45,85,0.6)' : 'rgba(240,240,240,0.2)';
    bctx.fillRect(flX + flW - 50, flY + fl.h/2 - 4, indW, 8);

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

// ─── MAIN LOOP ───────────────────────────────────────────────────────
function mainLoop() {
  const data = getAudioData();
  updateUI(data);
  drawHero(data);
  drawBuildingMain(data);
  drawWaveform(data);
  animFrame = requestAnimationFrame(mainLoop);
}

mainLoop();