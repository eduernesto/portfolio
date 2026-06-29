<img width="1200" height="400" alt="banner" src="https://github.com/user-attachments/assets/94234d2e-83e4-45e9-a6eb-0a8db1396337" />

# Eduardo Alvarez — Sonic Brutalist Portfolio ⚡

A brutalist and reactive web portfolio, where my three main pillars merge: **programming, music, and digital aesthetics**.
This system not only showcases my work but behaves like an active digital organism: **the design reacts in real-time to the frequencies of the music you play**.

<img width="1900" height="906" alt="Recording 2026-06-29 145838" src="https://github.com/user-attachments/assets/d243dd68-5abe-43a0-ad74-0e012fe89491" />

---

```
  [ E.A. SYSTEM v1.0.0 ]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FREQ_MODULATION : ACTIVE  ||  BRUTAL_CONCRETE : 100% 
  // REACTIVE_CANVAS  : ONLINE  ||  AUDIO_ENGINE    : READY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```

---


## 🏛️ Concept and Aesthetics

* **Digital Brutalism**: Monospaced typography (`Space Mono` and `IBM Plex Mono`), high-contrast palette, one-pixel thick borders, unsmoothed layers, and a purely technical aesthetic that evokes terminals and low-fidelity but high-functionality interfaces.
* **Live Audio-Reactivity**: Integration of the **Web Audio API** to parse the sound spectrum. The rhythm and bass alter the physical properties of the visual elements on the screen.
* **Frequency Architecture**: An interactive building in canvas that renders my technology stacks using digital concrete blocks that vibrate to the rhythm of the equalizer.

---

## 🛠️ Technical Architecture

### Frontend (FPS Fidelity and Rendering)

* **Native HTML5 & CSS3**: Zero heavy CSS frameworks. Hardware-optimized animations, dynamic CSS variables, and an ultra-fast, responsive layout (mobile design adjusted at the canvas and panel level).
* **Core JS**: Rendering engine in canvas for code rain, the skills building, and the harmonic oscillator.
* **Web Audio API**: Live extraction of volume, bass, mids, and highs from an integrated audio player.

### Backend (Vercel Serverless)

* **Vercel Serverless Functions**:
* `api/music.js`: Dynamic generator for local playlist metadata.
* `api/contact.js`: Optimized contact handler with built-in validation and rate-limiting for security.


* **Local Dev Server**: Lightweight server in `Express` (v4) configured exclusively for testing in a local environment (`server.js`).

---

## ⚡ Repository Structure

The project was designed to be ultra-flat for efficient static distribution on a CDN (Vercel Edge Network):

```
/
├── api/                # Serverless Functions (Vercel)
│   ├── music.js        # Music player API
│   └── contact.js      # Contact form validation API
├── assets/             # Static resources (Images, Fonts, CV)
│   ├── building.png    # Structural asset
│   ├── Eduardo_Alvarez_CV.docx
│   └── music/          # Local playlist of .mp3 tracks and .jpg covers
├── index.html          # Base Markup & Metadata
├── style.css           # Brutalist design system & reactive variables
├── script.js           # JS Engine: canvas, audio engine, interactions
├── server.js           # Local dev server (Express v4)
├── vercel.json         # Routes and rewrite configuration for Vercel
└── package.json        # Minimal dependencies (dev only)

```

---

## 🚀 Local Setup

> Requires **Node.js v18+**. There are no heavy frameworks — the setup is intentionally minimal.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# 2. Install dependencies (Express only for dev server)
npm install

# 3. Start the local server
node server.js
# → http://localhost:3000

```

The local server in `server.js` replicates the behavior of Vercel routes so that `api/music.js` and `api/contact.js` work without the need to deploy for every test.

> **Note on audio**: The player loads tracks from `assets/music/`. Add your own `.mp3` files and update the metadata in `api/music.js` if you want to expand the playlist.

---

## ☁️ Deploy (Vercel)

The project is optimized for zero-config deployment on **Vercel**:

```bash
# With Vercel CLI
npm i -g vercel
vercel

```

Or connect the repository directly from the [Vercel dashboard](https://vercel.com/dashboard) for automatic deployments on every push to `main`.

**Environment Variables** (configure in Vercel → Settings → Environment Variables):

| Variable | Description | Required |
| --- | --- | --- |
| `CONTACT_EMAIL` | Destination email for the contact form | ✅ |
| `RATE_LIMIT_MAX` | Max requests per IP (default: `5`) | Optional |

The `vercel.json` already includes the necessary rewrites so that functions in `/api/*` respond correctly from the root domain.

---

## 📸 Preview

---

## 📄 License

MIT — Do whatever you want, but if you use parts of the audio-reactivity engine, credit is appreciated.
