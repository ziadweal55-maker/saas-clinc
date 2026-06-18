process.env.TZ = 'Africa/Cairo';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const logger = require('./logger');
const XLSX = require('xlsx');

// --- Unhandled Error/Rejection Handlers for Debugging ---
process.on('uncaughtException', (error) => {
  logger.critical('Main Process', `Unhandled Exception: ${error.message}`, { stack: error.stack });
  console.error('[CRITICAL] Unhandled Exception:', error);
  setTimeout(() => {
    app.quit();
  }, 500);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Main Process', `Unhandled Rejection: ${String(reason)}`);
  console.error('[ERROR] Unhandled Rejection:', reason);
});

// --- IPC / API Bridge Registry ---
const apiRegistry = {};
const originalHandle = ipcMain.handle;
ipcMain.handle = function(channel, handler) {
  apiRegistry[channel] = handler;
  return originalHandle.apply(this, arguments);
};

// --- Active User Sessions Store (In-Memory) ---
const activeSessions = new Map();

// Periodic GC for expired sessions (run every 10 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [username, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 30000) {
      activeSessions.delete(username);
    }
  }
}, 10000);

ipcMain.handle('update-active-session', (event, { username, role, currentView }) => {
  if (!username || typeof username !== 'string') return { success: false, error: 'Invalid username' };
  
  let ip = 'Local Desktop';
  if (event.request) {
    const remoteAddress = event.request.socket.remoteAddress;
    ip = remoteAddress ? remoteAddress.replace('::ffff:', '') : 'Unknown';
    if (ip === '::1' || ip === '127.0.0.1') {
      ip = 'Local Server';
    }
  }
  
  activeSessions.set(username, {
    username,
    role: role || 'user',
    currentView: currentView || 'dashboard',
    ip,
    lastSeen: Date.now()
  });
  return { success: true };
});

ipcMain.handle('get-active-sessions', () => {
  const now = Date.now();
  const list = [];
  for (const session of activeSessions.values()) {
    if (now - session.lastSeen <= 30000) {
      list.push({
        username: session.username,
        role: session.role,
        currentView: session.currentView,
        ip: session.ip,
        lastSeen: session.lastSeen
      });
    }
  }
  return list;
});

ipcMain.handle('remove-active-session', (event, username) => {
  if (username && typeof username === 'string') {
    activeSessions.delete(username);
  }
  return { success: true };
});

// --- Branch Session State (in-memory, set after admin picks branch) ---
let currentBranchId = 1; // Default to Branch 1

ipcMain.handle('get-branches', async () => {
  try {
    return db.prepare('SELECT * FROM Branches WHERE is_active = 1 ORDER BY id ASC').all();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('get-all-branches', async () => {
  try {
    return db.prepare('SELECT * FROM Branches ORDER BY id ASC').all();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('set-current-branch', async (event, branchId) => {
  const bid = parseInt(branchId);
  if (isNaN(bid)) return { success: false, error: 'Invalid branch ID' };
  currentBranchId = bid;
  console.log(`[Branch] Active branch set to: ${currentBranchId}`);
  return { success: true, branchId: currentBranchId };
});

ipcMain.handle('get-current-branch', async () => {
  try {
    const branch = db.prepare('SELECT * FROM Branches WHERE id = ?').get(currentBranchId);
    return branch || null;
  } catch (error) {
    return null;
  }
});

ipcMain.handle('add-branch', async (event, name) => {
  try {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Branch name is required.' };
    }
    const trimmed = name.trim();
    const res = db.prepare("INSERT INTO Branches (name, is_active, created_at) VALUES (?, 1, datetime('now','localtime'))").run(trimmed);
    return { success: true, id: res.lastInsertRowid, name: trimmed };
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return { success: false, error: 'A branch with this name already exists.' };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-branch', async (event, { branchId, newName }) => {
  try {
    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      return { success: false, error: 'Branch name is required.' };
    }
    const bid = parseInt(branchId);
    if (isNaN(bid)) return { success: false, error: 'Invalid branch ID' };
    db.prepare('UPDATE Branches SET name = ? WHERE id = ?').run(newName.trim(), bid);
    return { success: true };
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return { success: false, error: 'A branch with this name already exists.' };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('deactivate-branch', async (event, branchId) => {
  try {
    const bid = parseInt(branchId);
    if (isNaN(bid)) return { success: false, error: 'Invalid branch ID' };
    if (bid === 1) return { success: false, error: 'Cannot deactivate the primary branch.' };
    db.prepare('UPDATE Branches SET is_active = 0 WHERE id = ?').run(bid);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reactivate-branch', async (event, branchId) => {
  try {
    const bid = parseInt(branchId);
    if (isNaN(bid)) return { success: false, error: 'Invalid branch ID' };
    db.prepare('UPDATE Branches SET is_active = 1 WHERE id = ?').run(bid);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

const { getDatabase, reloadDatabase } = require('./database');

// Get Local IP Address - Improved to find real network IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    // Skip virtual/docker/internal/tailscale interfaces for local IP
    if (name.toLowerCase().includes('vbox') || 
        name.toLowerCase().includes('docker') || 
        name.toLowerCase().includes('virtual') || 
        name.toLowerCase().includes('tailscale') || 
        name.toLowerCase().includes('wsl')) continue;

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        // Tailscale IPs start with 100.
        if (ip.startsWith('100.')) continue;

        // Prioritize common local network ranges
        if (ip.startsWith('192.168.') || ip.startsWith('10.')) {
          return ip;
        }
        candidates.push(ip);
      }
    }
  }
  return candidates[0] || 'localhost';
}

// Get Tailscale VPN IP Address if running
function getTailscaleIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        // Tailscale CGNAT IP range is 100.64.0.0/10
        if (ip.startsWith('100.')) {
          const parts = ip.split('.').map(Number);
          if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
            return ip;
          }
        }
        if (name.toLowerCase().includes('tailscale')) {
          return ip;
        }
      }
    }
  }
  return null;
}

const PORT = 3000;
const localIp = getLocalIp();
const localUrl = `http://${localIp}:${PORT}`;
const tailscaleIp = getTailscaleIp();
const tailscaleUrl = tailscaleIp ? `http://${tailscaleIp}:${PORT}` : null;

// Simple Static Server for Mobile Access
function startLocalServer() {
  // Use app.getAppPath() to find the dist folder reliably in production
  const baseAppPath = app.getAppPath();
  const distPath = path.join(baseAppPath, 'dist');

  console.log(`[Local Server] Searching for assets in: ${distPath}`);

  const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];

    // Health Check
    if (url === '/ping') {
      res.writeHead(200);
      res.end('pong');
      return;
    }

    // Handle Serving Static Files to Mobile
    if (url.startsWith('/files/')) {
      const fileName = url.replace('/files/', '');
      const safeBaseName = path.basename(fileName);
      const userDataPath = app.getPath('userData');
      const filePath = path.join(userDataPath, 'client_files', safeBaseName);

      fs.readFile(filePath, (error, content) => {
        if (error) {
          res.writeHead(404);
          res.end('File not found');
        } else {
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
          };
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
          res.end(content);
        }
      });
      return;
    }

    // Handle Mobile Specific Upload Document Endpoint
    if (url === '/api/upload-document-mobile' || url === '/api/uploadDocumentMobile') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          let clientId, fileName, fileData;
          if (Array.isArray(parsed)) {
            [clientId, fileName, fileData] = parsed;
          } else {
            ({ clientId, fileName, fileData } = parsed);
          }

          if (!clientId || !fileName || !fileData) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing parameters' }));
            return;
          }

          // Extract base64 content
          const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          let base64Data = fileData;
          if (matches && matches.length === 3) {
            base64Data = matches[2];
          }

          // Security check: Size limit (10MB)
          const sizeInBytes = (base64Data.length * 3) / 4;
          if (sizeInBytes > 10 * 1024 * 1024) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'File size exceeds the 10MB limit.' }));
            return;
          }

          // Security check: Extension check
          const ext = path.extname(fileName).toLowerCase();
          const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
          if (!allowedExtensions.includes(ext)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG, WEBP.' }));
            return;
          }

          const buffer = Buffer.from(base64Data, 'base64');
          const sanitizedBaseName = path.basename(fileName);
          const safeFileName = Date.now() + '_' + sanitizedBaseName.replace(/\s+/g, '_');

          const userDataPath = app.getPath('userData');
          const filesDir = path.join(userDataPath, 'client_files');
          if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true });
          }

          const destPath = path.join(filesDir, safeFileName);
          fs.writeFileSync(destPath, buffer);

          const stmt = db.prepare(
            'INSERT INTO ClientFiles (client_id, file_name, local_file_path, upload_date) VALUES (?, ?, ?, datetime(\'now\', \'localtime\'))'
          );
          stmt.run(clientId, sanitizedBaseName, destPath);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, fileName: sanitizedBaseName }));
        } catch (e) {
          console.error('[DOCS] Error uploading mobile document:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // Handle Mobile Specific Upload InBody endpoint
    if (url === '/api/upload-inbody-mobile' || url === '/api/uploadInbodyMobile' || url === '/api/uploadInbodyPhoto') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          let profileId, fileName, fileData;
          if (Array.isArray(parsed)) {
            [profileId, fileName, fileData] = parsed;
          } else {
            ({ profileId, fileName, fileData } = parsed);
          }

          if (!profileId || !fileName || !fileData) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing parameters' }));
            return;
          }

          // Extract base64 content
          const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          let base64Data = fileData;
          if (matches && matches.length === 3) {
            base64Data = matches[2];
          }

          // Security check: Size limit (10MB)
          const sizeInBytes = (base64Data.length * 3) / 4;
          if (sizeInBytes > 10 * 1024 * 1024) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'File size exceeds the 10MB limit.' }));
            return;
          }

          // Security check: Extension check
          const ext = path.extname(fileName).toLowerCase();
          const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
          if (!allowedExtensions.includes(ext)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG, WEBP.' }));
            return;
          }

          const buffer = Buffer.from(base64Data, 'base64');
          const sanitizedBaseName = path.basename(fileName);
          const safeFileName = Date.now() + '_inbody_' + sanitizedBaseName.replace(/\s+/g, '_');

          const userDataPath = app.getPath('userData');
          const filesDir = path.join(userDataPath, 'client_files');
          if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true });
          }

          const destPath = path.join(filesDir, safeFileName);
          fs.writeFileSync(destPath, buffer);

          const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Cairo' });
          const resDb = db.prepare(
            "INSERT INTO InbodyUploads (profile_id, file_name, local_file_path, session_date, upload_date) VALUES (?, ?, ?, ?, datetime('now','localtime'))"
          );
          const resRun = resDb.run(profileId, sanitizedBaseName, destPath, today);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            id: resRun.lastInsertRowid, 
            fileName: sanitizedBaseName, 
            local_file_path: destPath, 
            session_date: today 
          }));
        } catch (e) {
          console.error('[INBODY] Error uploading mobile photo:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // Handle API Requests from Mobile
    if (url.startsWith('/api/')) {
      const channel = url.replace('/api/', '');
      
      // Try exact match then hyphenated version (camelCase to kebab-case)
      let handler = apiRegistry[channel];
      if (!handler) {
        const hyphenated = channel
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
          .toLowerCase();
        handler = apiRegistry[hyphenated];
      }

      if (handler) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const args = body ? JSON.parse(body) : [];
            const callArgs = Array.isArray(args) ? args : [args];
            console.log(`[Local API] Calling ${channel} (mapped to ${handler.name || 'anonymous'})`);
            const result = await handler({ sender: { send: () => {} }, request: req }, ...callArgs);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result !== undefined ? result : { success: true }));
          } catch (e) {
            console.error(`[Local API] Error in ${channel}:`, e);
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
      } else {
        console.warn(`[Local API] Method not found: ${channel}`);
        res.writeHead(404);
        res.end(JSON.stringify({ error: `API Method Not Found: ${channel}` }));
      }
      return;
    }

    // Helper to serve index.html with polyfill
    const serveIndex = () => {
      const indexPath = path.join(distPath, 'index.html');
      fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Application not built. Run npm run build first.');
          return;
        }

        const polyfill = `
          <script>
            (function() {
              window.isMobilePortal = true;
              if (!window.api) {
                window.api = new Proxy({}, {
                  get(target, prop) {
                    if (prop === 'openFile' || prop === 'openDocument') {
                      return (filePath) => {
                        const parts = filePath.split(/[\\\\/]/);
                        const fileName = parts[parts.length - 1];
                        window.open('/files/' + fileName, '_blank');
                        return Promise.resolve({ success: true });
                      };
                    }
                    return (...args) => {
                      return fetch('/api/' + prop, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(args)
                      })
                      .then(r => r.ok ? r.json() : { success: false, error: 'Server error' })
                      .catch(err => ({ success: false, error: err.message }));
                    }
                  }
                });
              }
            })();
          </script>
        `;
        const html = data.replace(/<head[^>]*>/i, (match) => match + polyfill);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      });
    };

    // Routing Logic
    if (url === '/' || !path.extname(url)) {
      serveIndex();
    } else {
      const filePath = path.join(distPath, url);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
      };

      fs.readFile(filePath, (error, content) => {
        if (error) {
          serveIndex(); // Fallback for SPA
        } else {
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
          res.end(content);
        }
      });
    }
  });

  server.on('error', (err) => {
    logger.error('Local Server', `HTTP local server error: ${err.message}`, { error: err.stack || err });
    if (err.code === 'EADDRINUSE') {
      logger.warn('Local Server', `Port ${PORT} is already in use by another application. Mobile features using this port will not be available locally.`);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Local Server] Running at ${localUrl}`);
    if (tailscaleUrl) {
      console.log(`[Local Server] Tailscale VPN running at ${tailscaleUrl}`);
    }
  });
}
// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const { syncPatientPlan, syncAppointments, syncUsers, supabase, processSyncQueue } = require('./sync');

const { GoogleGenerativeAI } = require("@google/generative-ai");

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Initialize Gemini with safety check
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('CRITICAL: GEMINI_API_KEY not found in .env or environment variables!');
}

const genAI = new GoogleGenerativeAI(apiKey || 'MISSING_KEY');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Intercept target="_blank" links and open in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow http/https protocols for security
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url).catch((err) => {
        console.error('Failed to open external link:', err);
      });
    }
    return { action: 'deny' };
  });

  // Check if running in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  // Initialize database before creating window
  db = await getDatabase();

  // Run auto-archive job on startup and set daily interval
  runAutoArchiveJob();
  setInterval(runAutoArchiveJob, 24 * 60 * 60 * 1000);

  // Run background sync on startup and set 5-minute interval
  setTimeout(runBackgroundSyncJob, 10000);
  setInterval(runBackgroundSyncJob, 5 * 60 * 1000);

  // Start local network server
  startLocalServer();

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Add IPC handler for local URL
ipcMain.handle('get-local-url', () => localUrl);
ipcMain.handle('get-tailscale-url', () => tailscaleUrl);

// --- Auto-Archive System ---
function runAutoArchiveJob() {
  if (!db) return;
  try {
    console.log('[Auto-Archive] Checking for inactive patients (4 weeks)...');
    db.prepare(`
      UPDATE Clients
      SET is_active = 0
      WHERE is_active = 1
        AND created_at < datetime('now', '-28 days')
        AND id NOT IN (
          SELECT client_id FROM Sessions WHERE session_date >= datetime('now', '-28 days')
          UNION
          SELECT client_id FROM Appointments WHERE appointment_date >= datetime('now', '-28 days')
          UNION
          SELECT client_id FROM Assessments WHERE created_at >= datetime('now', '-28 days')
          UNION
          SELECT client_id FROM Payments WHERE payment_date >= datetime('now', '-28 days')
          UNION
          SELECT client_id FROM ClientExercises WHERE assigned_at >= datetime('now', '-28 days')
        )
    `).run();

    const res = db.prepare("SELECT changes() as count").get();
    if (res && res.count > 0) {
      console.log(`[Auto-Archive] Successfully archived ${res.count} inactive patients.`);
    } else {
      console.log('[Auto-Archive] No inactive patients found to archive.');
    }
  } catch (error) {
    console.error('[Auto-Archive] Error running auto-archive job:', error);
  }
}

// --- Audit System ---
async function logAudit(clientId, field, oldValue, newValue, adminUsername) {
  try {
    db.prepare(`
      INSERT INTO AuditLogs (client_id, changed_field, old_value, new_value, admin_username, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(clientId, field, String(oldValue), String(newValue), adminUsername);
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

// --- IPC Handlers for Doctors ---
ipcMain.handle('get-doctors', async () => {
  try {
    return db.prepare("SELECT * FROM Doctors WHERE branch_id = ? AND status != 'deleted' ORDER BY name").all(currentBranchId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('delete-doctor', async (event, id) => {
  try {
    const docId = parseInt(id);
    if (isNaN(docId)) throw new Error('Invalid doctor ID');
    db.prepare("UPDATE Doctors SET status = 'deleted' WHERE id = ?").run(docId);
    db.prepare('DELETE FROM Users WHERE doctor_id = ?').run(docId);
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    return { success: true };
  } catch (error) {
    console.error('Error deleting doctor:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-active-doctors', async () => {
  try {
    return db.prepare("SELECT * FROM Doctors WHERE status = 'active' AND branch_id = ? ORDER BY name").all(currentBranchId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('add-doctor', async (event, data) => {
  try {
    const res = db.prepare('INSERT INTO Doctors (name, specialty, status, branch_id, created_at) VALUES (?, ?, ?, ?, datetime(\'now\', \'localtime\'))').run(data.name, data.specialty, data.status, currentBranchId);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-doctor', async (event, id, data) => {
  try {
    db.prepare('UPDATE Doctors SET name = ?, specialty = ?, status = ? WHERE id = ?').run(data.name, data.specialty, data.status, id);
    // Also sync status with linked user account if exists
    const userStatus = data.status === 'inactive' ? 'frozen' : 'active';
    db.prepare('UPDATE Users SET status = ? WHERE doctor_id = ?').run(userStatus, id);
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- IPC Handlers for Assessments ---
ipcMain.handle('get-assessments', async (event, clientId) => {
  try {
    return db.prepare(`
      SELECT Assessments.*, Doctors.name as doctor_name 
      FROM Assessments 
      LEFT JOIN Doctors ON Assessments.doctor_id = Doctors.id
      WHERE client_id = ? 
      ORDER BY assessment_date DESC
    `).all(clientId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('create-assessment', async (event, data) => {
  try {
    const { client_id, doctor_id, diagnosis, pain_scale, rom, strength, recommendations, is_completed } = data;
    const res = db.prepare(`
      INSERT INTO Assessments (client_id, doctor_id, diagnosis, pain_scale, rom, strength, recommendations, is_completed, created_at, assessment_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), date('now', 'localtime'))
    `).run(client_id, doctor_id, diagnosis, pain_scale, rom, strength, recommendations, is_completed ? 1 : 0);
    
    // Log audit
    logAudit(client_id, 'Assessment', 'None', `New Assessment by Doc ${doctor_id}`, 'admin');
    
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update an existing assessment
ipcMain.handle('update-assessment', async (event, assessmentId, data) => {
  try {
    const aid = parseInt(assessmentId);
    const { doctor_id, diagnosis, pain_scale, rom, strength, recommendations, is_completed } = data;
    
    if (isNaN(aid)) throw new Error('Invalid Assessment ID');

    // Fetch the client ID for this assessment to run audit
    const assessment = db.prepare('SELECT client_id FROM Assessments WHERE id = ?').get(aid);
    if (!assessment) throw new Error('Assessment not found');
    const cid = assessment.client_id;

    db.prepare(`
      UPDATE Assessments 
      SET doctor_id = ?, diagnosis = ?, pain_scale = ?, rom = ?, strength = ?, recommendations = ?, is_completed = ?
      WHERE id = ?
    `).run(doctor_id, diagnosis, pain_scale, rom, strength, recommendations, is_completed ? 1 : 0, aid);

    logAudit(cid, 'Assessment', `Assessment #${aid}`, `Updated assessment details`, 'admin');
    return { success: true };
  } catch (error) {
    console.error('Error updating assessment:', error);
    return { success: false, error: error.message };
  }
});

// Delete an existing assessment
ipcMain.handle('delete-assessment', async (event, assessmentId) => {
  try {
    const aid = parseInt(assessmentId);
    if (isNaN(aid)) throw new Error('Invalid Assessment ID');

    const assessment = db.prepare('SELECT client_id FROM Assessments WHERE id = ?').get(aid);
    if (!assessment) throw new Error('Assessment not found');
    const cid = assessment.client_id;

    db.prepare('DELETE FROM Assessments WHERE id = ?').run(aid);

    logAudit(cid, 'Assessment', `Assessment #${aid}`, 'Deleted physical assessment', 'admin');
    return { success: true };
  } catch (error) {
    console.error('Error deleting assessment:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-audit-logs', async (event, clientId) => {
  try {
    return db.prepare('SELECT * FROM AuditLogs WHERE client_id = ? ORDER BY timestamp DESC').all(clientId);
  } catch (error) {
    return [];
  }
});

// --- IPC Handlers for Authentication --- //

ipcMain.handle('check-users-exist', async () => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM Users').get().count;
    return userCount > 0;
  } catch (error) {
    console.error('Error checking users existence:', error);
    return false;
  }
});

ipcMain.handle('setup-admin', async (event, { username, password, role, doctor_id, branch_id }) => {
  try {
    const hashedPassword = hashPassword(password);
    const bid = branch_id ? parseInt(branch_id) : (role === 'admin' ? null : 1);
    db.prepare('INSERT INTO Users (username, password_hash, role, doctor_id, branch_id) VALUES (?, ?, ?, ?, ?)').run(username, hashedPassword, role || 'admin', doctor_id || null, bid);
    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    return { success: true };
  } catch (error) {
    console.error('Error setting up admin:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('login-user', async (event, { username, password }) => {
  try {
    // Master Root Account Check
    if (username === 'root' && password === 'P@ssw0rd') {
      return { success: true, user: { id: 0, username: 'root', role: 'admin', isRoot: true, branch_id: null } };
    }

    const user = db.prepare('SELECT * FROM Users WHERE username = ?').get(username);
    if (!user) return { success: false, error: 'User not found' };

    if (user.status === 'pending') {
      return { success: false, error: 'Your account request is pending administrator approval.' };
    }

    if (user.status === 'denied') {
      return { success: false, error: 'Your account request has been denied.' };
    }

    if (user.status === 'frozen') {
      return { success: false, error: 'This account has been frozen. Please contact the administrator.' };
    }

    if (verifyPassword(password, user.password_hash)) {
      return { success: true, user: { id: user.id, username: user.username, role: user.role, doctor_id: user.doctor_id, branch_id: user.branch_id || 1 } };
    } else {
      return { success: false, error: 'Invalid password' };
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
});

// --- Pending User Registration & Approval Handlers ---

ipcMain.handle('register-pending-user', async (event, data) => {
  try {
    const { branchId, role, username, password, firstName, lastName, specialty } = data;
    
    // 1. Validation
    if (!username || !password || password.length < 6) {
      return { success: false, error: 'Username is required and password must be at least 6 characters.' };
    }
    
    // 2. Check uniqueness of username in Users table (case-insensitive)
    const existingUser = db.prepare('SELECT 1 FROM Users WHERE LOWER(username) = LOWER(?)').get(username.trim());
    if (existingUser) {
      return { success: false, error: 'This username is already taken.' };
    }

    // 3. For doctor, check uniqueness of doctor's full name and create pending doctor profile
    let doctorId = null;
    if (role === 'doctor') {
      if (!firstName || !lastName || !specialty) {
        return { success: false, error: 'First name, last name, and specialty are required for doctor profile.' };
      }
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      const existingDoctor = db.prepare('SELECT 1 FROM Doctors WHERE LOWER(name) = LOWER(?)').get(fullName);
      if (existingDoctor) {
        return { success: false, error: 'A doctor with this name already exists.' };
      }
      
      // Check if username equals doctor name
      const existingUserByName = db.prepare('SELECT 1 FROM Users WHERE LOWER(username) = LOWER(?)').get(fullName);
      if (existingUserByName) {
        return { success: false, error: 'The doctor full name conflicts with an existing username.' };
      }

      // Insert pending doctor profile
      const docRes = db.prepare(
        'INSERT INTO Doctors (name, specialty, status, branch_id, created_at) VALUES (?, ?, \'pending\', ?, datetime(\'now\', \'localtime\'))'
      ).run(fullName, specialty.trim(), parseInt(branchId) || 1);
      
      if (docRes.error) {
        return { success: false, error: `Failed to create doctor profile in database: ${docRes.error}` };
      }
      doctorId = docRes.lastInsertRowid;
    }

    // 4. Hash password and insert pending user
    const hashedPassword = hashPassword(password);
    const bid = parseInt(branchId) || 1;
    
    const userRes = db.prepare(
      'INSERT INTO Users (username, password_hash, role, doctor_id, branch_id, status, created_at) VALUES (?, ?, ?, ?, ?, \'pending\', datetime(\'now\', \'localtime\'))'
    ).run(username.trim(), hashedPassword, role, doctorId, bid);

    if (userRes.error) {
      return { success: false, error: `Failed to create user account in database: ${userRes.error}` };
    }

    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    
    return { success: true };
  } catch (error) {
    logger.error('Database', 'Error registering pending user', { error: error.message, stack: error.stack });
    console.error('Error registering pending user:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-pending-accounts', async () => {
  try {
    return db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.status, 
        u.created_at, 
        u.branch_id, 
        b.name as branch_name, 
        d.name as doctor_name, 
        d.specialty as doctor_specialty 
      FROM Users u 
      LEFT JOIN Branches b ON u.branch_id = b.id 
      LEFT JOIN Doctors d ON u.doctor_id = d.id 
      WHERE u.role IN ('doctor', 'staff') AND u.status IN ('pending', 'active', 'denied')
      ORDER BY u.created_at DESC
    `).all();
  } catch (error) {
    logger.error('Database', 'Error fetching pending accounts', { error: error.message, stack: error.stack });
    console.error('Error fetching pending accounts:', error);
    return [];
  }
});

ipcMain.handle('approve-account-request', async (event, userId) => {
  try {
    const user = db.prepare('SELECT role, doctor_id FROM Users WHERE id = ?').get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const uRes = db.prepare('UPDATE Users SET status = \'active\' WHERE id = ?').run(userId);
    if (uRes.error) {
      return { success: false, error: `Failed to approve user: ${uRes.error}` };
    }
    
    if (user.role === 'doctor' && user.doctor_id) {
      const dRes = db.prepare('UPDATE Doctors SET status = \'active\' WHERE id = ?').run(user.doctor_id);
      if (dRes.error) {
        return { success: false, error: `Failed to activate doctor profile: ${dRes.error}` };
      }
    }
    
    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    
    return { success: true };
  } catch (error) {
    console.error('Error approving account request:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('deny-account-request', async (event, userId) => {
  try {
    const user = db.prepare('SELECT role, doctor_id FROM Users WHERE id = ?').get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const uRes = db.prepare('UPDATE Users SET status = \'denied\' WHERE id = ?').run(userId);
    if (uRes.error) {
      return { success: false, error: `Failed to deny user request: ${uRes.error}` };
    }
    
    if (user.role === 'doctor' && user.doctor_id) {
      const dRes = db.prepare('UPDATE Doctors SET status = \'inactive\' WHERE id = ?').run(user.doctor_id);
      if (dRes.error) {
        return { success: false, error: `Failed to deactivate doctor profile: ${dRes.error}` };
      }
    }
    
    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    
    return { success: true };
  } catch (error) {
    console.error('Error denying account request:', error);
    return { success: false, error: error.message };
  }
});

// --- User Management Handlers (Root Only) ---

ipcMain.handle('get-all-users', async () => {
  try {
    return db.prepare('SELECT id, username, role, doctor_id, status, branch_id FROM Users WHERE branch_id = ? OR branch_id IS NULL OR role = \'admin\'').all(currentBranchId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('reset-user-password', async (event, { userId, newPassword }) => {
  try {
    const hashedPassword = hashPassword(newPassword);
    db.prepare('UPDATE Users SET password_hash = ? WHERE id = ?').run(hashedPassword, userId);
    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-user-account', async (event, userId) => {
  try {
    const user = db.prepare('SELECT role, doctor_id FROM Users WHERE id = ?').get(userId);
    if (user && user.role === 'doctor' && user.doctor_id) {
      db.prepare("UPDATE Doctors SET status = 'inactive' WHERE id = ?").run(user.doctor_id);
    }
    db.prepare('DELETE FROM Users WHERE id = ?').run(userId);
    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-user-status', async (event, { userId, status }) => {
  try {
    db.prepare('UPDATE Users SET status = ? WHERE id = ?').run(status, userId);
    const user = db.prepare('SELECT role, doctor_id FROM Users WHERE id = ?').get(userId);
    if (user && user.role === 'doctor' && user.doctor_id) {
      const doctorStatus = status === 'frozen' ? 'inactive' : 'active';
      db.prepare("UPDATE Doctors SET status = ? WHERE id = ?").run(doctorStatus, user.doctor_id);
    }
    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    return { success: true };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { success: false, error: error.message };
  }
});

// --- Database Path Management ---

ipcMain.handle('db:get-path', async () => {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.dbPath) return config.dbPath;
    }
  } catch (e) {}
  return path.join(userDataPath, 'database', 'clinic.db');
});

ipcMain.handle('db:select-path', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Shared Database File (.db)',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });

  if (canceled || filePaths.length === 0) return null;

  const newPath = filePaths[0];
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');

  try {
    fs.writeFileSync(configPath, JSON.stringify({ dbPath: newPath }, null, 2));
    
    // Notify user and relaunch
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Database Updated',
      message: 'The shared database path has been updated. The application will now restart to apply changes.',
      buttons: ['OK']
    });

    app.relaunch();
    app.exit(0);
    return newPath;
  } catch (error) {
    console.error('[DB Path Select Error]', error);
    return null;
  }
});

ipcMain.handle('reload-database', async () => {
  try {
    db = await reloadDatabase();
    return { success: true };
  } catch (error) {
    console.error('[DB Reload Error]', error);
    return { success: false, error: error.message };
  }
});

// --- IPC Handlers for Database --- //

// Example: Get all clients
ipcMain.handle('get-clients', async () => {
  try {
    const clients = db.prepare(`
      SELECT c.*, (
        SELECT group_concat(cp.profile_type) 
        FROM ClientProfiles cp 
        WHERE cp.client_id = c.id
      ) as profile_types 
      FROM Clients c 
      WHERE c.branch_id = ?
      ORDER BY c.last_name
    `).all(currentBranchId);
    return clients;
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
});

// Example: Create a client
ipcMain.handle('create-client', async (event, clientData) => {
  try {
    const stmt = db.prepare(
      'INSERT INTO Clients (first_name, last_name, phone, age, medical_history, sync_token, pin, address, referral_source, branch_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    );
    const info = stmt.run(
      clientData.first_name, 
      clientData.last_name, 
      clientData.phone, 
      clientData.age ? parseInt(clientData.age) : null,
      clientData.medical_history,
      clientData.sync_token || null,
      clientData.pin || null,
      clientData.address || null,
      clientData.referral_source || null,
      currentBranchId
    );
    
    // Automatically create profile if selected
    if (clientData.profile_type && clientData.profile_type !== 'none') {
      try {
        const existing = db.prepare('SELECT id FROM ClientProfiles WHERE client_id = ? AND profile_type = ?').get(info.lastInsertRowid, clientData.profile_type);
        if (!existing) {
          db.prepare(
            "INSERT INTO ClientProfiles (client_id, profile_type, name, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))"
          ).run(info.lastInsertRowid, clientData.profile_type, `${clientData.first_name}'s Profile`);
        }
      } catch (err) {
        console.error('Error auto-creating profile:', err);
      }
    }
    
    return { success: true, id: info.lastInsertRowid };
  } catch (error) {
    console.error('Error creating client:', error);
    return { success: false, error: error.message };
  }
});

// Get a single client by ID
ipcMain.handle('get-client', async (event, clientId) => {
  try {
    return db.prepare('SELECT * FROM Clients WHERE id = ?').get(clientId);
  } catch (error) {
    console.error('Error fetching client:', error);
    return null;
  }
});

// Update a client
ipcMain.handle('update-client', async (event, clientId, clientData) => {
  try {
    const stmt = db.prepare(
      'UPDATE Clients SET first_name = ?, last_name = ?, phone = ?, age = ?, medical_history = ?, sync_token = ?, pin = ?, address = ?, referral_source = ? WHERE id = ?'
    );
    stmt.run(
      clientData.first_name, 
      clientData.last_name, 
      clientData.phone, 
      clientData.age ? parseInt(clientData.age) : null,
      clientData.medical_history,
      clientData.sync_token,
      clientData.pin,
      clientData.address || null,
      clientData.referral_source || null,
      clientId
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating client:', error);
    return { success: false, error: error.message };
  }
});

// Toggle client active status (Enable/Disable)
ipcMain.handle('toggle-client-status', async (event, clientId, status) => {
  try {
    const stmt = db.prepare('UPDATE Clients SET is_active = ? WHERE id = ?');
    stmt.run(status, clientId);
    return { success: true };
  } catch (error) {
    console.error('Error toggling client status:', error);
    return { success: false, error: error.message };
  }
});

// Delete a client
ipcMain.handle('delete-client', async (event, clientId) => {
  try {
    // Delete related records first to be safe (though some have FK constraints)
    db.prepare('DELETE FROM ClientFiles WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM Sessions WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM Payments WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM Appointments WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM Clients WHERE id = ?').run(clientId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }
});

// Get sessions for a client
ipcMain.handle('get-sessions', async (event, clientId) => {
  try {
    const id = parseInt(clientId);
    return db.prepare(`
      SELECT Sessions.*, Doctors.name as doctor_name, SessionTypes.name as session_type_name
      FROM Sessions 
      LEFT JOIN Doctors ON Sessions.doctor_id = Doctors.id
      LEFT JOIN SessionTypes ON Sessions.session_type_id = SessionTypes.id
      WHERE client_id = ? 
      ORDER BY session_date DESC
    `).all(id);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
});

// Package Sessions Sync Helper
function syncPackageSessions(clientId) {
  try {
    const cid = parseInt(clientId);
    if (isNaN(cid)) return;

    // 1. Get total sessions logged in the database
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM Sessions WHERE client_id = ?').get(cid).count;

    // 2. Fetch all purchased packages
    const packages = db.prepare(
      'SELECT id, package_sessions_total FROM Payments WHERE client_id = ? AND package_sessions_total > 0 ORDER BY payment_date ASC, id ASC'
    ).all(cid);

    // 3. Redistribute sessions
    let remainingSessions = sessionCount;
    for (const pkg of packages) {
      const capacity = pkg.package_sessions_total;
      const used = Math.min(remainingSessions, capacity);
      db.prepare('UPDATE Payments SET package_sessions_used = ? WHERE id = ?').run(used, pkg.id);
      remainingSessions -= used;
    }
    console.log(`[Package Sync] Client ${cid}: Synced ${sessionCount} sessions across ${packages.length} packages.`);
  } catch (err) {
    console.error('[Package Sync Error]', err);
  }
}

// Create a new session
ipcMain.handle('create-session', async (event, sessionData) => {
  try {
    const { client_id, doctor_id, appointment_id, treatment_notes, progress_notes, session_number, payment_amount, payment_method } = sessionData;
    const cid = parseInt(client_id);
    const did = (doctor_id && !isNaN(parseInt(doctor_id))) ? parseInt(doctor_id) : null;
    const aid = (appointment_id && !isNaN(parseInt(appointment_id))) ? parseInt(appointment_id) : null;
    
    if (isNaN(cid)) throw new Error('Invalid Client ID');

    const res = db.prepare(
      'INSERT INTO Sessions (client_id, doctor_id, appointment_id, treatment_notes, progress_notes, session_number, payment_amount, payment_method, branch_id, session_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(cid, did, aid, treatment_notes, progress_notes, session_number, payment_amount || 0, payment_method || 'Other', currentBranchId);
    
    // Automatically re-sync package sessions
    syncPackageSessions(cid);

    logAudit(cid, 'Session', 'None', `New Session #${session_number} by Doc ${did}`, 'admin');

    console.log(`[SUCCESS] Session created for Client ID: ${cid}`);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    console.error(`[CRITICAL ERROR] Failed to create session: ${error.message}`, { sessionData, error });
    return { success: false, error: 'Database failure: ' + error.message };
  }
});

// Update an existing session
ipcMain.handle('update-session', async (event, sessionId, sessionData) => {
  try {
    const sid = parseInt(sessionId);
    const { doctor_id, treatment_notes, progress_notes, session_number, payment_amount, payment_method } = sessionData;
    const did = (doctor_id && !isNaN(parseInt(doctor_id))) ? parseInt(doctor_id) : null;
    
    if (isNaN(sid)) throw new Error('Invalid Session ID');

    // Fetch the client ID for this session to run sync afterwards
    const oldSession = db.prepare('SELECT client_id FROM Sessions WHERE id = ?').get(sid);
    if (!oldSession) throw new Error('Session not found');
    const cid = oldSession.client_id;

    db.prepare(`
      UPDATE Sessions 
      SET doctor_id = ?, treatment_notes = ?, progress_notes = ?, session_number = ?, payment_amount = ?, payment_method = ?
      WHERE id = ?
    `).run(did, treatment_notes, progress_notes, session_number, payment_amount || 0, payment_method || 'Other', sid);

    // Sync package sessions
    syncPackageSessions(cid);

    logAudit(cid, 'Session', `Session #${session_number}`, `Updated Session #${session_number} by Doc ${did}`, 'admin');
    return { success: true };
  } catch (error) {
    console.error('Error updating session:', error);
    return { success: false, error: error.message };
  }
});

// Delete an existing session
ipcMain.handle('delete-session', async (event, sessionId) => {
  try {
    const sid = parseInt(sessionId);
    if (isNaN(sid)) throw new Error('Invalid Session ID');

    const session = db.prepare('SELECT client_id, session_number FROM Sessions WHERE id = ?').get(sid);
    if (!session) throw new Error('Session not found');
    const cid = session.client_id;

    db.prepare('DELETE FROM Sessions WHERE id = ?').run(sid);

    // Sync package sessions
    syncPackageSessions(cid);

    logAudit(cid, 'Session', `Session #${session.session_number}`, 'Deleted session record', 'admin');
    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: false, error: error.message };
  }
});

// Get payments for a client
ipcMain.handle('get-payments', async (event, clientId) => {
  try {
    return db.prepare('SELECT * FROM Payments WHERE client_id = ? ORDER BY payment_date DESC').all(parseInt(clientId));
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
});

// Create a new payment
ipcMain.handle('create-payment', async (event, paymentData) => {
  try {
    const cid = parseInt(paymentData.client_id);
    const sessionTypeId = paymentData.session_type ? parseInt(paymentData.session_type) : null;
    const stmt = db.prepare(
      'INSERT INTO Payments (client_id, amount, payment_type, package_sessions_total, package_sessions_used, session_type_id, branch_id, payment_date) VALUES (?, ?, ?, ?, 0, ?, ?, datetime(\'now\', \'localtime\'))'
    );
    const info = stmt.run(
      cid, 
      paymentData.amount, 
      paymentData.payment_type,
      paymentData.package_sessions_total || null,
      sessionTypeId,
      currentBranchId
    );
    
    // Automatically re-sync package sessions
    syncPackageSessions(cid);
    
    return { success: true, id: info.lastInsertRowid };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }
});

// Update an existing payment
ipcMain.handle('update-payment', async (event, { paymentId, data }) => {
  try {
    const pid = parseInt(paymentId);
    // Log to audit trail
    const existing = db.prepare('SELECT * FROM Payments WHERE id = ?').get(pid);
    if (existing) {
      db.prepare(`
        INSERT INTO AuditLogs (client_id, changed_field, old_value, new_value, admin_username, timestamp)
        VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        existing.client_id,
        'payment_edit',
        JSON.stringify({ amount: existing.amount, payment_type: existing.payment_type, package_sessions_total: existing.package_sessions_total }),
        JSON.stringify({ amount: data.amount, payment_type: data.payment_type, package_sessions_total: data.package_sessions_total }),
        'admin'
      );
    }
    db.prepare('UPDATE Payments SET amount = ?, payment_type = ?, notes = ?, package_sessions_total = ? WHERE id = ?')
      .run(data.amount, data.payment_type, data.notes || null, data.package_sessions_total || 1, pid);
    
    if (existing) {
      syncPackageSessions(existing.client_id);
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false, error: error.message };
  }
});

// Get all appointments (with client info)
ipcMain.handle('get-appointments', async (event, doctorId) => {
  try {
    const query = `
      SELECT 
        Appointments.*, 
        Clients.first_name as client_first_name, 
        Clients.last_name as client_last_name,
        Clients.phone as client_phone,
        Doctors.name as doctor_name
      FROM Appointments 
      JOIN Clients ON Appointments.client_id = Clients.id 
      LEFT JOIN Doctors ON Appointments.doctor_id = Doctors.id
      WHERE Appointments.branch_id = ? ${doctorId ? 'AND Appointments.doctor_id = ?' : ''}
      ORDER BY appointment_date ASC
    `;
    return doctorId ? db.prepare(query).all(currentBranchId, doctorId) : db.prepare(query).all(currentBranchId);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
});

// Create a new appointment
ipcMain.handle('create-appointment', async (event, appointmentData) => {
  try {
    const ALLOWED_SESSION_TYPES = ['Physical Therapy', 'Nutrition', 'Lymphatic', 'Other'];
    const sessionType = appointmentData.session_type;
    if (!sessionType || !ALLOWED_SESSION_TYPES.includes(sessionType)) {
      throw new Error('Valid session type is required.');
    }

    const stmt = db.prepare(
      'INSERT INTO Appointments (client_id, doctor_id, appointment_date, status, session_type, branch_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(
      parseInt(appointmentData.client_id), 
      appointmentData.doctor_id || null,
      appointmentData.appointment_date, 
      appointmentData.status || 'Scheduled',
      sessionType,
      currentBranchId
    );
    console.log(`[SUCCESS] Appointment scheduled for Client ID: ${appointmentData.client_id}`);
    // Sync to remote portal immediately
    syncAppointments(db).catch(err => console.error('[SYNC ERROR] Immediate appt sync failed:', err));
    return { success: true, id: info.lastInsertRowid };
  } catch (error) {
    console.error(`[CRITICAL ERROR] Failed to create appointment: ${error.message}`, { appointmentData, error });
    return { success: false, error: error.message || 'Failed to schedule appointment. Please ensure all data is correct.' };
  }
});

// Update an appointment
ipcMain.handle('update-appointment', async (event, { id, appointment_date, status, completed_by_staff_id, treatment_notes, progress_notes, doctor_id, session_type }) => {
  try {
    const ALLOWED_SESSION_TYPES = ['Physical Therapy', 'Nutrition', 'Lymphatic', 'Other'];
    if (session_type && !ALLOWED_SESSION_TYPES.includes(session_type)) {
      throw new Error('Invalid session type.');
    }

    const did = doctor_id ? parseInt(doctor_id) : null;
    if (did) {
      db.prepare(
        'UPDATE Appointments SET appointment_date = ?, status = ?, completed_by_staff_id = ?, doctor_id = ?, session_type = ? WHERE id = ?'
      ).run(appointment_date, status, completed_by_staff_id || null, did, session_type || null, id);
      
      // Also update any synced session to match the doctor and session type
      db.prepare(
        'UPDATE Sessions SET doctor_id = ?, session_type = ? WHERE appointment_id = ?'
      ).run(did, session_type || null, id);
    } else {
      db.prepare(
        'UPDATE Appointments SET appointment_date = ?, status = ?, completed_by_staff_id = ?, session_type = ? WHERE id = ?'
      ).run(appointment_date, status, completed_by_staff_id || null, session_type || null, id);

      db.prepare(
        'UPDATE Sessions SET session_type = ? WHERE appointment_id = ?'
      ).run(session_type || null, id);
    }
    
    // If marked as Completed, create a session record and sync package
    if (status === 'Completed') {
      const apt = db.prepare('SELECT * FROM Appointments WHERE id = ?').get(id);
      if (apt) {
        const existingSession = db.prepare('SELECT id FROM Sessions WHERE appointment_id = ?').get(id);
        if (!existingSession) {
          const sessionCount = db.prepare('SELECT COUNT(*) as count FROM Sessions WHERE client_id = ?').get(apt.client_id).count;
          db.prepare(
            "INSERT INTO Sessions (client_id, doctor_id, appointment_id, treatment_notes, progress_notes, session_number, session_date, session_type) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)"
          ).run(apt.client_id, apt.doctor_id, id, treatment_notes || 'Session completed', progress_notes || '', sessionCount + 1, apt.session_type);
          syncPackageSessions(apt.client_id);
        }
      }
    }
    // Sync to remote portal immediately
    syncAppointments(db).catch(err => console.error('[SYNC ERROR] Immediate appt sync failed:', err));
    return { success: true };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error: error.message };
  }
});

// Delete an appointment
ipcMain.handle('delete-appointment', async (event, id) => {
  try {
    db.prepare('DELETE FROM Appointments WHERE id = ?').run(id);
    // Sync to remote portal immediately
    syncAppointments(db).catch(err => console.error('[SYNC ERROR] Immediate appt sync failed:', err));
    return { success: true };
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return { success: false, error: error.message };
  }
});

// --- DASHBOARD ---
ipcMain.handle('get-dashboard-stats', async (event, showAllTime = false) => {
  try {
    let resetDate = '1970-01-01 00:00:00';
    if (!showAllTime) {
      const setting = db.prepare('SELECT value FROM Settings WHERE key = ?').get('dashboard_reset_date');
      if (setting) resetDate = setting.value;
    }

    const clientsCount = db.prepare('SELECT COUNT(*) as count FROM Clients WHERE is_active = 1 AND branch_id = ?').get(currentBranchId).count;
    
    // Get today's appointments for active clients only
    const todayAppointments = db.prepare(`
      SELECT COUNT(*) as count 
      FROM Appointments 
      JOIN Clients ON Appointments.client_id = Clients.id
      WHERE date(appointment_date) = date('now', 'localtime')
      AND Clients.is_active = 1
      AND Appointments.branch_id = ?
    `).get(currentBranchId).count;

    const totalIncome = db.prepare(`
      SELECT SUM(Payments.amount) as total 
      FROM Payments 
      JOIN Clients ON Payments.client_id = Clients.id
      WHERE Payments.payment_date >= ?
      AND Clients.is_active = 1
      AND Payments.branch_id = ?
    `).get(resetDate, currentBranchId).total || 0;

    return { clientsCount, todayAppointments, totalIncome, resetDate };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { clientsCount: 0, todayAppointments: 0, totalIncome: 0, resetDate: '1970-01-01 00:00:00' };
  }
});

// Get today's appointments (detailed list)
ipcMain.handle('get-today-appointments', async () => {
  try {
    return db.prepare(`
      SELECT Appointments.*, Clients.first_name, Clients.last_name, Clients.phone
      FROM Appointments 
      JOIN Clients ON Appointments.client_id = Clients.id 
      WHERE date(appointment_date) = date('now', 'localtime')
      AND Clients.is_active = 1
      AND Appointments.branch_id = ?
      ORDER BY appointment_date ASC
    `).all(currentBranchId);
  } catch (error) {
    console.error('Error fetching today appointments:', error);
    return [];
  }
});

ipcMain.handle('get-recovery-stats', async (event, clientId) => {
  try {
    return db.prepare(`
      SELECT assessment_date as date, pain_scale, rom, strength 
      FROM Assessments 
      WHERE client_id = ? AND is_completed = 1
      ORDER BY assessment_date ASC
    `).all(clientId);
  } catch (error) {
    return [];
  }
});

// AI Assistant Handler
ipcMain.handle('ask-ai', async (event, { clientId, question }) => {
  console.log('AI Request Received:', { clientId, questionLen: question?.length });
  try {
    let context = "";
    
    if (clientId) {
      console.log('Fetching context for client:', clientId);
      // Fetch client info
      const client = db.prepare('SELECT * FROM Clients WHERE id = ?').get(clientId);
      // Fetch recent sessions
      const sessions = db.prepare('SELECT * FROM Sessions WHERE client_id = ? ORDER BY session_date DESC LIMIT 5').all(clientId);
      
      if (client) {
        context = `
Patient Context:
- Name: ${client.first_name} ${client.last_name}
- Medical History: ${client.medical_history || 'None recorded'}
- Recent Sessions:
${sessions.map(s => `- ${new Date(s.session_date).toLocaleDateString()}: Treatment: ${s.treatment_notes}. Progress: ${s.progress_notes}`).join('\n')}
`;
        console.log('Context built successfully');
      }
    }

    const prompt = `
You are a professional physical therapy assistant specialized in clinical support and patient care.
Your goal is to provide evidence-based clinical suggestions, next steps, and precautions for physical therapists.

${context}

Therapist Question: ${question}

Instructions:
1. If patient context is provided, tailor your advice specifically to their condition and history.
2. Provide clinical suggestions for treatments or exercises.
3. Outline clear next steps.
4. Include specific warnings or contraindications if applicable.
5. Keep the tone professional, concise, and helpful.
6. Return the response in clean Markdown.
`;

    console.log('Calling Gemini API (gemini-2.0-flash)...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini Response Received:', { textLen: text.length });
    return { success: true, text: text };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return { success: false, error: "Failed to get response from AI: " + error.message };
  }
});

ipcMain.handle('reset-dashboard', async () => {
  try {
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    db.prepare("UPDATE Settings SET value = ? WHERE key = 'dashboard_reset_date'").run(now);
    return { success: true, resetDate: now };
  } catch (error) {
    console.error('Error resetting dashboard:', error);
    return { success: false, error: error.message };
  }
});

// --- REPORTING ---
ipcMain.handle('get-report-stats', async (event, { startDate, endDate, doctorId }) => {
  try {
    const startDateOnly = startDate.split(' ')[0];
    const endDateOnly = endDate.split(' ')[0];
    const bid = currentBranchId;

    // Build doctor filter clause for Sessions
    let doctorFilter = '';
    let sessionParams = [startDate, endDate, bid];
    if (doctorId && doctorId !== 'all') {
      // Find user linked to this doctor
      const userRow = db.prepare('SELECT id FROM Users WHERE doctor_id = ?').get(doctorId);
      if (userRow) {
        doctorFilter = ' AND s.doctor_id = ?';
        sessionParams = [startDate, endDate, bid, doctorId];
      }
    }

    const clientsInPeriod = db.prepare(`
      SELECT COUNT(DISTINCT s.client_id) as count 
      FROM Sessions s
      WHERE s.session_date BETWEEN ? AND ? AND s.branch_id = ?${doctorFilter}
    `).get(...sessionParams).count;

    const sessionsCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM Sessions s
      WHERE s.session_date BETWEEN ? AND ? AND s.branch_id = ?${doctorFilter}
    `).get(...sessionParams).count;

    const totalIncome = db.prepare(`
      SELECT SUM(amount) as total 
      FROM Payments 
      WHERE payment_date BETWEEN ? AND ? AND branch_id = ?
    `).get(startDate, endDate, bid).total || 0;

    // Daily breakdown for sessions and clients
    const dailySessions = db.prepare(`
      SELECT date(s.session_date) as date, COUNT(*) as sessions, COUNT(DISTINCT s.client_id) as clients
      FROM Sessions s
      WHERE s.session_date BETWEEN ? AND ? AND s.branch_id = ?${doctorFilter}
      GROUP BY date(s.session_date)
    `).all(...sessionParams);

    // Daily breakdown for income
    const dailyIncome = db.prepare(`
      SELECT date(payment_date) as date, SUM(amount) as income
      FROM Payments 
      WHERE payment_date BETWEEN ? AND ? AND branch_id = ?
      GROUP BY date(payment_date)
    `).all(startDate, endDate, bid);

    // Detailed payments
    const detailedPayments = db.prepare(`
      SELECT p.id, p.payment_date, p.amount, p.payment_type, p.package_sessions_total, c.first_name, c.last_name, p.client_id
      FROM Payments p
      JOIN Clients c ON p.client_id = c.id
      WHERE p.payment_date BETWEEN ? AND ? AND p.branch_id = ?
      ORDER BY p.payment_date DESC
    `).all(startDate, endDate, bid);

    // Detailed sessions (with doctor filter)
    const detailedSessions = db.prepare(`
      SELECT s.id, s.session_date, s.treatment_notes, s.progress_notes, c.first_name, c.last_name, s.client_id, s.session_type, d.name as doctor_name,
             (SELECT COUNT(*) FROM Sessions s2 WHERE s2.client_id = s.client_id AND s2.session_date <= s.session_date) as session_number
      FROM Sessions s
      JOIN Clients c ON s.client_id = c.id
      LEFT JOIN Doctors d ON s.doctor_id = d.id
      WHERE s.session_date BETWEEN ? AND ? AND s.branch_id = ?${doctorFilter}
      ORDER BY s.session_date DESC
    `).all(...sessionParams);

    // Loans in period
    const loanDetails = db.prepare(`
      SELECT l.id, l.loan_date, l.amount, l.note, l.is_settled, u.username, u.role
      FROM Loans l JOIN Users u ON l.user_id = u.id
      WHERE l.loan_date BETWEEN ? AND ? AND l.branch_id = ?
      ORDER BY l.loan_date DESC
    `).all(startDate, endDate, bid);
    const totalLoans = loanDetails.reduce((s, l) => s + l.amount, 0);

    // Wastes in period
    const wasteDetails = db.prepare(`
      SELECT * FROM WasteItems
      WHERE waste_date BETWEEN ? AND ? AND branch_id = ?
      ORDER BY waste_date ASC, created_at ASC
    `).all(startDateOnly, endDateOnly, bid);
    const totalWastes = wasteDetails.reduce((s, w) => s + w.total_cost, 0);

    // Merge daily breakdown
    const breakdownMap = new Map();
    dailySessions.forEach(d => {
      breakdownMap.set(d.date, { date: d.date, sessions: d.sessions, clients: d.clients, income: 0 });
    });
    dailyIncome.forEach(d => {
      if (breakdownMap.has(d.date)) {
        breakdownMap.get(d.date).income = d.income;
      } else {
        breakdownMap.set(d.date, { date: d.date, sessions: 0, clients: 0, income: d.income });
      }
    });
    const dailyBreakdown = Array.from(breakdownMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    // Fetch attendance logs in period
    const attendanceLogs = db.prepare(`
      SELECT al.id, al.log_date, al.check_in_time, al.check_out_time, u.username, u.role
      FROM AttendanceLogs al
      JOIN Users u ON al.user_id = u.id
      WHERE al.log_date BETWEEN ? AND ? AND al.branch_id = ?
      ORDER BY al.log_date DESC, u.username ASC
    `).all(startDateOnly, endDateOnly, bid);

    return {
      clientsInPeriod, sessionsCount, totalIncome, totalLoans, totalWastes,
      dailyBreakdown, detailedPayments, detailedSessions, loanDetails, wasteDetails,
      attendanceLogs
    };
  } catch (error) {
    console.error('Error fetching report stats:', error);
    return {
      clientsInPeriod: 0, sessionsCount: 0, totalIncome: 0, totalLoans: 0, totalWastes: 0,
      dailyBreakdown: [], detailedPayments: [], detailedSessions: [], loanDetails: [], wasteDetails: [],
      attendanceLogs: []
    };
  }
});


// --- DOCUMENTS ---
ipcMain.handle('upload-document', async (event, clientId) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
    });

    if (canceled || filePaths.length === 0) return { success: false, error: 'Canceled' };

    const sourcePath = filePaths[0];
    const fileName = path.basename(sourcePath);
    const safeFileName = Date.now() + '_' + fileName.replace(/\s+/g, '_');

    // Make sure files dir exists
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'client_files');
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    const destPath = path.join(filesDir, safeFileName);
    fs.copyFileSync(sourcePath, destPath);

    const stmt = db.prepare(
      'INSERT INTO ClientFiles (client_id, file_name, local_file_path, upload_date) VALUES (?, ?, ?, datetime(\'now\', \'localtime\'))'
    );
    stmt.run(clientId, fileName, destPath);

    return { success: true, fileName };
  } catch (error) {
    console.error(`[DOCS] Error uploading document: ${error.message}`);
    return { success: false, error: `Upload failed: ${error.message}` };
  }
});

ipcMain.handle('get-documents', async (event, clientId) => {
  try {
    return db.prepare('SELECT * FROM ClientFiles WHERE client_id = ? ORDER BY upload_date DESC').all(clientId);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
});

ipcMain.handle('open-document', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`[DOCS] Attempting to open: ${filePath}`);
      const error = await shell.openPath(filePath);
      if (error) {
        console.error(`[DOCS] shell.openPath failed: ${error}. Falling back to showItemInFolder.`);
        shell.showItemInFolder(filePath);
        return { success: true, warning: 'Opened in folder (no default app found)' };
      }
      return { success: true };
    } else {
      console.warn(`[DOCS] File not found: ${filePath}`);
      return { success: false, error: 'File no longer exists on this system.' };
    }
  } catch (error) {
    console.error(`[DOCS] Critical error: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return { success: true };
  }
  return { success: false, error: 'File not found.' };
});

// --- BACKUP ---
ipcMain.handle('export-backup', async () => {
  try {
    // A simplified backup: just copy the sqlite file to a chosen destination
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'database', 'clinic.db');

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Database Backup',
      defaultPath: 'clinic_backup.db',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (canceled || !filePath) return { success: false, error: 'Canceled' };

    fs.copyFileSync(dbPath, filePath);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error exporting backup:', error);
    return { success: false, error: error.message };
  }
});

// --- PHYSICAL ASSESSMENT ---
ipcMain.handle('get-assessment-structure', async () => {
  try {
    const regions = db.prepare('SELECT * FROM AssessmentRegions ORDER BY sort_order').all();
    const tests = db.prepare('SELECT * FROM AssessmentTests').all();
    return { regions, tests };
  } catch (error) {
    console.error('Error fetching assessment structure:', error);
    return { regions: [], tests: [] };
  }
});

ipcMain.handle('save-assessment-result', async (event, { clientId, testId, result }) => {
  try {
    db.prepare('INSERT INTO AssessmentResults (client_id, test_id, result, created_at) VALUES (?, ?, ?, datetime(\'now\', \'localtime\'))').run(clientId, testId, result);
    return { success: true };
  } catch (error) {
    console.error('Error saving assessment result:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-client-assessment-results', async (event, clientId) => {
  try {
    // Return the latest result for each test for the client
    return db.prepare(`
      SELECT r.* 
      FROM AssessmentResults r
      INNER JOIN (
        SELECT test_id, MAX(created_at) as max_date
        FROM AssessmentResults
        WHERE client_id = ?
        GROUP BY test_id
      ) latest ON r.test_id = latest.test_id AND r.created_at = latest.max_date
      WHERE r.client_id = ?
    `).all(clientId, clientId);
  } catch (error) {
    console.error('Error fetching client assessment results:', error);
    return [];
  }
});

ipcMain.handle('get-test-history', async (event, { clientId, testId }) => {
  try {
    return db.prepare(`
      SELECT * FROM AssessmentResults 
      WHERE client_id = ? AND test_id = ? 
      ORDER BY created_at DESC
    `).all(clientId, testId);
  } catch (error) {
    console.error('Error fetching test history:', error);
    return [];
  }
});

ipcMain.handle('add-assessment-region', async (event, name) => {
  try {
    const res = db.prepare('INSERT INTO AssessmentRegions (name) VALUES (?)').run(name);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    console.error('Error adding region:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-assessment-test', async (event, { regionId, name, description }) => {
  try {
    const res = db.prepare('INSERT INTO AssessmentTests (region_id, name, description) VALUES (?, ?, ?)').run(regionId, name, description);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    console.error('Error adding test:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-assessment-test', async (event, testId) => {
  try {
    db.prepare('DELETE FROM AssessmentResults WHERE test_id = ?').run(testId);
    db.prepare('DELETE FROM AssessmentTests WHERE id = ?').run(testId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting test:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-assessment-region', async (event, regionId) => {
  try {
    // Delete all results and tests for this region
    const tests = db.prepare('SELECT id FROM AssessmentTests WHERE region_id = ?').all(regionId);
    for (const test of tests) {
      db.prepare('DELETE FROM AssessmentResults WHERE test_id = ?').run(test.id);
    }
    db.prepare('DELETE FROM AssessmentTests WHERE region_id = ?').run(regionId);
    db.prepare('DELETE FROM AssessmentRegions WHERE id = ?').run(regionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting region:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-assessment-region', async (event, { id, name }) => {
  try {
    db.prepare('UPDATE AssessmentRegions SET name = ? WHERE id = ?').run(name, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating assessment region:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-assessment-test', async (event, { id, name, description }) => {
  try {
    db.prepare('UPDATE AssessmentTests SET name = ?, description = ? WHERE id = ?').run(name, description, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating assessment test:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-client-progress-stats', async (event, clientId) => {
  try {
    // Return counts of positive findings over time for charting
    return db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as positives
      FROM AssessmentResults
      WHERE client_id = ? AND result = 'Positive'
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `).all(clientId);
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    return [];
  }
});

ipcMain.handle('get-client-package-status', async (event, clientId) => {
  try {
    const cid = parseInt(clientId);
    if (!isNaN(cid)) {
      syncPackageSessions(cid);
    }
    return db.prepare(`
      SELECT SUM(package_sessions_total) as total, SUM(package_sessions_used) as used
      FROM Payments
      WHERE client_id = ? AND package_sessions_total > 0
    `).get(cid);
  } catch (error) {
    console.error('Error fetching package status:', error);
    return { total: 0, used: 0 };
  }
});

// --- EXERCISE LIBRARY ---
ipcMain.handle('get-exercises', async () => {
  try {
    const regions = db.prepare('SELECT * FROM ExerciseRegions ORDER BY sort_order').all();
    const exercises = db.prepare('SELECT * FROM Exercises').all();
    return { regions, exercises };
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return { regions: [], exercises: [] };
  }
});

ipcMain.handle('add-exercise-region', async (event, name) => {
  try {
    const res = db.prepare('INSERT INTO ExerciseRegions (name) VALUES (?)').run(name);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    console.error('Error adding exercise region:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-exercise-region', async (event, regionId) => {
  try {
    db.prepare('DELETE FROM Exercises WHERE region_id = ?').run(regionId);
    db.prepare('DELETE FROM ExerciseRegions WHERE id = ?').run(regionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise region:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-exercise', async (event, { regionId, name, type, instructions, video_url }) => {
  try {
    const res = db.prepare(
      'INSERT INTO Exercises (region_id, name, type, instructions, video_url, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(regionId, name, type, instructions, video_url);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    console.error('Error adding exercise:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-exercise', async (event, id) => {
  try {
    db.prepare('DELETE FROM ClientExercises WHERE exercise_id = ?').run(id);
    db.prepare('DELETE FROM Exercises WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-exercise-region', async (event, { id, name }) => {
  try {
    db.prepare('UPDATE ExerciseRegions SET name = ? WHERE id = ?').run(name, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating exercise region:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-exercise', async (event, { id, name, type, instructions, video_url }) => {
  try {
    db.prepare('UPDATE Exercises SET name = ?, type = ?, instructions = ?, video_url = ? WHERE id = ?')
      .run(name, type, instructions, video_url, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating exercise:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-client-exercises', async (event, clientId) => {
  try {
    return db.prepare(`
      SELECT ce.*, e.name as exercise_name, e.instructions, e.video_url, e.region_id, er.name as region_name, Doctors.name as doctor_name
      FROM ClientExercises ce
      JOIN Exercises e ON ce.exercise_id = e.id
      JOIN ExerciseRegions er ON e.region_id = er.id
      LEFT JOIN Doctors ON ce.doctor_id = Doctors.id
      WHERE ce.client_id = ?
    `).all(clientId);
  } catch (error) {
    console.error('Error fetching client exercises:', error);
    return [];
  }
});

ipcMain.handle('assign-exercise', async (event, data) => {
  try {
    const { client_id, exercise_id, doctor_id, sets, reps, frequency, notes } = data;
    const res = db.prepare(
      'INSERT INTO ClientExercises (client_id, exercise_id, doctor_id, sets, reps, frequency, notes, assigned_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'), datetime(\'now\', \'localtime\'))'
    ).run(client_id, exercise_id, doctor_id || null, sets, reps, frequency, notes);
    
    logAudit(client_id, 'Exercise Plan', 'None', `New Exercise Assigned by Doc ${doctor_id}`, 'admin');
    
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    console.error('Error assigning exercise:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-client-exercise', async (event, id) => {
  try {
    db.prepare('DELETE FROM ClientExercises WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    console.error('Error removing client exercise:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log-exercise-progress', async (event, { clientExerciseId, sessionId, sets, reps, notes }) => {
  try {
    db.prepare(
      'INSERT INTO ExerciseSessionLogs (client_exercise_id, session_id, sets_completed, reps_completed, notes, logged_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(clientExerciseId, sessionId, sets, reps, notes);
    return { success: true };
  } catch (error) {
    console.error('Error logging exercise progress:', error);
    return { success: false, error: error.message };
  }
});

// --- EXERCISE LIBRARY IMPORT / EXPORT ---
ipcMain.handle('export-exercises-excel', async () => {
  try {
    const exercises = db.prepare('SELECT e.*, er.name as region_name FROM Exercises e JOIN ExerciseRegions er ON e.region_id = er.id ORDER BY er.name, e.name').all();
    const rows = exercises.map(ex => ({
      region: ex.region_name,
      name: ex.name,
      type: ex.type,
      instructions: ex.instructions || '',
      video_url: ex.video_url || ''
    }));
    if (rows.length === 0) {
      rows.push({ region: 'Example Region', name: 'Example Exercise', type: 'Strengthening', instructions: 'Step-by-step instructions here', video_url: '' });
    }
    const ws = XLSX.utils.json_to_sheet(rows, { header: ['region', 'name', 'type', 'instructions', 'video_url'] });
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 50 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exercises');
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Exercise Library',
      defaultPath: `exercise_library_${new Date().toISOString().slice(0,10)}.xlsx`,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  } catch (error) {
    console.error('Error exporting exercises:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-exercises-excel', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Exercise Library from Excel',
      filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths.length) return { success: false, canceled: true };
    const wb = XLSX.readFile(filePaths[0]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    let imported = 0; let skipped = 0; const errors = [];
    const regionCache = {};
    const getOrCreateRegion = (regionName) => {
      const key = regionName.trim().toLowerCase();
      if (regionCache[key]) return regionCache[key];
      let region = db.prepare('SELECT id FROM ExerciseRegions WHERE LOWER(name) = ?').get(key);
      if (!region) {
        const res = db.prepare('INSERT INTO ExerciseRegions (name) VALUES (?)').run(regionName.trim());
        regionCache[key] = res.lastInsertRowid;
        return res.lastInsertRowid;
      }
      regionCache[key] = region.id;
      return region.id;
    };
    db.exec('BEGIN');
    try {
      for (const row of rows) {
        try {
          const regionName = String(row['region'] || row['Region'] || '').trim();
          const name = String(row['name'] || row['Name'] || '').trim();
          const type = String(row['type'] || row['Type'] || 'Strengthening').trim();
          const instructions = String(row['instructions'] || row['Instructions'] || '').trim();
          const video_url = String(row['video_url'] || row['Video URL'] || row['video'] || '').trim();
          if (!regionName || !name) { skipped++; continue; }
          const regionId = getOrCreateRegion(regionName);
          db.prepare("INSERT INTO Exercises (region_id, name, type, instructions, video_url, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))").run(regionId, name, type, instructions, video_url);
          imported++;
        } catch (e) { errors.push(e.message); }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { success: true, imported, skipped, errors: errors.slice(0, 5) };
  } catch (error) {
    console.error('Error importing exercises:', error);
    return { success: false, error: error.message };
  }
});

// --- ASSESSMENT LIBRARY IMPORT / EXPORT ---
ipcMain.handle('export-assessments-excel', async () => {
  try {
    const tests = db.prepare('SELECT at.*, ar.name as region_name FROM AssessmentTests at JOIN AssessmentRegions ar ON at.region_id = ar.id ORDER BY ar.name, at.name').all();
    const rows = tests.map(t => ({
      region: t.region_name,
      name: t.name,
      description: t.description || ''
    }));
    if (rows.length === 0) {
      rows.push({ region: 'Example Region', name: 'Example Test', description: 'Optional description of the test' });
    }
    const ws = XLSX.utils.json_to_sheet(rows, { header: ['region', 'name', 'description'] });
    ws['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assessment Tests');
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Assessment Library',
      defaultPath: `assessment_library_${new Date().toISOString().slice(0,10)}.xlsx`,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  } catch (error) {
    console.error('Error exporting assessments:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-assessments-excel', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Assessment Library from Excel',
      filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths.length) return { success: false, canceled: true };
    const wb = XLSX.readFile(filePaths[0]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    let imported = 0; let skipped = 0; const errors = [];
    const regionCache = {};
    const getOrCreateRegion = (regionName) => {
      const key = regionName.trim().toLowerCase();
      if (regionCache[key]) return regionCache[key];
      let region = db.prepare('SELECT id FROM AssessmentRegions WHERE LOWER(name) = ?').get(key);
      if (!region) {
        const res = db.prepare('INSERT INTO AssessmentRegions (name) VALUES (?)').run(regionName.trim());
        regionCache[key] = res.lastInsertRowid;
        return res.lastInsertRowid;
      }
      regionCache[key] = region.id;
      return region.id;
    };
    db.exec('BEGIN');
    try {
      for (const row of rows) {
        try {
          const regionName = String(row['region'] || row['Region'] || '').trim();
          const name = String(row['name'] || row['Name'] || '').trim();
          const description = String(row['description'] || row['Description'] || '').trim();
          if (!regionName || !name) { skipped++; continue; }
          const regionId = getOrCreateRegion(regionName);
          db.prepare('INSERT INTO AssessmentTests (region_id, name, description) VALUES (?, ?, ?)').run(regionId, name, description);
          imported++;
        } catch (e) { errors.push(e.message); }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { success: true, imported, skipped, errors: errors.slice(0, 5) };
  } catch (error) {
    console.error('Error importing assessments:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('push-patient-plan', async (event, data) => {
  logger.info('Sync', `Initiating manual plan sync for patient #${data?.patientData?.id}...`);
  const res = await syncPatientPlan(data);
  if (!res.success) {
    logger.warn('Sync', `Manual sync failed for patient #${data?.patientData?.id}. Queueing for offline retry.`, { error: res.error });
    try {
      const payloadString = JSON.stringify(data);
      db.prepare("INSERT INTO SyncQueue (client_id, payload, error_message) VALUES (?, ?, ?)")
        .run(data.patientData.id, payloadString, res.error || 'Offline');
      logger.info('Sync', `Patient #${data?.patientData?.id} plan successfully queued in SyncQueue.`);
    } catch (err) {
      logger.error('Sync', 'Failed to queue sync payload:', { error: err.message });
    }
  } else {
    logger.info('Sync', `Manual sync succeeded for patient #${data?.patientData?.id}.`);
    try {
      const now = new Date().toISOString();
      db.prepare("INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)")
        .run(`last_sync_${data.patientData.id}`, now);
    } catch (err) {}
  }
  return res;
});

ipcMain.handle('get-high-pain-alerts', async () => {
  try {
    const { data, error } = await supabase
      .from('patientlogs')
      .select('*, patients!inner(first_name, branch_id)') // Get patient name via join and filter by branch
      .eq('patients.branch_id', currentBranchId)
      .gte('pain_level', 7)
      .order('created_at', { ascending: false });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-all-pain-logs', async () => {
  try {
    const { data, error } = await supabase
      .from('patientlogs')
      .select('*, patients!inner(first_name, last_name, branch_id)')
      .eq('patients.branch_id', currentBranchId)
      .order('created_at', { ascending: false })
      .limit(20);
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-pain-test-results', async () => {
  console.log('[SUPABASE] Fetching pain test results...');
  try {
    const { data, error } = await supabase
      .from('paintests')
      .select('*, patients!inner(first_name, last_name, branch_id)')
      .eq('patients.branch_id', currentBranchId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('[SUPABASE ERROR] Join fetch failed, trying simple fetch:', error.message);
      // Fallback: Fetch without join if relationship is broken
      const fallback = await supabase.from('paintests').select('*').order('created_at', { ascending: false }).limit(20);
      return { success: !fallback.error, data: fallback.data, error: fallback.error?.message };
    }

    console.log(`[SUPABASE] Success! Found ${data?.length || 0} results.`);
    return { success: true, data, error: null };
  } catch (err) {
    console.error('[SUPABASE CRITICAL]', err);
    return { success: false, error: err.message };
  }
});

// --- FINANCE MANAGEMENT ---
ipcMain.handle('get-finance-users', async () => {
  try {
    return db.prepare("SELECT id, username, role, status, base_salary, doctor_id, branch_id FROM Users WHERE role IN ('doctor', 'staff') AND branch_id = ?").all(currentBranchId);
  } catch (error) {
    console.error('Error getting finance users:', error);
    return [];
  }
});

ipcMain.handle('update-user-finance', async (event, { userId, status, base_salary }) => {
  try {
    db.prepare('UPDATE Users SET status = ?, base_salary = ? WHERE id = ?').run(status, base_salary, userId);
    // Sync immediately
    syncUsers(db).catch(err => console.error('[SYNC ERROR] Immediate user sync failed:', err));
    return { success: true };
  } catch (error) {
    console.error('Error updating user finance:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-monthly-revenue', async (event, month) => {
  try {
    const result = db.prepare("SELECT SUM(amount) as total FROM Payments WHERE strftime('%Y-%m', payment_date) = ? AND branch_id = ?").get(month, currentBranchId);
    return result.total || 0;
  } catch (error) {
    console.error('Error getting monthly revenue:', error);
    return 0;
  }
});

ipcMain.handle('get-doctor-sessions-count', async (event, { doctorId, month }) => {
  try {
    const appointments = db.prepare(`
      SELECT session_type, COUNT(*) as count 
      FROM Appointments 
      WHERE doctor_id = ? 
      AND status = 'Completed'
      AND branch_id = ?
      AND strftime('%Y-%m', appointment_date) = ?
      GROUP BY session_type
    `).all(doctorId, currentBranchId, month);

    let total = 0;
    const types = {
      'Physical Therapy': 0,
      'Nutrition': 0,
      'Lymphatic': 0,
      'Other': 0
    };

    appointments.forEach(row => {
      const type = row.session_type || 'Other';
      if (types[type] !== undefined) {
        types[type] += row.count;
      } else {
        types['Other'] += row.count;
      }
      total += row.count;
    });

    return { total, types };
  } catch (error) {
    console.error('Error getting sessions count:', error);
    return { total: 0, types: { 'Physical Therapy': 0, 'Nutrition': 0, 'Lymphatic': 0, 'Other': 0 } };
  }
});

ipcMain.handle('save-salary-record', async (event, data) => {
  try {
    const { user_id, month, base_salary, dynamic_salary, sessions_count, total_salary } = data;
    const existing = db.prepare('SELECT id FROM SalaryRecords WHERE user_id = ? AND month = ?').get(user_id, month);
    if (existing) {
      db.prepare('UPDATE SalaryRecords SET base_salary = ?, dynamic_salary = ?, sessions_count = ?, total_salary = ? WHERE id = ?')
        .run(base_salary, dynamic_salary, sessions_count, total_salary, existing.id);
    } else {
      db.prepare('INSERT INTO SalaryRecords (user_id, month, base_salary, dynamic_salary, sessions_count, total_salary, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))')
        .run(user_id, month, base_salary, dynamic_salary, sessions_count, total_salary);
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving salary record:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-salary-records', async (event, month) => {
  try {
    return db.prepare('SELECT * FROM SalaryRecords WHERE month = ?').all(month);
  } catch (error) {
    console.error('Error getting salary records:', error);
    return [];
  }
});

// --- LOANS ---
ipcMain.handle('add-loan', async (event, { user_id, amount, note, month }) => {
  try {
    // Use SQLite localtime format (space separator) so BETWEEN date queries work correctly
    db.prepare("INSERT INTO Loans (user_id, amount, note, month, branch_id, loan_date) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))").run(user_id, amount, note || '', month, currentBranchId);
    return { success: true };
  } catch (error) {
    console.error('Error adding loan:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-loans', async (event, month) => {
  try {
    return db.prepare(`
      SELECT l.*, u.username, u.role 
      FROM Loans l 
      JOIN Users u ON l.user_id = u.id 
      WHERE l.month = ? AND l.branch_id = ?
      ORDER BY l.loan_date DESC
    `).all(month, currentBranchId);
  } catch (error) {
    console.error('Error getting loans:', error);
    return [];
  }
});

ipcMain.handle('delete-loan', async (event, loanId) => {
  try {
    db.prepare('DELETE FROM Loans WHERE id = ?').run(loanId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting loan:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settle-loan', async (event, loanId) => {
  try {
    db.prepare("UPDATE Loans SET is_settled = 1, settled_at = datetime('now', 'localtime') WHERE id = ?").run(loanId);
    return { success: true };
  } catch (error) {
    console.error('Error settling loan:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-loans', async (event, month) => {
  // Soft reset: mark all unsettled loans for this month as settled
  try {
    db.prepare("UPDATE Loans SET is_settled = 1, settled_at = datetime('now', 'localtime') WHERE month = ? AND is_settled = 0").run(month);
    return { success: true };
  } catch (error) {
    console.error('Error resetting loans:', error);
    return { success: false, error: error.message };
  }
});

// --- WASTES ---
ipcMain.handle('add-waste-item', async (event, { waste_date, item_name, quantity, unit_cost }) => {
  try {
    const total_cost = quantity * unit_cost;
    db.prepare('INSERT INTO WasteItems (waste_date, item_name, quantity, unit_cost, total_cost, branch_id) VALUES (?, ?, ?, ?, ?, ?)').run(waste_date, item_name, quantity, unit_cost, total_cost, currentBranchId);
    return { success: true };
  } catch (error) {
    console.error('Error adding waste item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-waste-items', async (event, waste_date) => {
  try {
    return db.prepare('SELECT * FROM WasteItems WHERE waste_date = ? AND branch_id = ? ORDER BY created_at ASC').all(waste_date, currentBranchId);
  } catch (error) {
    console.error('Error getting waste items:', error);
    return [];
  }
});

ipcMain.handle('delete-waste-item', async (event, itemId) => {
  try {
    db.prepare('DELETE FROM WasteItems WHERE id = ?').run(itemId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting waste item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-waste-days', async (event, month) => {
  // Returns distinct dates that have waste records for a given YYYY-MM
  try {
    const rows = db.prepare("SELECT DISTINCT waste_date FROM WasteItems WHERE strftime('%Y-%m', waste_date) = ? AND branch_id = ? ORDER BY waste_date ASC").all(month, currentBranchId);
    return rows.map(r => r.waste_date);
  } catch (error) {
    console.error('Error getting waste days:', error);
    return [];
  }
});

// --- DAILY SUMMARY ---
ipcMain.handle('get-daily-summary', async (event, date) => {
  // date: YYYY-MM-DD
  try {
    const startOfDay = date + ' 00:00:00';
    const endOfDay = date + ' 23:59:59';
    const bid = currentBranchId;

    // Revenue from Payments table
    const revenueRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM Payments WHERE payment_date >= ? AND payment_date <= ? AND branch_id = ?").get(startOfDay, endOfDay, bid);
    const revenue = revenueRow.total || 0;

    // All loans recorded on that date (both active and settled)
    const loanRows = db.prepare(`
      SELECT l.id, l.amount, l.note, l.loan_date, l.is_settled, u.username, u.role
      FROM Loans l JOIN Users u ON l.user_id = u.id
      WHERE date(l.loan_date) = ? AND l.branch_id = ?
      ORDER BY l.is_settled ASC, l.loan_date ASC
    `).all(date, bid);
    // Only active (unsettled) loans are deducted from revenue
    const totalLoans = loanRows.filter(r => r.is_settled === 0).reduce((sum, r) => sum + r.amount, 0);

    // Wastes for that day
    const wasteRows = db.prepare('SELECT * FROM WasteItems WHERE waste_date = ? AND branch_id = ? ORDER BY created_at ASC').all(date, bid);
    const totalWastes = wasteRows.reduce((sum, r) => sum + r.total_cost, 0);

    const netRevenue = revenue - totalLoans - totalWastes;

    return { date, revenue, totalLoans, totalWastes, netRevenue, loans: loanRows, wastes: wasteRows };
  } catch (error) {
    console.error('Error getting daily summary:', error);
    return { date, revenue: 0, totalLoans: 0, totalWastes: 0, netRevenue: 0, loans: [], wastes: [] };
  }
});

// --- DOCTORS LIST (for report filter) ---
ipcMain.handle('get-doctors-list', async () => {
  try {
    return db.prepare("SELECT id, name, specialty FROM Doctors WHERE status = 'active' AND branch_id = ? ORDER BY name ASC").all(currentBranchId);
  } catch (error) {
    console.error('Error getting doctors list:', error);
    return [];
  }
});

// ============================================================
// --- CLIENT PROFILES ---
// ============================================================

ipcMain.handle('get-client-profiles', async (event, clientId) => {
  try {
    return db.prepare('SELECT * FROM ClientProfiles WHERE client_id = ? ORDER BY created_at ASC').all(clientId);
  } catch (error) {
    console.error('Error fetching client profiles:', error);
    return [];
  }
});

ipcMain.handle('get-client-profile', async (event, profileId) => {
  try {
    return db.prepare('SELECT * FROM ClientProfiles WHERE id = ?').get(parseInt(profileId));
  } catch (error) {
    console.error('Error fetching client profile:', error);
    return null;
  }
});

ipcMain.handle('create-client-profile', async (event, { client_id, profile_type, name }) => {
  try {
    const cid = parseInt(client_id);
    const existing = db.prepare('SELECT id FROM ClientProfiles WHERE client_id = ? AND profile_type = ?').get(cid, profile_type);
    if (existing) {
      return { success: false, error: `A profile of type ${profile_type} already exists for this client.` };
    }
    const res = db.prepare("INSERT INTO ClientProfiles (client_id, profile_type, name, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))").run(cid, profile_type, name || null);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    console.error('Error creating client profile:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-client-profile-height', async (event, { profileId, height }) => {
  try {
    db.prepare('UPDATE ClientProfiles SET height = ? WHERE id = ?').run(height ? parseFloat(height) : null, parseInt(profileId));
    return { success: true };
  } catch (error) {
    console.error('Error updating client profile height:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-client-profile', async (event, profileId) => {
  try {
    const pid = parseInt(profileId);
    // Cascade delete profile data
    db.prepare('DELETE FROM PTRedFlags WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM PTSubjective WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM PTObjectiveRows WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM PTObjectivePalpation WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM PTSessionPlan WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM NutritionMedicalHistory WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM ClientInvestigations WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM InbodyUploads WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM LymphaticMeasurements WHERE profile_id = ?').run(pid);
    db.prepare('DELETE FROM ClientProfiles WHERE id = ?').run(pid);
    return { success: true };
  } catch (error) {
    console.error('Error deleting profile:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- PT RED FLAGS ---
// ============================================================

ipcMain.handle('get-pt-red-flags', async (event, profileId) => {
  try {
    return db.prepare('SELECT * FROM PTRedFlags WHERE profile_id = ?').get(profileId) || { flags: '[]', other_text: '' };
  } catch (error) {
    return { flags: '[]', other_text: '' };
  }
});

ipcMain.handle('save-pt-red-flags', async (event, profileId, data) => {
  try {
    const existing = db.prepare('SELECT id FROM PTRedFlags WHERE profile_id = ?').get(profileId);
    if (existing) {
      db.prepare("UPDATE PTRedFlags SET flags = ?, other_text = ?, doctor_id = ?, updated_at = datetime('now', 'localtime') WHERE profile_id = ?").run(data.flags, data.other_text || '', data.doctor_id || null, profileId);
    } else {
      db.prepare("INSERT INTO PTRedFlags (profile_id, flags, other_text, doctor_id, updated_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))").run(profileId, data.flags, data.other_text || '', data.doctor_id || null);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- PT SUBJECTIVE assessment list ---
// ============================================================
ipcMain.handle('get-pt-subjective', async (event, profileId, subjectiveId) => {
  try {
    if (subjectiveId) {
      return db.prepare('SELECT * FROM PTSubjective WHERE id = ?').get(subjectiveId) || {};
    }
    return db.prepare('SELECT * FROM PTSubjective WHERE profile_id = ? ORDER BY updated_at DESC').get(profileId) || {};
  } catch (error) {
    return {};
  }
});

ipcMain.handle('get-pt-subjectives', async (event, profileId) => {
  try {
    return db.prepare(`
      SELECT s.*, d.name as doctor_name
      FROM PTSubjective s
      LEFT JOIN Doctors d ON s.doctor_id = d.id
      WHERE s.profile_id = ?
      ORDER BY s.updated_at DESC, s.id DESC
    `).all(profileId);
  } catch (error) {
    console.error('Error fetching PT subjectives:', error);
    return [];
  }
});

ipcMain.handle('save-pt-subjective', async (event, profileId, data) => {
  try {
    const { id, chief_complaint, aggravating, easing, irritability, irritability_notes, nature, nature_notes, doctor_id, pain_scale } = data;
    if (id) {
      db.prepare(`
        UPDATE PTSubjective 
        SET chief_complaint = ?, aggravating = ?, easing = ?, irritability = ?, irritability_notes = ?, nature = ?, nature_notes = ?, doctor_id = ?, pain_scale = ?, updated_at = datetime('now', 'localtime') 
        WHERE id = ? AND profile_id = ?
      `).run(chief_complaint, aggravating, easing, irritability, irritability_notes, nature, nature_notes, doctor_id || null, pain_scale || null, id, profileId);
      return { success: true, id };
    } else {
      const res = db.prepare(`
        INSERT INTO PTSubjective (profile_id, chief_complaint, aggravating, easing, irritability, irritability_notes, nature, nature_notes, doctor_id, pain_scale, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(profileId, chief_complaint, aggravating, easing, irritability, irritability_notes, nature, nature_notes, doctor_id || null, pain_scale || null);
      return { success: true, id: res.lastInsertRowid };
    }
  } catch (error) {
    console.error('Error saving PT subjective:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- PT OBJECTIVE ROWS (AROM/PROM) ---
// ============================================================

ipcMain.handle('get-pt-objective-rows', async (event, profileId, subjectiveId) => {
  try {
    if (subjectiveId) {
      return db.prepare('SELECT * FROM PTObjectiveRows WHERE profile_id = ? AND subjective_id = ? ORDER BY row_type, sort_order').all(profileId, subjectiveId);
    }
    return db.prepare('SELECT * FROM PTObjectiveRows WHERE profile_id = ? AND (subjective_id IS NULL OR subjective_id = (SELECT MIN(id) FROM PTSubjective WHERE profile_id = ?)) ORDER BY row_type, sort_order').all(profileId, profileId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('save-pt-objective-rows', async (event, profileId, data) => {
  try {
    const { subjectiveId, rows } = data;
    if (!subjectiveId) {
      return { success: false, error: 'subjectiveId is required to save objective rows.' };
    }
    // Delete all existing rows for this profile and this assessment
    db.prepare('DELETE FROM PTObjectiveRows WHERE profile_id = ? AND subjective_id = ?').run(profileId, subjectiveId);
    rows.forEach((row, idx) => {
      db.prepare('INSERT INTO PTObjectiveRows (profile_id, subjective_id, row_type, joint_name, pain, limitation, angle, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(profileId, subjectiveId, row.row_type, row.joint_name || '', row.pain ? 1 : 0, row.limitation ? 1 : 0, row.angle || '', idx);
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving PT objective rows:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- PT PALPATION ---
// ============================================================

ipcMain.handle('get-pt-palpation', async (event, profileId, subjectiveId) => {
  try {
    if (subjectiveId) {
      return db.prepare('SELECT * FROM PTObjectivePalpation WHERE profile_id = ? AND subjective_id = ?').get(profileId, subjectiveId) || { notes: '' };
    }
    return db.prepare('SELECT * FROM PTObjectivePalpation WHERE profile_id = ? AND (subjective_id IS NULL OR subjective_id = (SELECT MIN(id) FROM PTSubjective WHERE profile_id = ?))').get(profileId, profileId) || { notes: '' };
  } catch (error) {
    return { notes: '' };
  }
});

ipcMain.handle('save-pt-palpation', async (event, profileId, data) => {
  try {
    const { subjectiveId, notes, doctor_id } = data;
    if (!subjectiveId) {
      return { success: false, error: 'subjectiveId is required to save palpation notes.' };
    }
    const existing = db.prepare('SELECT id FROM PTObjectivePalpation WHERE profile_id = ? AND subjective_id = ?').get(profileId, subjectiveId);
    if (existing) {
      db.prepare("UPDATE PTObjectivePalpation SET notes = ?, doctor_id = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(notes, doctor_id || null, existing.id);
    } else {
      db.prepare("INSERT INTO PTObjectivePalpation (profile_id, subjective_id, notes, doctor_id, updated_at) VALUES (?, ?, ?, ?, datetime('now','localtime'))").run(profileId, subjectiveId, notes, doctor_id || null);
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving PT palpation:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-pt-assessment', async (event, subjectiveId) => {
  try {
    db.prepare('DELETE FROM PTObjectiveRows WHERE subjective_id = ?').run(subjectiveId);
    db.prepare('DELETE FROM PTObjectivePalpation WHERE subjective_id = ?').run(subjectiveId);
    db.prepare('DELETE FROM PTSubjective WHERE id = ?').run(subjectiveId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting PT assessment:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- PT SPECIAL TESTS (uses existing AssessmentResults table but linked to profile) ---
// ============================================================

ipcMain.handle('get-pt-special-test-results', async (event, profileId) => {
  try {
    // Get the client_id for this profile
    const profile = db.prepare('SELECT client_id FROM ClientProfiles WHERE id = ?').get(profileId);
    if (!profile) return [];
    // Return latest result per test for this client
    return db.prepare(`
      SELECT r.*, t.name as test_name, reg.name as region_name
      FROM AssessmentResults r
      INNER JOIN (
        SELECT test_id, MAX(created_at) as max_date
        FROM AssessmentResults
        WHERE client_id = ?
        GROUP BY test_id
      ) latest ON r.test_id = latest.test_id AND r.created_at = latest.max_date
      JOIN AssessmentTests t ON r.test_id = t.id
      JOIN AssessmentRegions reg ON t.region_id = reg.id
      WHERE r.client_id = ?
    `).all(profile.client_id, profile.client_id);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('save-pt-special-test-result', async (event, { profileId, testId, result }) => {
  try {
    const profile = db.prepare('SELECT client_id FROM ClientProfiles WHERE id = ?').get(profileId);
    if (!profile) return { success: false, error: 'Profile not found' };
    db.prepare("INSERT INTO AssessmentResults (client_id, test_id, result, created_at) VALUES (?, ?, ?, datetime('now','localtime'))").run(profile.client_id, testId, result);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- PT SESSION PLAN ---
// ============================================================

ipcMain.handle('get-pt-session-plan', async (event, profileId) => {
  try {
    return db.prepare('SELECT * FROM PTSessionPlan WHERE profile_id = ? ORDER BY updated_at DESC').get(profileId) || { electrotherapy: null, manual_therapy: null, tools: null };
  } catch (error) {
    return { electrotherapy: null, manual_therapy: null, tools: null };
  }
});

ipcMain.handle('get-pt-session-plans', async (event, profileId) => {
  try {
    return db.prepare(`
      SELECT sp.*, d.name as doctor_name
      FROM PTSessionPlan sp
      LEFT JOIN Doctors d ON sp.doctor_id = d.id
      WHERE sp.profile_id = ?
      ORDER BY sp.updated_at DESC, sp.id DESC
    `).all(profileId);
  } catch (error) {
    console.error('Error fetching PT session plans:', error);
    return [];
  }
});

ipcMain.handle('save-pt-session-plan', async (event, profileId, data) => {
  try {
    const { id, electrotherapy, manual_therapy, tools, doctor_id } = data;
    if (id) {
      db.prepare(`
        UPDATE PTSessionPlan 
        SET electrotherapy = ?, manual_therapy = ?, tools = ?, doctor_id = ?, updated_at = datetime('now', 'localtime') 
        WHERE id = ? AND profile_id = ?
      `).run(electrotherapy, manual_therapy, tools, doctor_id || null, id, profileId);
    } else {
      db.prepare(`
        INSERT INTO PTSessionPlan (profile_id, electrotherapy, manual_therapy, tools, doctor_id, updated_at) 
        VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(profileId, electrotherapy, manual_therapy, tools, doctor_id || null);
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving PT session plan:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-pt-session-plan', async (event, id) => {
  try {
    db.prepare('DELETE FROM PTSessionPlan WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting PT session plan:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- NUTRITION: MEDICAL HISTORY ---
// ============================================================

ipcMain.handle('get-nutrition-history', async (event, profileId) => {
  try {
    return db.prepare(`
      SELECT nmh.*, d.name as doctor_name
      FROM NutritionMedicalHistory nmh
      LEFT JOIN Doctors d ON nmh.doctor_id = d.id
      WHERE nmh.profile_id = ?
      ORDER BY nmh.session_date DESC, nmh.created_at DESC
    `).all(profileId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('add-nutrition-history', async (event, profileId, data) => {
  try {
    const res = db.prepare("INSERT INTO NutritionMedicalHistory (profile_id, content, session_date, height, weight, doctor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))").run(profileId, data.content, data.session_date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Cairo' }), data.height ? parseFloat(data.height) : null, data.weight ? parseFloat(data.weight) : null, data.doctor_id || null);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-nutrition-history', async (event, id, data) => {
  try {
    db.prepare('UPDATE NutritionMedicalHistory SET content = ?, height = ?, weight = ?, doctor_id = ? WHERE id = ?').run(data.content, data.height ? parseFloat(data.height) : null, data.weight ? parseFloat(data.weight) : null, data.doctor_id || null, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-nutrition-history', async (event, id) => {
  try {
    db.prepare('DELETE FROM NutritionMedicalHistory WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- INVESTIGATION LIBRARY ---
// ============================================================

ipcMain.handle('get-investigation-library', async () => {
  try {
    return db.prepare('SELECT * FROM InvestigationLibrary ORDER BY name').all();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('add-to-investigation-library', async (event, name) => {
  try {
    const res = db.prepare("INSERT OR IGNORE INTO InvestigationLibrary (name, created_at) VALUES (?, datetime('now','localtime'))").run(name);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-from-investigation-library', async (event, id) => {
  try {
    db.prepare('DELETE FROM ClientInvestigations WHERE investigation_id = ?').run(id);
    db.prepare('DELETE FROM InvestigationLibrary WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-client-investigations', async (event, profileId) => {
  try {
    return db.prepare(`
      SELECT ci.*, il.name, d.name as doctor_name
      FROM ClientInvestigations ci
      JOIN InvestigationLibrary il ON ci.investigation_id = il.id
      LEFT JOIN Doctors d ON ci.doctor_id = d.id
      WHERE ci.profile_id = ?
      ORDER BY ci.created_at DESC
    `).all(profileId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('assign-investigation', async (event, profileId, investigationId, doctorId) => {
  try {
    const res = db.prepare("INSERT INTO ClientInvestigations (profile_id, investigation_id, doctor_id, created_at) VALUES (?, ?, ?, datetime('now','localtime'))").run(profileId, investigationId, doctorId || null);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-investigation-result', async (event, id, data) => {
  try {
    db.prepare('UPDATE ClientInvestigations SET result_text = ?, result_date = ? WHERE id = ?').run(data.result_text, data.result_date || null, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-client-investigation', async (event, id) => {
  try {
    db.prepare('DELETE FROM ClientInvestigations WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- INBODY UPLOADS ---
// ============================================================

ipcMain.handle('upload-inbody-photo', async (event, profileId) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    if (canceled || filePaths.length === 0) return { success: false, error: 'Canceled' };
    const sourcePath = filePaths[0];
    const fileName = path.basename(sourcePath);
    const safeFileName = Date.now() + '_inbody_' + fileName.replace(/\s+/g, '_');
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'client_files');
    if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
    const destPath = path.join(filesDir, safeFileName);
    fs.copyFileSync(sourcePath, destPath);
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Cairo' });
    const res = db.prepare("INSERT INTO InbodyUploads (profile_id, file_name, local_file_path, session_date, upload_date) VALUES (?, ?, ?, ?, datetime('now','localtime'))").run(profileId, fileName, destPath, today);
    return { success: true, id: res.lastInsertRowid, fileName, local_file_path: destPath, session_date: today };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-inbody-uploads', async (event, profileId) => {
  try {
    return db.prepare('SELECT * FROM InbodyUploads WHERE profile_id = ? ORDER BY session_date DESC').all(profileId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('delete-inbody-upload', async (event, id) => {
  try {
    const record = db.prepare('SELECT local_file_path FROM InbodyUploads WHERE id = ?').get(id);
    if (record && record.local_file_path && fs.existsSync(record.local_file_path)) {
      try { fs.unlinkSync(record.local_file_path); } catch(e) {}
    }
    db.prepare('DELETE FROM InbodyUploads WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- LYMPHATIC MEASUREMENTS ---
// ============================================================

ipcMain.handle('get-lymphatic-measurements', async (event, profileId) => {
  try {
    return db.prepare(`
      SELECT lm.*, d.name as doctor_name
      FROM LymphaticMeasurements lm
      LEFT JOIN Doctors d ON lm.doctor_id = d.id
      WHERE lm.profile_id = ?
      ORDER BY lm.measurement_name, lm.session_date DESC
    `).all(profileId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('save-lymphatic-measurement', async (event, profileId, data) => {
  try {
    const res = db.prepare("INSERT INTO LymphaticMeasurements (profile_id, measurement_name, value, unit, session_date, doctor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))").run(profileId, data.measurement_name, data.value, data.unit || 'cm', data.session_date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Cairo' }), data.doctor_id || null);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-lymphatic-measurement', async (event, id) => {
  try {
    db.prepare('DELETE FROM LymphaticMeasurements WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- SESSION TYPES LIBRARY ---
// ============================================================

ipcMain.handle('get-session-types', async () => {
  try {
    return db.prepare('SELECT * FROM SessionTypes WHERE is_active = 1 AND branch_id = ? ORDER BY name').all(currentBranchId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('create-session-type', async (event, data) => {
  try {
    const res = db.prepare("INSERT INTO SessionTypes (name, cost, num_sessions, is_active, branch_id, created_at) VALUES (?, ?, ?, 1, ?, datetime('now','localtime'))").run(data.name, data.cost, data.num_sessions || null, currentBranchId);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-session-type', async (event, id, data) => {
  try {
    db.prepare('UPDATE SessionTypes SET name = ?, cost = ?, num_sessions = ? WHERE id = ?').run(data.name, data.cost, data.num_sessions || null, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-session-type', async (event, id) => {
  try {
    db.prepare('UPDATE SessionTypes SET is_active = 0 WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- HOME EXERCISES ---
// ============================================================

ipcMain.handle('get-home-exercises', async (event, clientId) => {
  try {
    return db.prepare(`
      SELECT he.*, e.name as exercise_name, e.instructions, e.video_url, er.name as region_name
      FROM ClientExercisesHome he
      JOIN Exercises e ON he.exercise_id = e.id
      LEFT JOIN ExerciseRegions er ON e.region_id = er.id
      WHERE he.client_id = ?
      ORDER BY he.assigned_at DESC
    `).all(clientId);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('assign-home-exercise', async (event, data) => {
  try {
    const { client_id, exercise_id, doctor_id, sets, reps, frequency, notes, profile_id } = data;
    const res = db.prepare("INSERT INTO ClientExercisesHome (client_id, exercise_id, doctor_id, sets, reps, frequency, notes, profile_id, assigned_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))").run(client_id, exercise_id, doctor_id || null, sets, reps, frequency, notes, profile_id || null);
    return { success: true, id: res.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-home-exercise', async (event, id) => {
  try {
    db.prepare('DELETE FROM ClientExercisesHome WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-home-exercise', async (event, id, data) => {
  try {
    db.prepare("UPDATE ClientExercisesHome SET sets = ?, reps = ?, frequency = ?, notes = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(data.sets || null, data.reps || null, data.frequency || null, data.notes || null, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================
// --- ATTENDANCE / SHIFT LOGGING ---
// ============================================================

ipcMain.handle('clock-in', async (event, { userId, date, time }) => {
  try {
    const logDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Cairo' });
    const checkInTime = time || new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Africa/Cairo' });
    
    const existing = db.prepare('SELECT id FROM AttendanceLogs WHERE user_id = ? AND log_date = ?').get(userId, logDate);
    if (existing) {
      db.prepare('UPDATE AttendanceLogs SET check_in_time = ? WHERE id = ?').run(checkInTime, existing.id);
    } else {
      db.prepare('INSERT INTO AttendanceLogs (user_id, log_date, check_in_time) VALUES (?, ?, ?)').run(userId, logDate, checkInTime);
    }
    return { success: true };
  } catch (error) {
    console.error('Error clocking in:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clock-out', async (event, { userId, date, time }) => {
  try {
    const logDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Cairo' });
    const checkOutTime = time || new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Africa/Cairo' });
    
    const existing = db.prepare('SELECT id FROM AttendanceLogs WHERE user_id = ? AND log_date = ?').get(userId, logDate);
    if (existing) {
      db.prepare('UPDATE AttendanceLogs SET check_out_time = ? WHERE id = ?').run(checkOutTime, existing.id);
    } else {
      db.prepare('INSERT INTO AttendanceLogs (user_id, log_date, check_out_time) VALUES (?, ?, ?)').run(userId, logDate, checkOutTime);
    }
    return { success: true };
  } catch (error) {
    console.error('Error clocking out:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-attendance-logs', async (event, date) => {
  try {
    const logDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Cairo' });
    return db.prepare(`
      SELECT u.id as user_id, u.username, u.role, 
             al.check_in_time, al.check_out_time, al.log_date
      FROM Users u
      LEFT JOIN AttendanceLogs al ON u.id = al.user_id AND al.log_date = ?
      WHERE u.branch_id = ?
      ORDER BY u.username ASC
    `).all(logDate, currentBranchId);
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    return [];
  }
});

// --- BACKGROUND AUTO-SYNC AUTOMATION (5-MINUTE INTERVAL) ---
async function runBackgroundSyncJob() {
  if (!db) {
    logger.warn('Sync', 'Background sync job deferred: database not initialized.');
    return;
  }
  logger.info('Sync', 'Starting background auto-sync worker...');
  try {
    // 1. Process and drain the offline retry queue first
    try {
      const queueRes = await processSyncQueue(db);
      if (queueRes.success && queueRes.count > 0) {
        logger.info('Sync', `Background sync queue processor processed ${queueRes.count} retries.`);
      }
    } catch (queueErr) {
      logger.error('Sync', 'Offline queue processor failed:', { error: queueErr.message });
    }

    // 2. Sync users and appointments globally
    try {
      await syncUsers(db);
      await syncAppointments(db);
      logger.info('Sync', 'Global users and appointments synced successfully.');
    } catch (syncErr) {
      logger.error('Sync', 'Global tables sync failed:', { error: syncErr.message });
    }

    // 3. Fetch all clients with sync token
    const clients = db.prepare("SELECT * FROM Clients WHERE sync_token IS NOT NULL AND sync_token != ''").all();
    if (clients.length === 0) {
      logger.info('Sync', 'No active clients with sync tokens found.');
      return;
    }

    logger.info('Sync', `Found ${clients.length} clients registered for sync. Validating updates...`);
    
    // Fetch active doctors list once to pass to payload
    const docsList = db.prepare("SELECT * FROM Doctors WHERE status = 'active' ORDER BY name ASC").all();
    
    for (const client of clients) {
      try {
        // --- INCREMENTAL SYNC CHECK ---
        const lastSyncSetting = db.prepare("SELECT value FROM Settings WHERE key = ?").get(`last_sync_${client.id}`);
        if (lastSyncSetting) {
          const lastSync = lastSyncSetting.value;
          // Check for modifications in sub-tables since last successful sync
          const sessCount = db.prepare("SELECT COUNT(*) as count FROM Sessions WHERE client_id = ? AND session_date > ?").get(client.id, lastSync).count;
          const asmtCount = db.prepare("SELECT COUNT(*) as count FROM Assessments WHERE client_id = ? AND created_at > ?").get(client.id, lastSync).count;
          const payCount = db.prepare("SELECT COUNT(*) as count FROM Payments WHERE client_id = ? AND payment_date > ?").get(client.id, lastSync).count;
          const exCount = db.prepare("SELECT COUNT(*) as count FROM ClientExercises WHERE client_id = ? AND updated_at > ?").get(client.id, lastSync).count;

          if (sessCount === 0 && asmtCount === 0 && payCount === 0 && exCount === 0) {
            // No changes since last sync - skip compiling large payload
            logger.info('Sync', `Incremental sync skip: patient #${client.id} (${client.first_name}) has no changes since ${lastSync}.`);
            continue;
          }
        }

        logger.info('Sync', `Compiling incremental sync payload for patient #${client.id} (${client.first_name} ${client.last_name})...`);

        // Fetch clinical exercises
        const assignedExercises = db.prepare(`
          SELECT ce.*, e.name as exercise_name, d.name as doctor_name 
          FROM ClientExercises ce 
          JOIN Exercises e ON ce.exercise_id = e.id 
          LEFT JOIN Doctors d ON ce.doctor_id = d.id 
          WHERE ce.client_id = ?
        `).all(client.id);

        // Fetch home exercises
        const homeExercises = db.prepare(`
          SELECT he.*, e.name as exercise_name, d.name as doctor_name 
          FROM ClientExercisesHome he 
          JOIN Exercises e ON he.exercise_id = e.id 
          LEFT JOIN Doctors d ON he.doctor_id = d.id 
          WHERE he.client_id = ?
        `).all(client.id);

        // Fetch sessions
        const sessions = db.prepare(`
          SELECT s.*, d.name as doctor_name, st.name as session_type_name 
          FROM Sessions s 
          LEFT JOIN Doctors d ON s.doctor_id = d.id 
          LEFT JOIN SessionTypes st ON s.session_type_id = st.id
          WHERE s.client_id = ?
        `).all(client.id);

        // Fetch assessments
        const assessments = db.prepare(`
          SELECT a.*, d.name as doctor_name 
          FROM Assessments a 
          LEFT JOIN Doctors d ON a.doctor_id = d.id 
          WHERE a.client_id = ?
        `).all(client.id);

        // Fetch payments
        const payments = db.prepare(`SELECT * FROM Payments WHERE client_id = ?`).all(client.id);

        // Fetch audit logs
        const auditLogs = db.prepare(`SELECT * FROM AuditLogs WHERE client_id = ?`).all(client.id);

        // Fetch assessment structure and results
        const assessmentRegions = db.prepare("SELECT * FROM AssessmentRegions").all();
        const assessmentTests = db.prepare("SELECT * FROM AssessmentTests").all();
        const assessmentResults = db.prepare(`
          SELECT ar.*, t.name as test_name 
          FROM AssessmentResults ar
          JOIN AssessmentTests t ON ar.test_id = t.id
          WHERE ar.client_id = ?
        `).all(client.id);

        // Fetch profiles
        const profiles = db.prepare(`SELECT * FROM ClientProfiles WHERE client_id = ?`).all(client.id);
        const clientProfiles = [];

        for (const p of profiles) {
          const profileData = {
            id: p.id,
            client_id: p.client_id,
            profile_type: p.profile_type,
            name: p.name,
            created_at: p.created_at,
            redFlags: null,
            subjective: null,
            ptSubjectives: [],
            objectiveRows: [],
            palpation: null,
            palpations: [],
            sessionPlan: null,
            sessionPlans: [],
            nutritionHistory: [],
            investigations: [],
            inbodyUploads: [],
            lymphaticMeasurements: []
          };

          if (p.profile_type === 'physical_therapy') {
            profileData.redFlags = db.prepare("SELECT * FROM PTRedFlags WHERE profile_id = ?").get(p.id);
            if (profileData.redFlags) {
              try {
                profileData.redFlags.flags = JSON.parse(profileData.redFlags.flags);
              } catch (e) {
                profileData.redFlags.flags = [];
              }
            }
            profileData.ptSubjectives = db.prepare("SELECT * FROM PTSubjective WHERE profile_id = ? ORDER BY updated_at DESC").all(p.id);
            profileData.objectiveRows = db.prepare("SELECT * FROM PTObjectiveRows WHERE profile_id = ? ORDER BY sort_order").all(p.id);
            profileData.palpations = db.prepare("SELECT * FROM PTObjectivePalpation WHERE profile_id = ? ORDER BY updated_at DESC").all(p.id);
            
            profileData.subjective = profileData.ptSubjectives[0] || null;
            profileData.palpation = profileData.palpations[0] || null;
            
            profileData.sessionPlan = db.prepare("SELECT * FROM PTSessionPlan WHERE profile_id = ? ORDER BY updated_at DESC").get(p.id);
            profileData.sessionPlans = db.prepare("SELECT * FROM PTSessionPlan WHERE profile_id = ? ORDER BY updated_at DESC").all(p.id);
          } else if (p.profile_type === 'nutrition') {
            profileData.nutritionHistory = db.prepare("SELECT * FROM NutritionMedicalHistory WHERE profile_id = ? ORDER BY session_date DESC").all(p.id);
            
            profileData.investigations = db.prepare(`
              SELECT ci.*, il.name as investigation_name 
              FROM ClientInvestigations ci 
              JOIN InvestigationLibrary il ON ci.investigation_id = il.id 
              WHERE ci.profile_id = ?
            `).all(p.id);

            profileData.inbodyUploads = db.prepare("SELECT * FROM InbodyUploads WHERE profile_id = ? ORDER BY session_date DESC").all(p.id);
          } else if (p.profile_type === 'lymphatic') {
            profileData.lymphaticMeasurements = db.prepare("SELECT * FROM LymphaticMeasurements WHERE profile_id = ? ORDER BY session_date DESC").all(p.id);
          }

          clientProfiles.push(profileData);
        }

        // Construct full sync payload
        const payload = {
          patientData: {
            ...client,
            pin: client.pin || '1234'
          },
          exercises: assignedExercises,
          homeExercises,
          sessions,
          assessments,
          payments,
          auditLogs,
          doctors: docsList,
          assessmentRegions,
          assessmentTests,
          assessmentResults,
          clientProfiles
        };

        // Call syncPatientPlan
        const syncResult = await syncPatientPlan(payload);
        if (syncResult.success) {
          logger.info('Sync', `Background sync succeeded for client #${client.id} (${client.first_name} ${client.last_name}).`);
          // Record successful sync timestamp
          const now = new Date().toISOString();
          db.prepare("INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)")
            .run(`last_sync_${client.id}`, now);
        } else {
          // If background sync fails, queue it!
          logger.warn('Sync', `Background sync failed for client #${client.id}. Queueing...`, { error: syncResult.error });
          const payloadString = JSON.stringify(payload);
          db.prepare("INSERT INTO SyncQueue (client_id, payload, error_message) VALUES (?, ?, ?)")
            .run(client.id, payloadString, syncResult.error || 'Offline');
        }

      } catch (err) {
        logger.error('Sync', `Error in background sync for client #${client.id}:`, { error: err.message });
      }
    }
    logger.info('Sync', 'Background sync job completed successfully.');
  } catch (globalErr) {
    logger.critical('Sync', 'Critical background sync job error:', { error: globalErr.message });
  }
}

// Synchronous confirm dialog helper using native OS dialog
ipcMain.on('show-confirm-dialog', (event, message) => {
  try {
    const result = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0,
      title: 'Confirm Action',
      message: message
    });
    event.returnValue = (result === 1);
  } catch (error) {
    console.error('Error showing confirm dialog:', error);
    event.returnValue = false;
  }
});



