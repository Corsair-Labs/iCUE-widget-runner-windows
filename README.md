# icue_widget_runner_engine_windows

Windows runner for browser-style CORSAIR iCUE widgets. The app discovers
widgets in the local `widgets\` folder, injects a small iCUE compatibility
layer, and displays the selected widget in an Electron window or Chrome app
mode.

The application is self-contained in the repository root.

## What the App Does

iCUE Widget Runner Engine brings browser-style CORSAIR iCUE widgets to Windows.
It presents compatible local widgets in a launcher and runs the selected
experience in Electron. If Electron is unavailable, the launcher can fall back
to Chrome app mode. Optional local audio bridges enable live VU meter and
spectrum-analyzer experiences by capturing the default Windows audio output.

## Use Case Scenario

A customer may have a Windows PC connected to a XENEON EDGE or another secondary
display in a desk, gaming room, streaming station, workshop, or home-entertainment
setup. The customer can browse the available widgets and select an audio
visualizer, clock face, air-quality display, or drawing surface without keeping
that experience on the primary screen.

The runner is also useful for prototyping. Designers and developers can place a
compatible web widget in `widgets\`, launch it in the runner, and evaluate its
appearance, interaction model, performance, and suitability for a compact or
touch-enabled display.

For more detail about the intended audience and experience, see
[CUSTOMER EXPERIENCE.md](CUSTOMER%20EXPERIENCE.md).

## Disclaimer and License

This is experimental software, not a supported CORSAIR product. Review the
[DISCLAIMER NOTICE](DISCLAIMER%20NOTICE) and [LICENSE](LICENSE) before using,
modifying, or redistributing it. The project uses the standard MIT License,
which permits both commercial and non-commercial use, modification,
distribution, sublicensing, and sale as long as its copyright and permission
notices are retained. The license applies to the software, not to CORSAIR or
iCUE trademarks or any claim of endorsement. The software is provided as-is,
without warranty or support.

## Prerequisites

The intended platform is Windows 10 or Windows 11.

### 1. Install Node.js

Install the current Node.js LTS release, which includes npm.

From PowerShell with WinGet:

```powershell
winget install --id OpenJS.NodeJS.LTS --source winget
```

Alternatively, use the Windows LTS installer from <https://nodejs.org/> and
keep the option that adds Node.js to `PATH`. Open a new terminal after the
installation, then verify:

```powershell
node --version
npm --version
```

### 2. Install Project Dependencies

From the repository root:

```powershell
npm install
```

Run this in every fresh clone and whenever `package-lock.json` changes. It
installs Electron and `fft.js` under `node_modules\`. A successful Electron
installation creates:

```text
node_modules\electron\dist\electron.exe
```

### 3. Verify Audio-Bridge Support

The VU and Spectrum bridges compile a small Windows WASAPI helper when they
start. On most Windows 10 and 11 systems, the required .NET Framework C#
compiler is already installed. Check it from PowerShell:

```powershell
Test-Path "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
```

The expected result is `True`. If it is `False`, install Windows updates and
enable or install .NET Framework 4.x before using the audio-reactive widgets.

Chrome is not required for normal Electron use. Install Chrome only if you plan
to use the explicit `browser` mode or rely on the launcher's browser fallback.

## Daily Startup

From the repository root, run:

```powershell
.\run-all.bat
```

You can also double-click `run-all.bat` in File Explorer. With no argument, it
defaults to `both`, starting the VU bridge, Spectrum bridge, and Electron UI.

Launcher modes:

```text
run-all.bat both       Start both audio bridges and the Electron UI (default).
run-all.bat vu         Start only the VU bridge and Electron UI.
run-all.bat spectrum   Start only the Spectrum bridge and Electron UI.
run-all.bat web        Start only the Electron UI for development/debugging.
run-all.bat browser    Start the web server and UI in Chrome app mode.
run-all.bat demo       Start dummy VU levels and the Electron UI.
run-all.bat help       Show launcher help.
```

NPM scripts:

```powershell
npm start              # Start Electron; Electron starts the local web server.
npm run web            # Start only the server at http://127.0.0.1:8080/.
npm run package:runner # Create a distributable ZIP archive.
```

## What It Does

- Runs a local widget web app at `http://127.0.0.1:8080/`.
- Scans `widgets\` for folders containing `index.html` and an optional
  `manifest.json`.
- Shows discovered widgets in a sidebar with manifest metadata, preview icons,
  runtime status, and a live iframe preview.
- Supports temporary drag-and-drop widget folders and folder selection in the
  browser UI.
- Injects iCUE-style globals and a Sensors-provider compatibility shim so
  supported widgets can run outside the full iCUE desktop runtime.
- Starts in Electron by default, with a Chrome app-mode fallback.
- Provides Windows WASAPI bridges for live VU meter and spectrum widgets.
- Persists runner-side widget settings in browser local storage.

## Main Components

```text
icue_widget_runner_engine_windows\
  main.js                  Electron main process; starts the local web server.
  preload.js               Secure Electron window-control bridge.
  index.html               Runner UI shell.
  runner-v2.js             Widget discovery, loading, shim injection, and UI.
  web-server.js            Static server and /api/widgets discovery endpoint.
  app-config.js            Window-control configuration.
  levels-server.js         Demo VU level server on port 3748.
  run-all.bat              Windows launcher for the UI and audio bridges.
  scripts\
    start-electron.js      Starts the locally installed Electron runtime.
    package-runner.ps1     Builds a clean ZIP or 7z distribution.
  widgets\                 Bundled widget folders and audio bridge scripts.
```

## Bundled Widgets

| Widget | Functionality | Runtime notes |
| --- | --- | --- |
| VU Stereo Meter | Analog stereo VU meters with multiple amplifier styles. | Uses `http://127.0.0.1:3748/levels`; falls back to simulated or sensor motion if unavailable. |
| Spectrum Analyzer | Real-time audio spectrum visualizer with themes. | Uses `http://127.0.0.1:3749/fft`; the runner exposes gain, sensitivity, and smoothing controls. |
| Robex Tourbillon | Animated watch face with date and month elements. | Browser-hosted visual widget. |
| Doodle Pad | Touch-style drawing with brush, eraser, colors, and persistent canvas. | Browser-hosted interactive widget using local storage. |
| Air Quality | Air-quality and environmental information display. | Uses Open-Meteo services and requires network access for live data. |
| Flap Clock Calendar | Responsive clock and calendar display. | Browser-hosted visual widget. |

The runner lists every widget folder it can load. Original manifests may still
contain source-platform metadata, but the local runner hosts them in its Windows
browser/Electron environment.

## Audio Capture

The VU and Spectrum bridge scripts capture the default Windows output through
WASAPI loopback. Each script generates and compiles a small C# reader, starts a
loopback capture process, and exposes data only on the local machine.

Endpoints:

```text
VU Meter:
  http://127.0.0.1:3748/levels
  http://127.0.0.1:3748/debug

Spectrum Analyzer:
  http://127.0.0.1:3749/fft
  http://127.0.0.1:3749/debug
```

`levels-server.js` is a demo server that also uses port `3748`; do not run it
at the same time as the real VU bridge.

To test the VU bridge manually:

```powershell
Set-Location "widgets\VU Meter Onkyo - Manny"
node audio-server.js
```

To test the Spectrum bridge manually:

```powershell
Set-Location "widgets\SpectrumAnalyzer-v1.0.1 1"
node "spectrum-server 2.js"
```

Open the corresponding `/debug` URL in a browser while audio is playing.

## Widget Loading

`web-server.js` serves static files and exposes `GET /api/widgets`. The endpoint
returns each directory under `widgets\` that contains `index.html`, together
with available manifest data and icon paths.

`runner-v2.js` then normalizes manifest fields, builds an iframe shell, injects
compatibility globals before widget code runs, adds defaults for bundled
widgets, stores runner settings in local storage, and tracks bridge
reachability.

Dropped widget folders last only for the current browser session. To make a
widget permanent, add its folder beneath `widgets\`.

## Configuration

`app-config.js` exposes:

```js
window.ICUE_RUNNER_CONFIG = {
  showWindowControls: true
};
```

Set `showWindowControls` to `false` to hide the custom minimize, maximize, and
close buttons in the frameless Electron window.

## Packaging

Create a clean Windows ZIP from the repository root:

```powershell
npm run package:runner
```

This creates `icue_widget_runner_engine_windows.zip` without `node_modules`, Electron
binaries, Git metadata, or old package output. Recipients install dependencies
with `npm install` after extraction.

To create a 7z archive when 7-Zip is installed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-runner.ps1 -Format 7z
```

## Troubleshooting

- Run the launcher from the repository root, where `package.json` and
  `run-all.bat` are located.
- If Node.js is not found, install Node.js LTS, open a new terminal, and verify
  `node --version` and `npm --version`.
- If Electron is missing, run `npm install` from the repository root. The
  launcher otherwise attempts Chrome app mode.
- If Chrome app mode fails, confirm `chrome.exe` is installed and available on
  `PATH`, or use Electron mode.
- If the UI opens but audio widgets do not react, play audio through the default
  Windows output device and open the bridge `/debug` pages.
- If a bridge cannot compile its helper, verify the .NET Framework 4.x
  `csc.exe` path shown in Prerequisites.
- If a port is already in use, stop duplicate Node processes. The primary ports
  are `8080`, `3748`, and `3749`.
- Do not run demo mode and the real VU bridge together because both use port
  `3748`.
