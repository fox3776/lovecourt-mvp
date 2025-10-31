const fs = require('fs')
const path = require('path')

const SRC_DIR = path.resolve(process.cwd(), 'static')
const OUT_DIR = path.resolve(process.cwd(), 'dist', 'static')

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function isBase64PngText(buf) {
  // Detect common base64 header for PNG and ASCII-only content
  const text = buf.toString('utf8')
  if (!/^[-A-Za-z0-9+/=\r\n]+$/.test(text)) return false
  return text.trim().startsWith('iVBOR')
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    ensureDir(dest)
    const entries = fs.readdirSync(src)
    for (const name of entries) {
      copyRecursive(path.join(src, name), path.join(dest, name))
    }
    return
  }
  // file
  const buf = fs.readFileSync(src)
  let out = buf
  try {
    if (isBase64PngText(buf)) {
      out = Buffer.from(buf.toString('utf8').trim(), 'base64')
    }
  } catch (_) {}
  ensureDir(path.dirname(dest))
  fs.writeFileSync(dest, out)
}

if (fs.existsSync(SRC_DIR)) {
  copyRecursive(SRC_DIR, OUT_DIR)
  console.log(`[copyStatic] Copied static → ${OUT_DIR}`)
} else {
  console.log('[copyStatic] No static directory, skip')
}

