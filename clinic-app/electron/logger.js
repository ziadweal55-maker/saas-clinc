const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logFilePath = '';

function getLogFilePath() {
  if (logFilePath) return logFilePath;
  try {
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    logFilePath = path.join(logsDir, 'app.log');
  } catch (e) {
    // Fallback if app is not initialized yet
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    logFilePath = path.join(logsDir, 'app.log');
  }
  return logFilePath;
}

function rotateLogsIfNeeded() {
  const filePath = getLogFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (stats.size > maxSize) {
        console.log('[Logger] Rotating log files...');
        // Rotate existing logs
        for (let i = 3; i >= 1; i--) {
          const oldPath = `${filePath}.${i}`;
          const newPath = `${filePath}.${i + 1}`;
          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
          }
        }
        fs.renameSync(filePath, `${filePath}.1`);
      }
    }
  } catch (err) {
    console.error('[Logger] Failed to rotate logs:', err);
  }
}

function writeLog(level, moduleName, message, metadata = {}) {
  rotateLogsIfNeeded();
  const filePath = getLogFilePath();
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    module: moduleName,
    message,
    ...metadata
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  try {
    fs.appendFileSync(filePath, logLine);
  } catch (err) {
    console.error('[Logger] Failed to write log line:', err);
  }
}

module.exports = {
  info: (moduleName, message, metadata) => writeLog('INFO', moduleName, message, metadata),
  warn: (moduleName, message, metadata) => writeLog('WARN', moduleName, message, metadata),
  error: (moduleName, message, metadata) => writeLog('ERROR', moduleName, message, metadata),
  critical: (moduleName, message, metadata) => writeLog('CRITICAL', moduleName, message, metadata)
};
