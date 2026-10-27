// Headroom als Mac-App: lädt den fertigen Vite-Build über ein eigenes Protokoll.
// Ein fester Ursprung (app://headroom) sorgt dafür, dass IndexedDB und localStorage
// zwischen Starts erhalten bleiben und absolute Pfade wie /assets/... funktionieren.
const { app, BrowserWindow, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');

const SCHEME = 'app';
const ORIGIN = SCHEME + '://headroom';

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

// Fertige App: Build liegt in den Ressourcen. Beim Testen aus dem Repo: ../app/dist.
const webRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..', 'app', 'dist');

function fileFor(requestUrl) {
  const { pathname } = new URL(requestUrl);
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  const resolved = path.resolve(webRoot, relative);
  // Nichts außerhalb des Build-Ordners ausliefern.
  if (resolved !== webRoot && !resolved.startsWith(webRoot + path.sep)) return null;
  if (relative && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  // Unbekannte Pfade (z. B. App-Routen) bekommen die Startseite.
  return path.join(webRoot, 'index.html');
}

function isExternal(url) {
  return /^(https?|mailto|tel):/i.test(url);
}

function createWindow() {
  const window = new BrowserWindow({
    width: 480,
    height: 900,
    minWidth: 360,
    minHeight: 640,
    title: 'Headroom',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F8F9FB',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // Links zu Quellen, ELSTER usw. im Standardbrowser öffnen, nicht in der App.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(ORIGIN)) return;
    event.preventDefault();
    if (isExternal(url)) void shell.openExternal(url);
  });
  void window.loadURL(ORIGIN + '/');
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, (request) => {
    // Ohne Demo-Server: API-Aufrufe klar als offline beantworten, die App zeigt dann ihren Hinweis.
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/') || pathname === '/health') {
      return Response.json({ error: 'offline' }, { status: 503 });
    }
    const file = fileFor(request.url);
    if (!file) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
