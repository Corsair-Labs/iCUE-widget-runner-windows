# iCue_Widget_Runner_Engine

The runner now uses a flattened root layout. Run `run-all.bat` from this project
root:

iCue_Widget_Runner_Engine\
  package.json
  package-lock.json
  main.js
  preload.js
  README.txt
  run-all.bat
  app-config.js
  index.html
  web-server.js
  levels-server.js
  runner-v2.js
  common\
    tools\
  scripts\
    start-electron.js
    package-runner.ps1
  widgets\
    ...


## Packaging script

Run this from the repo root:

```powershell
npm run package:runner
```

It creates:

```text
iCue_Widget_Runner_Engine.zip
```

The zip includes only the fresh-install package files:

```text
package.json
package-lock.json
main.js
preload.js
scripts\start-electron.js
scripts\package-runner.ps1
run-all.bat
app-config.js
index.html
web-server.js
levels-server.js
runner-v2.js
common\...
widgets\...
```

It does not include `node_modules`, Electron binaries, old runner folders, or `.git`.

For `.7z`, run the PowerShell script directly. This requires 7-Zip to be installed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-runner.ps1 -Format 7z
```
