iCUE Widget Runner v7

Use
---
Before running the app, check and complete the Fresh Windows prerequisites once:

1. Put each widget in its own subfolder under widgets\
2. Start the full runner from the project root. This is the normal daily-use
   startup because it opens the Electron UI and starts both audio bridges.

     .\run-all.bat

   If Electron is not installed, run-all.bat falls back to Chrome app mode.
   The widgets still open in Chrome, but the window is not optimized like the
   Electron app and will not behave as a frameless app-style widget runner.

   You can also double-click this file in File Explorer:

     run-all.bat

3. Edit app-config.js only if you want to show or hide the Electron window
   control buttons.
4. See Launcher modes below for VU-only, Spectrum-only, browser, and demo modes.

Developer/debug startup:

  run-all.bat web

Run this from the runner folder only when you want to test or debug the Electron
UI by itself. It starts the Electron UI and local web server for this folder, but
it does not start the VU bridge on port 3748 or the Spectrum bridge on port
3749. Most users should use run-all.bat instead.


Fresh Windows prerequisites
---------------------------
Complete this section once on a fresh Windows install before running the app.

Required installs:
- Node.js LTS, which includes npm.
- Electron, installed locally by npm from this repo's package.json/package-lock.json.

1. Install Node.js LTS.

   Option A - install from PowerShell with winget:

     winget install --id OpenJS.NodeJS.LTS --source winget

   Option B - download and run the Windows installer:

     https://nodejs.org

   Use the LTS Windows installer. Keep the installer defaults, especially the
   option that adds Node.js to PATH.

2. Open a new PowerShell or Command Prompt window.

   This is important after installing Node.js because an already-open terminal
   may not have the updated PATH.

3. Verify Node.js and npm are available:

     node --version
     npm --version

   If either command is not found, reinstall Node.js and make sure "Add to PATH"
   is enabled in the installer.

4. Install Electron and the app's npm dependencies.

   Electron is not installed with Windows and does not need a separate manual
   download. Run npm install once from the repo root; npm reads package.json and
   package-lock.json, then installs Electron under node_modules\.

     cd D:\PROJECTS\ICUE_WIDGETS\Windows_iCue_Widget_Runner_Engine
     npm install

   After this finishes, this file should exist:

     node_modules\electron\dist\electron.exe

5. Browser mode note.

   Chrome or Edge is not required for normal use. The default launcher opens the
   Electron app, and Electron includes its own Chromium runtime. Install Chrome
   or Edge only if you plan to use:

     run-all.bat browser

6. Verify the Windows C# compiler for the audio bridges.

   The VU and Spectrum audio bridges compile a small WASAPI helper at startup.
   On most Windows 10/11 installs, .NET Framework 4.x and csc.exe are already
   present.

   Open PowerShell from any folder and run this exact command:

     Test-Path "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

   Expected result:

     True

   Optional PowerShell version check:

     & "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /help

   If you are using Command Prompt instead of PowerShell, use this cmd.exe
   syntax instead:

     if exist "%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (echo Found) else (echo Missing)

   Do not paste $env:WINDIR\... into Command Prompt; $env: is PowerShell syntax.
   If the PowerShell Test-Path command returns False, run Windows Update and
   enable/install .NET Framework 4.x, then check again.

Package for sharing
-------------------
From the repo root, create a fresh-Windows zip package with:

  npm run package:runner

This creates:

  iCue_Widget_Runner_Engine.zip

To create a .7z archive instead, run the script directly with -Format 7z:

  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-runner.ps1 -Format 7z

The .7z option requires 7-Zip to be installed.

Launcher modes
--------------
run-all.bat             Starts VU bridge, Spectrum bridge, and the Electron UI
run-all.bat vu          Starts only the VU bridge and Electron UI
run-all.bat spectrum    Starts only the Spectrum bridge and Electron UI
run-all.bat web         Developer/debug mode: starts only the Electron UI
run-all.bat browser     Starts the web UI in Chrome app mode
run-all.bat demo        Starts the Node dummy levels server and Electron UI

Audio bridges
-------------
- VU Meter: widgets\VU Meter Onkyo - Manny\audio-server.js on http://127.0.0.1:3748/levels
- Spectrum Analyzer: widgets\SpectrumAnalyzer-v1.0.1 1\spectrum-server 2.js on http://127.0.0.1:3749/fft
- The dummy levels-server.js also uses port 3748, so do not run it with the real VU bridge.

Notes
-----
- This version uses Node.js only. No Python install is required.
- The Node web server auto-detects widgets using /api/widgets.
- The Electron app starts the web server itself when launched by run-all.bat.
- Set showWindowControls in app-config.js to show or hide the Electron window buttons.
- No widgets/index.json file is needed
- Drag-and-drop widget folders is supported from Chrome/Edge
- Dropped widgets are temporary for the current browser session
