/**
 * SUKOT MESSENGER — Windows desktop wrapper (Electron)
 * Loads the SUKOT MESSENGER web app in a native window.
 *
 * 🌐 آدرس سرور در APP_URL تنظیم می‌شود
 * اگر سرور در دسترس نباشد، برنامه هر ۵ ثانیه به‌صورت خودکار دوباره تلاش می‌کند
 */
const { app, BrowserWindow, shell, Menu } = require("electron");

// ─── تنظیمات ──────────────────────────────────────────────
const APP_URL = "https://preview-chat-3fd46f3c-fade-49e4-a7c1-0333d3f54379.space-z.ai";
const RETRY_SECONDS = 5;
// ───────────────────────────────────────────────────────────

let mainWindow = null;

const errorPageHtml = `
<html dir="rtl"><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0b0614;font-family:Tahoma,sans-serif;">
<div style="text-align:center;">
  <div style="font-size:64px;color:#ffb020;">⚠</div>
  <div style="color:#fff;font-size:22px;font-weight:bold;margin:16px 0 8px;">اتصال برقرار نشد</div>
  <div style="color:#9b8fb0;font-size:14px;margin-bottom:24px;">اتصال اینترنت را بررسی کنید... تلاش مجدد تا <span id="c">${RETRY_SECONDS}</span> ثانیه دیگر</div>
  <div style="color:#b026ff;font-size:26px;font-weight:bold;letter-spacing:4px;">SUKOT</div>
</div>
<script>
  let s = ${RETRY_SECONDS};
  setInterval(() => { s--; const el = document.getElementById('c'); if (el) el.textContent = s; }, 1000);
</script>
</body></html>`;

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
  loadApp();

  // auto-retry when the server is unreachable
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame) return;
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(errorPageHtml));
    setTimeout(loadApp, RETRY_SECONDS * 1000);
  });

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

function loadApp() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(APP_URL).catch(() => {});
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
