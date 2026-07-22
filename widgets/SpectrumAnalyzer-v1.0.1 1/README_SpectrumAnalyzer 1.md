# Spectrum Analyzer — iCUE Widget
**Version 1.0.1 · by meloyellowjr**

A real-time audio spectrum analyzer for the **Corsair Xeneon Edge** (and any iCUE `dashboard_lcd` device). Six hand-crafted visual themes respond to whatever is playing on your PC — music, games, movies, anything — with no third-party audio software required.

---

## What You Get

| Feature | Detail |
|---|---|
| **6 visual themes** | Enchanted Rainbow, Retro phosphor, LED bargraph, OLED, CRT Scanlines, WinAmp |
| **Real system audio** | Windows WASAPI loopback — captures everything playing, not just one app |
| **Full-screen bars** | 8–128 logarithmic frequency bars that fill the entire display |
| **Peak hold** | Peak markers float and fall after each transient |
| **Mirror mode** | Symmetric left/right display — bars grow outward from centre |
| **Reflection** | Optional downward bar reflection for depth |
| **Rounded bars** | Soft-capped bar tops (toggle on/off) |
| **iCUE customisation** | Input Gain, Glow Intensity, Sensitivity, Smoothing, background image/colour, and more |
| **Demo mode** | Animated fallback when no audio source is detected |

---

## Requirements

| Requirement | Notes |
|---|---|
| **Corsair iCUE 5** | WidgetBuilder 2 is required — iCUE 4 will not work |
| **Corsair Xeneon Edge** | Or any iCUE `dashboard_lcd` device |
| **Windows 10 / 11** | The WASAPI audio bridge requires Windows |
| **Node.js v18+** | Free download at [nodejs.org](https://nodejs.org) |
| **.NET Framework 4.x** | Already installed on every Windows 10 / 11 PC |

---

## Files

```
SpectrumAnalyzer-v1.0.1.icuewidget   ← import this into iCUE
spectrum-server 2.js                  ← run this first, every session
README_SpectrumAnalyzer.md            ← this file
```

---

## Installation — Step by Step

### Step 1 — Install Node.js (one time only)

1. Go to **[nodejs.org](https://nodejs.org)** and download the **LTS** version
2. Run the installer — accept all defaults, make sure **"Add to PATH"** is checked
3. Open **Command Prompt** and confirm it works:
   ```
   node --version
   ```
   You should see something like `v20.x.x`

---

### Step 2 — Start the Audio Bridge

The bridge is a small local server that reads your Windows audio output and computes the frequency spectrum. **Start it every time before using the widget.**

1. Open **Command Prompt** or **PowerShell**
2. Navigate to the folder containing `spectrum-server 2.js`:
   ```
   cd C:\Users\YourName\Downloads\SpectrumAnalyzer
   ```
3. Start the server:
   ```
   node "spectrum-server 2.js"
   ```
4. Wait for these messages — it takes a few seconds to compile:
   ```
   ✅  Compiled — starting loopback capture
   ✅  WASAPI: sr=48000 ch=2 bps=32 float=true
   🎤  Loopback capture active
   ```
5. **Leave this window open.** Minimise it to the taskbar.

> **Verify it's working:** Open a browser and go to `http://127.0.0.1:3749/debug`
> You'll see a live mini spectrum. Play music — the bars should move.

---

### Step 3 — Import the Widget into iCUE

1. Open **Corsair iCUE**
2. Click your **Xeneon Edge** in the home screen
3. Click the **Dashboard** tab
4. Click **+ Add Widget** → **Import Widget**
5. Browse to `SpectrumAnalyzer-v1.0.1.icuewidget` and click **Open**
6. The widget appears on your dashboard — drag it to your preferred position
7. Resize to **Large** or **XL** for the best visual impact

**That's it — the spectrum should be live!**

---

## Status Indicator

The small dot in the bottom-right corner tells you what audio source is active:

| Indicator | Meaning |
|---|---|
| **● BRIDGE** (bright green) | Bridge running — showing real system audio via WASAPI |
| **● LIVE** (bright green) | Web Audio API active (microphone / Stereo Mix input) |
| **● SIM** (dim green) | No audio source detected — showing animated demo |

If you see **SIM**, make sure `spectrum-server 2.js` is running.

When using `icue-widget-runner-v4`, the widget is configured to use the local
WASAPI bridge and not the browser microphone fallback. If a browser asks for
microphone permission, reload the runner after updating this widget.

---

## Visual Themes

Switch themes in the iCUE settings panel (right-click → Customise). Each theme has its own personality:

| Theme | Look | Best for |
|---|---|---|
| **Enchanted Rainbow** | Animated hue-cycling gradient bars with bloom glow and reflection | Music, general use |
| **Retro** | Green phosphor monochrome with CRT grid and scanlines | Retro aesthetic, dark rooms |
| **LED** | Segmented bargraph — green / yellow / red zones with discrete lit segments | Hardware monitor feel |
| **OLED** | Deep black with vivid blue-to-white gradient, high-contrast | OLED-panel setups |
| **CRT Scanlines** | Green-to-amber bars with horizontal scanlines, vignette, and bloom | Vintage / sci-fi look |
| **WinAmp** | Classic dark blue-black with the iconic teal-to-red gradient and pixel-perfect peak dots | Nostalgia |

---

## iCUE Customisation Panel

Right-click the widget → **Customise** to access all settings. Changes apply instantly — no Save button needed.

### Spectrum Analyzer Settings

| Setting | Range | Default | What it does |
|---|---|---|---|
| **Color Theme** | 6 options | Enchanted Rainbow | Visual style of the bars |
| **Bar Count** | 8–128 | 64 | Number of frequency bars across the display |
| **Input Gain** | 10–500% | 150% | Pre-amplifies the signal. Raise this if bars feel short, lower it if they clip at the top |
| **Sensitivity** | 10–400% | 100% | Overall bar height scale — works together with Input Gain |
| **Smoothing** | 0–95% | 75% | How much previous frames blend into the current one. Higher = smoother motion |
| **Bar Gap** | 0–6 px | 1 px | Pixel spacing between bars |
| **Glow Intensity** | 0–100% | 70% | Strength of the bloom / shadow glow around bars |
| **Peak Hold** | On / Off | On | Shows a floating peak marker that slowly falls |
| **Mirror Mode** | On / Off | Off | Mirrors the spectrum symmetrically from the centre outward |
| **Show Reflection** | On / Off | On | Adds a downward reflection below the baseline |
| **Rounded Bars** | On / Off | On | Rounds the top corners of each bar |

### Widget Personalization

| Setting | Default | What it does |
|---|---|---|
| **Text Color** | White | Reserved for future label elements |
| **Accent Color** | Purple | Tint used in certain theme highlights |
| **Background Color** | Black | Solid background behind the bars |
| **Background Image** | — | Upload a custom image or video as the background |
| **Background Brightness** | 100% | Dim or brighten a background image |
| **Glass Blur** | 0 | Frosted-glass blur on the background image |
| **Background Transparency** | 100% | Overall widget opacity — set to 0% for a floating bar effect over your desktop |

---

## Tips for Best Results

**Getting the most out of Input Gain:**
- For quiet music (classical, jazz, ambient): raise Input Gain to 200–300%
- For loud genres (EDM, metal, gaming): 100–150% is usually ideal
- Watch the peak markers — if they're pinned at the top constantly, lower the gain

**Theme + Background combos that work great:**
- **Enchanted Rainbow** on a dark galaxy wallpaper — bars feel like they float in space
- **Retro** with Background Color set to `#001a00` (deep phosphor green) — authentic CRT feel
- **OLED** with Background Transparency at 0% — bars appear to float over your desktop
- **WinAmp** with Background Color `#0e0e18` (the classic WinAmp dark blue) — maximum nostalgia
- **CRT Scanlines** with a slight green-tinted background image + Glass Blur at 5

**Mirror Mode:**
Works best with Bar Count set to 32–64. The spectrum folds symmetrically from the centre, giving a heartbeat / pulse feel during bass hits.

**Smoothing sweet spots:**
- 60–70%: Snappy response — good for fast music, gaming
- 80–88%: Smooth, flowing motion — ideal for ambient or slower music
- 0–40%: Instant, raw response — every transient is visible

---

## Auto-Starting the Audio Bridge

Don't want to open a command prompt every session? Set the bridge to launch automatically at login.

### Option A — Task Scheduler (most reliable)

1. Press **Win**, type `Task Scheduler`, open it
2. Click **Create Basic Task…** in the right panel
3. Fill in:
   - **Name:** `Spectrum Analyzer Bridge`
   - **Trigger:** When I log on
   - **Action:** Start a program
   - **Program/script:** `node`
   - **Add arguments:** `"C:\full\path\to\spectrum-server 2.js"`
   - **Start in:** `C:\full\path\to\` ← the folder, not the file
4. Click **Finish**

### Option B — Startup Folder (simplest)

1. Create a file named `start-spectrum-bridge.bat`:
   ```batch
   @echo off
   cd /d "C:\full\path\to\SpectrumAnalyzer"
   start "Spectrum Bridge" node "spectrum-server 2.js"
   ```
2. Press **Win + R**, type `shell:startup`, press Enter
3. Paste `start-spectrum-bridge.bat` into the Startup folder

---

## Troubleshooting

### ● SIM — no live audio

| Check | How to fix |
|---|---|
| Bridge not running | Open Command Prompt, `cd` to the folder, run `node "spectrum-server 2.js"` |
| Bridge in wrong folder | Make sure `spectrum-server 2.js` is in the folder you navigate to |
| Port 3749 blocked | Open Windows Defender Firewall → Allow `node.exe` on private networks |
| Another instance running | Open Task Manager → find `node.exe` → End Task, then restart |

### Bridge fails to start

| Error message | Cause | Fix |
|---|---|---|
| `csc.exe not found` | .NET Framework missing | Run Windows Update; install .NET Framework 4.x |
| `EADDRINUSE 3749` | Bridge already running on that port | End the existing `node.exe` in Task Manager |
| `node is not recognized` | Node.js not on PATH | Reinstall Node.js with "Add to PATH" ticked |
| `ERR:Activate=...` | WASAPI audio device error | Ensure your default audio output device is set in Windows Sound Settings |

### Bars are too small / barely visible

1. Open iCUE → Customise → raise **Input Gain** to 200–300%
2. Also raise **Sensitivity** if needed
3. Verify the bridge is live — the status indicator should show **● BRIDGE** not **● SIM**
4. Open `http://127.0.0.1:3749/debug` in a browser to confirm audio is flowing

### Bars don't respond to a specific app

The bridge captures the **Windows default audio output**. If a game or app uses a different audio device:
1. Open **Windows Settings → System → Sound**
2. Under **Output**, set your preferred device as the **Default**
3. Restart `spectrum-server 2.js`

### Widget shows blank / nothing after import

- Confirm you are running **iCUE 5** (not iCUE 4)
- Remove the widget and re-import `SpectrumAnalyzer-v1.0.1.icuewidget`
- Resize to **Large** or **XL** — very small sizes may not render correctly

### Bars feel laggy

- Lower **Smoothing** to 50–60% in the iCUE Customise panel
- This gives a more instant, reactive response

---

## How It Works

### Audio Bridge (`spectrum-server 2.js`)

The bridge compiles a small C# program at startup using `csc.exe`, which ships with .NET Framework on every Windows 10/11 PC — no install required. The C# program opens a **WASAPI loopback capture** session on your default audio output and continuously reads raw PCM audio frames at your system's native sample rate (typically 48000 Hz).

Every 2048 audio samples, the bridge:
1. Applies a **Hann window** to reduce spectral leakage
2. Runs a **Cooley-Tukey FFT** to convert from time domain to frequency domain
3. Groups the FFT bins into **64 logarithmically-spaced bands** (20 Hz → 18 kHz)
4. Converts linear magnitude to **decibels** (−80 dB → 0.0, −10 dB → 1.0)
5. Serves the 64 normalised values as JSON at `http://127.0.0.1:3749/fft`

The widget polls this endpoint every **16 ms** (~60 fps).

### Widget Rendering

The widget uses a two-layer canvas approach inherited from the VU Stereo Meter:

| Layer | Contents | When redrawn |
|---|---|---|
| **Static (cached)** | Background, grid, scanlines, baseline | Once — only on theme change or resize |
| **Dynamic** | All 6 themes' bars, peaks, reflections, overlays | Every frame via `requestAnimationFrame` |

This keeps the per-frame draw cost minimal — only the bars are redrawn at 60 fps.

**Ports used:**
- Port **3749** — Spectrum Analyzer bridge (this widget)
- Port **3748** — VU Stereo Meter bridge (companion widget)
- Port **3747** — Reserved by iCUE itself (do not use)

---

## GitHub Repository

**https://github.com/meloyellowjr/Xeneon-Edge-Widgets-learning**

Source code, latest releases, and other Xeneon Edge widgets including the VU Stereo Meter.

---

## Licence

Personal use. Attribution appreciated if you share or build on this work.

*Inspired by classic hardware spectrum analyzers and the timeless WinAmp visualizer.*
