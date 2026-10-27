/**
 * SUKOT MESSENGER — Windows desktop wrapper (Electron)
 * Loads the SUKOT MESSENGER web app in a native window.
 *
 * ⚠️ آدرس سایت خود را در APP_URL زیر جایگزین کنید
 */
const { app, BrowserWindow, shell, Menu } = require("electron");

// ─── تنظیمات ──────────────────────────────────────────────
const APP_URL = "https://YOUR-SUKOT-SITE.example.com";
// ───────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 480,
    minHeight: 640,
    backgroundColor: "#0b0614",
    title: "SUKOT MESSENGER",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL(APP_URL);

  // open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
