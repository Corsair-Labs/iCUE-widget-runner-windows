const http = require('http');
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

const DEFAULT_RUNNER_DIR = __dirname;
const runnerDir = path.resolve(process.env.ICUE_WIDGET_RUNNER_DIR || DEFAULT_RUNNER_DIR);
const webServerPath = path.join(runnerDir, 'web-server.js');

if (!fs.existsSync(webServerPath)) {
    console.error(`Runner web server was not found: ${webServerPath}`);
    process.exit(1);
}

const { HOST, PORT, startServer } = require(webServerPath);
console.log(`Using runner directory: ${runnerDir}`);

let mainWindow;
let webServer;
const APP_URL = `http://${HOST}:${PORT}/`;
const HEALTH_URL = `${APP_URL}api/widgets`;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ping(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, res => {
            res.resume();
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
                return;
            }

            reject(new Error(`${url} returned ${res.statusCode}`));
        });

        req.setTimeout(500, () => {
            req.destroy(new Error(`Timed out waiting for ${url}`));
        });
        req.on('error', reject);
    });
}

async function waitForServer(url, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;

    while (Date.now() < deadline) {
        try {
            await ping(url);
            return;
        } catch (error) {
            lastError = error;
            await sleep(100);
        }
    }

    throw lastError || new Error(`Timed out waiting for ${url}`);
}

function startLocalWebServer() {
    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = fn => value => {
            if (settled) return;
            settled = true;
            fn(value);
        };

        webServer = startServer({
            onError(error) {
                if (error.code === 'EADDRINUSE') {
                    console.warn(`Port ${PORT} is already in use; loading the existing local server.`);
                    webServer = null;
                    settle(resolve)();
                    return;
                }

                settle(reject)(error);
            },
            onListening: settle(resolve)
        });
    });
}

async function createWindow() {
    await startLocalWebServer();
    await waitForServer(HEALTH_URL);

    mainWindow = new BrowserWindow({
        width: 1100,
        height: 720,
        minWidth: 520,
        minHeight: 360,
        frame: false, // Frameless window
        resizable: true, // Allow resizing
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#111111',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.loadURL(APP_URL); // Load your web page

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow).catch(error => {
    console.error(error);
    app.quit();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (webServer) {
        webServer.close();
        webServer = null;
    }
});

function getSenderWindow(event) {
    return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.on('window:minimize', event => {
    const win = getSenderWindow(event);
    if (win) win.minimize();
});

ipcMain.on('window:toggle-maximize', event => {
    const win = getSenderWindow(event);
    if (!win) return;

    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.on('window:close', event => {
    const win = getSenderWindow(event);
    if (win) win.close();
});
