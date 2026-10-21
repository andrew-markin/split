// Renders the link preview image from its SVG source using the application font.
// Run with `npm run og-image` and commit the result along with the source.
// Bump the image version in index.html then, since link previews cache images by URL.
// Needs Chrome or Chromium, its binary can be set by the CHROME variable.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE = new URL('../assets/og-image.svg', import.meta.url)
const OUTPUT = new URL('../public/og-image.png', import.meta.url)
const FONT = new URL(
  '../node_modules/@quasar/extras/exports/roboto-font/roboto-font.css',
  import.meta.url
)

const WIDTH = 1200
const HEIGHT = 630
const BROWSERS = ['google-chrome', 'chromium', 'chromium-browser']

const svg = readFileSync(SOURCE, 'utf8').replace(/^<\?xml[^>]*>\s*/, '')
const html = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="${FONT.href}" />
    <style>
      body { margin: 0; overflow: hidden; }
      svg { display: block; }
    </style>
  </head>
  <body>${svg}</body>
</html>`

const dir = mkdtempSync(join(tmpdir(), 'og-image-'))
try {
  const page = join(dir, 'page.html')
  writeFileSync(page, html)
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--allow-file-access-from-files',
    '--hide-scrollbars',
    // Gives the web font time to load before the screenshot is taken
    '--virtual-time-budget=3000',
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${fileURLToPath(OUTPUT)}`,
    `file://${page}`
  ]
  const browsers = process.env.CHROME ? [process.env.CHROME] : BROWSERS
  const rendered = browsers.some((browser) => {
    try {
      execFileSync(browser, args, { stdio: 'ignore' })
      return true
    } catch (err) {
      if (err.code === 'ENOENT') return false
      throw err
    }
  })
  if (!rendered) throw new Error('Chrome is not found, set its binary by the CHROME variable')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
