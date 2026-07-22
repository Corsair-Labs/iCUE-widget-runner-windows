# VU Stereo Meter — iCUE Widget

Analog VU stereo meters in 8 legendary power amplifier styles, driven by **real Windows system audio** (Spotify, YouTube, games — anything playing through your speakers).

## How it works

The widget can't access Windows audio directly (iCUE widgets run in a sandboxed WebView). A small companion Node.js bridge server (`audio-server.js`) captures system audio using **WASAPI loopback** and serves stereo peak levels over HTTP on `localhost:3748`.

If the bridge isn't running, the meters fall back to a simulated signal automatically.

---

## Setup

Current v4 runner note: `audio-server.js` has no npm dependencies and listens on
`http://127.0.0.1:3748/levels`. Do not run `levels-server.js` at the same time,
because it uses the same port.

### 1 — Install Node.js
Download from https://nodejs.org (v16 or newer)

### 2 — Install the audio bridge dependency
This v4 bridge has no npm package install step.

### 3 — Run the bridge
```
node audio-server.js
```
You should see:
```
Compiled - starting reader
WASAPI: ch=2 stereo=True
Debug: http://127.0.0.1:3748/debug
```

### 4 — Install the widget
- Copy the `VUMeter/` folder (or install `VUMeter-v1.0.3.icuewidget`) into iCUE
- The small indicator in the bottom-right shows **● LIVE** when the bridge is connected, **● SIM** when running in simulation mode

---

## Troubleshooting

**Can't find a WASAPI loopback device?**
List all audio devices:
```
node audio-server.js --list
```
Then start with a specific device ID:
```
node audio-server.js 5
```

**No WASAPI devices showing?**
Enable Stereo Mix:
1. Right-click the speaker icon → Sounds → Recording tab
2. Right-click empty space → Show Disabled Devices
3. Right-click Stereo Mix → Enable

**Node.js is not recognized?**
Install Node.js and make sure "Add to PATH" is enabled in the installer.

---

## Widget themes
Click any button in the theme bar to switch between:
- Onkyo M-508 (default — green phosphor needle)
- McIntosh MC312 (blue bargraph)
- Accuphase P-4600 (gold chassis, dark needle)
- Yamaha M-5000 (white bargraph, piano black)
- Technics SE-R1 (periwinkle needle)
- Advance Paris A10 (amber bargraph + glowing tubes)
- Nikko Alpha 800 (warm gold needle)
- Proton D1200 (electric blue bargraph)

## Controls
- **POWER** — toggle meters on/off
- **MUTE** — silence both channels
- **DIM** — reduce meter sensitivity (low-level monitoring)
- **PEAK HOLD** — latch peak markers on needles/bars
