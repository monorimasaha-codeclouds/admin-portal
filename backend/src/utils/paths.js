const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Returns a writable path for temporary files.
 * On Vercel, this is /tmp. Locally, it's the project's relative path.
 */
function getWritablePath(relativePath) {
  const isVercel = process.env.VERCEL || process.env.NOW_REGION;

  if (isVercel) {
    const tmpPath = path.join('/tmp', relativePath);
    const dir = path.dirname(tmpPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return tmpPath;
  }

  // Local development: use project root
  const localPath = path.join(__dirname, '../../', relativePath);
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return localPath;
}

/**
 * Ensures a directory exists and returns its path.
 */
function getWritableDir(relativeDir) {
  const isVercel = process.env.VERCEL || process.env.NOW_REGION;
  const baseDir = isVercel ? '/tmp' : path.join(__dirname, '../../');
  const targetDir = path.join(baseDir, relativeDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}

module.exports = { getWritablePath, getWritableDir };
