// Records a walkthrough video of filling a split along with its subtitles, with no dependencies:
// builds the application, serves the build, drives Google Chrome via the DevTools protocol,
// encodes the screencast by ffmpeg and adds the captions as a subtitles track and file,
// optionally also as a bar below the page. The captions are voiced by Piper when the locale
// has a voice. Needs a running Blobs backend, Chrome, ffmpeg and Piper for the voice.
// Run with `npm run demo -- --locale ru`, see the options below.

import { spawn, spawnSync } from 'node:child_process'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import content from './content.js'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const { values: options } = parseArgs({
  options: {
    locale: { type: 'string', default: 'ru' },
    backend: { type: 'string', default: 'ws://localhost:3000' },
    out: { type: 'string', default: 'videos' },
    chrome: { type: 'string', default: process.env.CHROME || 'google-chrome' },
    // Slows down (> 1) or speeds up (< 1) all the pauses and movements
    pace: { type: 'string', default: '1' },
    // Captions are always saved as subtitles, this option also renders them in a bar below
    // the page, needs ffmpeg built with libass
    captions: { type: 'boolean', default: false },
    // Directory with the Piper binary in bin/piper and the voice models in voices
    piper: { type: 'string', default: join(homedir(), '.cache/split-demo/piper') },
    // Records the video without the voice
    mute: { type: 'boolean', default: false },
    // Prints the phonemes of the captions speech to check the pronunciation, records nothing
    phonemes: { type: 'boolean', default: false },
    // Shows the browser window, for debugging of the scenario
    show: { type: 'boolean', default: false }
  }
})

const WIDTH = 1280
const HEIGHT = 720
const FPS = 30
// The captions bar is added below the page, so it never covers the application
const BAR_HEIGHT = options.captions ? 96 : 0
const PAGE_HEIGHT = HEIGHT - BAR_HEIGHT
const BAR_COLOR = '5c6bc0'
const CAPTION_FONT = 'Noto Sans'
const PACE = Number(options.pace)

const locale = options.locale
const data = content[locale]
if (!data) throw new Error(`No demo content for the "${locale}" locale`)
const messages = JSON.parse(readFileSync(join(ROOT, 'src/locales', `${locale}.json`), 'utf8'))

function t(key) {
  if (!(key in messages)) throw new Error(`No "${key}" message in the "${locale}" locale`)
  return messages[key]
}

const wait = (ms) => sleep(ms * PACE)

const captionText = (caption) => (typeof caption === 'string' ? caption : caption.text)

// Spells out the words the voice reads poorly, longer ones first, e.g. a link before its domain
const pronunciations = Object.entries(data.pronunciations || {})
  .sort(([a], [b]) => b.length - a.length)
  .map(([word, speech]) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return [new RegExp(`(?<![\\p{L}\\d])${escaped}(?![\\p{L}\\d])`, 'giu'), speech]
  })

function captionSpeech(caption) {
  if (typeof caption !== 'string' && caption.speech) return caption.speech
  return pronunciations.reduce(
    (speech, [pattern, replacement]) => speech.replace(pattern, replacement),
    captionText(caption)
  )
}

// Build and serving

function build(dir) {
  console.log('Building the application...')
  const result = spawnSync(
    join(ROOT, 'node_modules/.bin/vite'),
    ['build', '--outDir', dir, '--emptyOutDir'],
    {
      cwd: ROOT,
      // Variables from the environment take precedence over the .env files
      env: { ...process.env, VITE_BACKEND_URL: options.backend },
      stdio: ['ignore', 'ignore', 'inherit']
    }
  )
  if (result.status !== 0) throw new Error('Unable to build the application')
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

async function serve(dir) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    let file = resolve(join(dir, path))
    if (!file.startsWith(dir) || !existsSync(file) || path.endsWith('/')) {
      file = join(dir, 'index.html')
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] || 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return server
}

// Voice

function synthesize(text, { model, speaker = 0, lengthScale = 1 }) {
  const modelFile = join(options.piper, 'voices', `${model}.onnx`)
  const result = spawnSync(
    join(options.piper, 'bin/piper/piper'),
    [['--model', modelFile, '--speaker', speaker, '--length_scale', lengthScale], '--output_raw']
      .flat()
      .map(String),
    { input: text, maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'ignore'] }
  )
  if (result.status !== 0) throw new Error(`Unable to synthesize "${text}"`)
  return result.stdout
}

// eSpeak voices phonemizing the captions of the locales
const ESPEAK_VOICES = { en: 'en-us', ru: 'ru', es: 'es', pt: 'pt-br', de: 'de', fr: 'fr-fr' }

// Prints the speech of every caption along with its phonemes, where ˈ marks the stressed vowel
function printPhonemes() {
  const dir = join(options.piper, 'bin/piper')
  for (const caption of Object.values(data.captions)) {
    const speech = captionSpeech(caption)
    const result = spawnSync(
      join(dir, 'espeak-ng'),
      [`--path=${dir}`, '-v', ESPEAK_VOICES[locale], '-q', '--ipa', speech],
      { env: { ...process.env, LD_LIBRARY_PATH: dir }, encoding: 'utf8' }
    )
    if (result.status !== 0) throw new Error('Unable to run eSpeak')
    console.log(
      `${captionText(caption)}\n  ${speech}\n  ${result.stdout.trim().replace(/\n/g, ' ')}\n`
    )
  }
}

// Voice track assembled from the speeches placed at the times of their captions
class Narration {
  #clips = []

  constructor(voice) {
    const modelFile = join(options.piper, 'voices', `${voice.model}.onnx.json`)
    this.rate = JSON.parse(readFileSync(modelFile, 'utf8')).audio.sample_rate
    this.speeches = Object.fromEntries(
      Object.entries(data.captions).map(([key, caption]) => [
        key,
        synthesize(captionSpeech(caption), voice)
      ])
    )
  }

  // Places the speech at the time and returns its duration in seconds
  add(key, time) {
    const speech = this.speeches[key]
    this.#clips.push({ time, speech })
    return speech.length / 2 / this.rate
  }

  // Saves the track as raw 16-bit mono samples
  save(file, duration) {
    const track = Buffer.alloc(Math.ceil(duration * this.rate) * 2)
    for (const { time, speech } of this.#clips) {
      speech.copy(track, Math.round(time * this.rate) * 2)
    }
    writeFileSync(file, track)
  }
}

// Chrome and the DevTools protocol

async function launchChrome(profileDir) {
  const args = [
    `--user-data-dir=${profileDir}`,
    '--remote-debugging-port=0',
    `--window-size=${WIDTH},${PAGE_HEIGHT}`,
    `--lang=${locale}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    '--mute-audio',
    '--force-color-profile=srgb',
    'about:blank'
  ]
  if (!options.show) args.unshift('--headless=new')
  const chrome = spawn(options.chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  const browserUrl = await new Promise((resolve, reject) => {
    let output = ''
    chrome.on('error', reject)
    chrome.on('exit', () => reject(new Error(`Chrome exited unexpectedly:\n${output}`)))
    chrome.stderr.on('data', (chunk) => {
      output += chunk
      const matched = output.match(/DevTools listening on (ws:\/\/\S+)/)
      if (matched) resolve(matched[1])
    })
  })
  const { host } = new URL(browserUrl)
  const targets = await (await fetch(`http://${host}/json/list`)).json()
  const target = targets.find(({ type }) => type === 'page')
  return { chrome, pageUrl: target.webSocketDebuggerUrl }
}

class Connection {
  #ws
  #nextId = 1
  #pending = new Map()
  #listeners = new Map()

  static async open(url) {
    const connection = new Connection()
    connection.#ws = new WebSocket(url)
    connection.#ws.addEventListener('message', (event) => connection.#receive(event.data))
    await new Promise((resolve, reject) => {
      connection.#ws.addEventListener('open', resolve, { once: true })
      connection.#ws.addEventListener('error', reject, { once: true })
    })
    return connection
  }

  #receive(raw) {
    const message = JSON.parse(raw)
    if (message.id) {
      const { resolve, reject } = this.#pending.get(message.id)
      this.#pending.delete(message.id)
      if (message.error) reject(new Error(`${message.error.message} ${message.error.data || ''}`))
      else resolve(message.result)
    } else {
      this.#listeners.get(message.method)?.(message.params)
    }
  }

  send(method, params = {}) {
    const id = this.#nextId++
    this.#ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }))
  }

  on(method, listener) {
    this.#listeners.set(method, listener)
  }

  close() {
    this.#ws.close()
  }
}

// Video recording

class Recorder {
  #cdp
  #ffmpeg
  #closed
  #start
  #frame
  #written = 0

  constructor(cdp, file) {
    this.#cdp = cdp
    this.#ffmpeg = spawn(
      'ffmpeg',
      [
        ['-y', '-loglevel', 'error'],
        ['-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', FPS, '-i', 'pipe:0'],
        ['-vf', `scale=${WIDTH}:${PAGE_HEIGHT},format=yuv420p`],
        // Nearly lossless intermediate video, it's encoded again along with the captions
        ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '8', file]
      ]
        .flat()
        .map(String),
      { stdio: ['pipe', 'inherit', 'inherit'] }
    )
    this.#closed = new Promise((resolve) => this.#ffmpeg.on('close', resolve))
  }

  // Seconds since the start of the recording
  time() {
    return (performance.now() - this.#start) / 1000
  }

  async start() {
    this.#cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
      this.#cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
      this.#flush()
      this.#frame = Buffer.from(data, 'base64')
    })
    this.#start = performance.now()
    await this.#cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 95,
      maxWidth: WIDTH,
      maxHeight: PAGE_HEIGHT
    })
  }

  // Chrome sends frames only when the page changes, so the last frame is
  // repeated until the next one to keep the video frame rate constant
  #flush() {
    if (!this.#frame) return
    const due = Math.round(this.time() * FPS)
    for (; this.#written < due; this.#written++) this.#ffmpeg.stdin.write(this.#frame)
  }

  async stop() {
    await this.#cdp.send('Page.stopScreencast')
    this.#flush()
    this.#ffmpeg.stdin.end()
    await this.#closed
  }
}

// ISO 639-2 codes of the locales for the subtitles track
const LANGUAGES = { en: 'eng', ru: 'rus', es: 'spa', pt: 'por', de: 'deu', fr: 'fra' }

// Encodes the final video with the subtitles track, the optional captions bar and voice
function compose({ source, subtitlesFile, barFile, voiceFile, voiceRate, file }) {
  console.log('Encoding the video...')
  const filters = [`pad=${WIDTH}:${HEIGHT}:0:0:color=0x${BAR_COLOR}`]
  if (BAR_HEIGHT) filters.push(`ass=${barFile}`)
  const voiceInput = voiceFile ? ['-f', 's16le', '-ar', voiceRate, '-ac', '1', '-i', voiceFile] : []
  const voiceOutput = voiceFile
    ? [
        '-map',
        '2:a',
        '-af',
        'loudnorm=I=-16:TP=-1.5,alimiter=limit=0.84:level=false',
        '-c:a',
        'aac',
        '-b:a',
        '160k'
      ]
    : []
  const result = spawnSync(
    'ffmpeg',
    [
      ['-y', '-loglevel', 'error', '-i', source, '-i', subtitlesFile, ...voiceInput],
      ['-map', '0:v', '-map', '1:s', ...voiceOutput, '-vf', filters.join(',')],
      ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'animation'],
      ['-c:s', 'mov_text', '-metadata:s:s:0', `language=${LANGUAGES[locale] || 'und'}`],
      ['-metadata:s:a:0', `language=${LANGUAGES[locale] || 'und'}`],
      ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', file]
    ]
      .flat()
      .map(String),
    { stdio: 'inherit' }
  )
  if (result.status !== 0) throw new Error('Unable to encode the video')
}

class Subtitles {
  #cues = []

  add(start, text) {
    this.end(start)
    this.#cues.push({ start, end: undefined, text })
  }

  end(time) {
    const last = this.#cues.at(-1)
    if (last && last.end === undefined) last.end = time
  }

  save(file) {
    const stamp = (seconds) => new Date(seconds * 1000).toISOString().slice(11, 23)
    const cues = this.#cues.map(
      ({ start, end, text }, index) => `${index + 1}\n${stamp(start)} --> ${stamp(end)}\n${text}`
    )
    writeFileSync(file, `WEBVTT\n\n${cues.join('\n\n')}\n`)
  }

  // Captions for the bar in the ASS format rendered by ffmpeg
  saveBar(file) {
    const stamp = (seconds) => new Date(seconds * 1000).toISOString().slice(12, 22)
    const position = `\\an5\\pos(${WIDTH / 2},${PAGE_HEIGHT + BAR_HEIGHT / 2})\\fad(250,250)`
    const events = this.#cues.map(
      ({ start, end, text }) =>
        `Dialogue: 0,${stamp(start)},${stamp(end)},Caption,,0,0,0,,{${position}}` +
        text.replace(/[{}\\]/g, '')
    )
    writeFileSync(
      file,
      [
        '[Script Info]',
        'ScriptType: v4.00+',
        `PlayResX: ${WIDTH}`,
        `PlayResY: ${HEIGHT}`,
        'WrapStyle: 0',
        '',
        '[V4+ Styles]',
        'Format: Name, Fontname, Fontsize, PrimaryColour, Bold, BorderStyle, Outline, Shadow, ' +
          'Alignment, MarginL, MarginR, MarginV',
        `Style: Caption,${CAPTION_FONT},28,&H00FFFFFF,0,1,0,0,5,80,80,0`,
        '',
        '[Events]',
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
        ...events,
        ''
      ].join('\n')
    )
  }
}

// Script evaluated in the page before the application: sets the locale and adds
// a visible mouse cursor, along with the helpers locating the application elements
// by their texts

const PAGE_SCRIPT = `(() => {
  try {
    localStorage.setItem('split:locale', ${JSON.stringify(JSON.stringify(locale))})
  } catch {}

  const style = document.createElement('style')
  style.textContent = \`
    #demo-cursor {
      position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
      width: 26px; height: 26px; transform: translate(${WIDTH / 2}px, ${PAGE_HEIGHT / 2}px);
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
    }
    #demo-cursor::before {
      content: ''; position: absolute; left: -16px; top: -16px; width: 32px; height: 32px;
      border-radius: 50%; background: rgba(255, 193, 7, 0.55); transform: scale(0); opacity: 0;
    }
    #demo-cursor.pressed::before { animation: demo-press 0.45s ease-out; }
    @keyframes demo-press {
      0% { transform: scale(0.3); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
  \`

  const cursor = document.createElement('div')
  cursor.id = 'demo-cursor'
  cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26">' +
    '<path d="M3 2 L3 21 L8 16.5 L11.5 24 L15 22.5 L11.5 15 L18 15 Z" ' +
    'fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'

  document.addEventListener('DOMContentLoaded', () => {
    // A fresh profile may check the spelling with a dictionary of another language
    document.documentElement.spellcheck = false
    document.head.append(style)
    document.body.append(cursor)
  })

  window.addEventListener('mousemove', (event) => {
    cursor.style.transform = \`translate(\${event.clientX - 3}px, \${event.clientY - 2}px)\`
  }, true)
  window.addEventListener('mousedown', () => {
    cursor.classList.remove('pressed')
    void cursor.offsetWidth
    cursor.classList.add('pressed')
  }, true)

  const text = (el) => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : '')
  const all = (selector, root = document) =>
    root ? [...root.querySelectorAll(selector)].filter((el) => el.getClientRects().length) : []
  const leaving = (el) => el.classList.contains('fadeOut')

  let target

  window.__demo = {
    ready: () => !!document.querySelector('.app.ready section'),
    synced: () => !document.querySelector('.header .q-badge.bg-negative'),
    dialog: () => all('.backdrop').filter((el) => !leaving(el)).pop()?.querySelector('.q-card'),
    menu: () => all('.q-menu').length > 0,
    header: () => document.querySelector('.header .cursor-pointer'),
    menuButton: () => document.querySelector('.btn-menu'),
    section: (title) => all('section').find((el) => text(el.querySelector('.text-h6')) === title),
    add: (title) => __demo.section(title)?.querySelector('.q-btn'),
    field: (label) =>
      all('.q-field', __demo.dialog()).find((el) => text(el.querySelector('.q-field__label')) === label),
    button: (label) => all('.q-btn', __demo.dialog()).find((el) => text(el) === label),
    checkbox: (label) =>
      all('.q-checkbox', __demo.dialog()).find(
        (el) => text(el) === label || text(el).startsWith(label + ' (')
      ),
    thumb: (label) => __demo.checkbox(label)?.parentElement.querySelector('.q-slider__thumb'),
    rate: (label) =>
      Number(__demo.checkbox(label)?.parentElement.querySelector('[role=slider]')?.ariaValueNow),
    option: (label) => all('.q-menu .q-item').find((el) => text(el) === label),
    day: (day) =>
      all('.q-menu .q-date__calendar-item--in .q-btn').find((el) => text(el) === String(day)),
    row: (title, sender, receiver) => {
      const row = all('tbody tr', __demo.section(title)).find(
        (el) => text(el.children[1]) === sender && text(el.children[2]) === receiver
      )
      return row?.children[3]
    },
    // Scrolls the element to the top of the page, right below the header
    focus(el) {
      const top = el.getBoundingClientRect().top
      if (Math.abs(top - 64) < 4) return false
      el.style.scrollMarginTop = '64px'
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return true
    },
    // Remembers the element to act on and scrolls it into the view when it's
    // hidden behind the header
    target(el) {
      target = el
      if (!el) return false
      const rect = el.getBoundingClientRect()
      const top = el.closest('.backdrop, .q-menu') ? 0 : 70
      if (rect.top < top || rect.bottom > innerHeight - 10) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return 'scrolled'
      }
      return 'visible'
    },
    rect() {
      const rect = target.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
  }
})()`

// Scenario actions

let cdp
let recorder
const subtitles = new Subtitles()
const mouse = { x: WIDTH / 2, y: PAGE_HEIGHT / 2 }

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  })
  if (exceptionDetails) throw new Error(`${expression}: ${exceptionDetails.exception?.description}`)
  return result.value
}

async function waitFor(expression, timeout = 10000) {
  const deadline = Date.now() + timeout
  while (!(await evaluate(expression))) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${expression}`)
    await sleep(100)
  }
}

// Locates the element by the expression evaluated in the page and scrolls to it if needed
async function locate(expression) {
  await waitFor(expression)
  const state = await evaluate(`__demo.target(${expression})`)
  if (state === 'scrolled') await wait(900)
  return evaluate('__demo.rect()')
}

async function move(x, y) {
  const distance = Math.hypot(x - mouse.x, y - mouse.y)
  const duration = Math.min(Math.max(distance * 1.1, 250), 900) * PACE
  const steps = Math.max(Math.round(duration / 16), 1)
  const from = { ...mouse }
  for (let step = 1; step <= steps; step++) {
    const progress = step / steps
    const eased = progress < 0.5 ? 2 * progress ** 2 : 1 - (-2 * progress + 2) ** 2 / 2
    mouse.x = from.x + (x - from.x) * eased
    mouse.y = from.y + (y - from.y) * eased
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mouse.x, y: mouse.y })
    await sleep(16)
  }
}

async function hover(expression) {
  const { x, y } = await locate(expression)
  await move(x, y)
}

async function click(expression) {
  await hover(expression)
  await wait(150)
  const event = { x: mouse.x, y: mouse.y, button: 'left', clickCount: 1 }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...event })
  await sleep(80)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...event })
  await wait(350)
}

async function type(value) {
  for (const char of value) {
    await cdp.send('Input.insertText', { text: char })
    await wait(45 + Math.random() * 50)
  }
  await wait(300)
}

const KEYS = {
  ArrowLeft: { code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
  ArrowRight: { code: 'ArrowRight', windowsVirtualKeyCode: 39 },
  Escape: { code: 'Escape', windowsVirtualKeyCode: 27 }
}

async function press(key, times = 1) {
  for (let i = 0; i < times; i++) {
    const event = { key, ...KEYS[key] }
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...event })
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event })
    await wait(140)
  }
}

const str = (value) => JSON.stringify(value)

// Brings the section to the top, so its new items are seen well
async function focusSection(title) {
  const expression = `__demo.section(${str(title)})`
  await waitFor(expression)
  if (await evaluate(`__demo.focus(${expression})`)) await wait(1000)
}

async function openDialog(expression) {
  await click(expression)
  await waitFor('__demo.dialog()')
  // Lets the dialog slide in
  await wait(500)
}

async function fill(label, value) {
  await click(`__demo.field(${str(label)})`)
  await type(value)
}

async function select(label, option) {
  await click(`__demo.field(${str(label)})`)
  await click(`__demo.option(${str(option)})`)
  await waitFor('!__demo.menu()')
}

// Grabs the participation slider and moves it by the keyboard to the exact rate
async function setRate(label, rate) {
  await click(`__demo.thumb(${str(label)})`)
  for (let attempt = 0; ; attempt++) {
    const current = await evaluate(`__demo.rate(${str(label)})`)
    if (current === rate) break
    if (Number.isNaN(current) || attempt > 50) throw new Error(`Unable to set ${label} rate`)
    await press(current < rate ? 'ArrowRight' : 'ArrowLeft')
  }
  await wait(600)
}

async function submit(label = t('save')) {
  await click(`__demo.button(${str(label)})`)
  await waitFor('!__demo.dialog()')
  await wait(500)
}

let narration
let captionEnd = 0

// Shows the caption once the previous one was spoken or shown long enough to be read
async function caption(key) {
  const delay = captionEnd - recorder.time()
  if (delay > 0) await sleep(delay * 1000)
  const time = recorder.time()
  if (!key) {
    subtitles.end(time)
    await wait(400)
    return
  }
  const text = captionText(data.captions[key])
  subtitles.add(time, text)
  captionEnd = narration
    ? time + narration.add(key, time) + 0.6
    : time + (Math.max(2500, text.length * 55) * PACE) / 1000
  await wait(1200)
}

// Scenario

async function scenario() {
  const { anna, ben, clara, tim } = data.participants

  await caption('intro')

  await caption('title')
  await openDialog('__demo.header()')
  await fill(t('split.title'), data.title)
  await submit()

  await caption('participants')
  await focusSection(t('participant.plural'))
  for (const participant of [anna, ben, clara]) {
    await openDialog(`__demo.add(${str(t('participant.plural'))})`)
    await fill(t('participant.name'), participant.name)
    if (participant.preferences) await fill(t('participant.preferences'), participant.preferences)
    await submit()
  }

  await caption('patron')
  await openDialog(`__demo.add(${str(t('participant.plural'))})`)
  await fill(t('participant.name'), tim.name)
  await select(t('participant.patron'), clara.name)
  await submit()

  await caption('category')
  await focusSection(t('category.plural'))
  await openDialog(`__demo.add(${str(t('category.plural'))})`)
  await fill(t('category.name'), data.wine)
  for (const participant of [anna, ben, clara]) {
    await click(`__demo.checkbox(${str(participant.name)})`)
  }
  await caption('rate')
  await setRate(ben.name, 150)
  await submit()

  await caption('expenses')
  await focusSection(t('expense.plural'))
  const { rent, groceries, wine } = data.expenses
  await addExpense({ ...rent, payer: anna, dated: true })
  await addExpense({ ...groceries, payer: ben })
  await caption('categoryExpense')
  await addExpense({ ...wine, category: data.wine, payer: clara })

  await caption('settlements')
  await focusSection(t('settlement.plural'))
  await hover(`__demo.section(${str(t('settlement.plural'))})`)
  await wait(2500)

  await caption('transfer')
  await openDialog(
    `__demo.row(${str(t('settlement.plural'))}, ${str(clara.name)}, ${str(anna.name)})`
  )
  await click(`__demo.checkbox(${str(t('settlement.completed.checkbox'))})`)
  await fill(t('transfer.comment'), data.comment)
  await submit(t('confirm'))

  await caption('transfers')
  await focusSection(t('transfer.plural'))
  await hover(`__demo.section(${str(t('transfer.plural'))})`)
  await wait(2500)

  await caption('share')
  await click('__demo.menuButton()')
  await hover(`__demo.option(${str(t('menu.copyLink'))})`)
  await wait(2000)
  await press('Escape')

  await caption('outro')
  await caption(null)
  await wait(1000)
}

async function addExpense({ description, category, payer, amount, dated }) {
  await openDialog(`__demo.add(${str(t('expense.plural'))})`)
  if (dated) {
    await click(`__demo.field(${str(t('date'))})`)
    await click(`__demo.day(${new Date().getDate()})`)
    await waitFor('!__demo.menu()')
  }
  await fill(t('expense.description'), description)
  if (category) await select(t('category'), category)
  await select(t('expense.payer'), payer.name)
  await fill(t('amount'), amount)
  await submit()
}

// Main

if (options.phonemes) {
  printPhonemes()
  process.exit()
}

const outDir = resolve(ROOT, options.out)
const videoFile = join(outDir, `split-demo-${locale}.mp4`)
const subtitlesFile = join(outDir, `split-demo-${locale}.vtt`)
mkdirSync(outDir, { recursive: true })

const tempDir = mkdtempSync(join(tmpdir(), 'split-demo-'))
const buildDir = join(tempDir, 'build')
let server
let chrome

try {
  if (data.voice && !options.mute) {
    console.log('Synthesizing the voice...')
    narration = new Narration(data.voice)
  } else if (!options.mute) {
    console.warn(`No voice for the "${locale}" locale, the video is recorded without it`)
  }

  build(buildDir)
  server = await serve(buildDir)
  const appUrl = `http://127.0.0.1:${server.address().port}/`

  console.log('Launching Chrome...')
  const launched = await launchChrome(join(tempDir, 'profile'))
  chrome = launched.chrome
  cdp = await Connection.open(launched.pageUrl)

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: PAGE_HEIGHT,
    deviceScaleFactor: 1,
    mobile: false
  })
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }]
  })
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_SCRIPT })
  await cdp.send('Page.navigate', { url: appUrl })
  await waitFor('window.__demo?.ready()', 20000)
  await sleep(1000)

  console.log(`Recording the "${locale}" scenario...`)
  const rawFile = join(tempDir, 'raw.mp4')
  const barFile = join(tempDir, 'captions.ass')
  const voiceFile = narration && join(tempDir, 'voice.raw')
  recorder = new Recorder(cdp, rawFile)
  await recorder.start()
  try {
    await scenario()
  } finally {
    const duration = recorder.time()
    subtitles.end(duration)
    await recorder.stop()
    subtitles.save(subtitlesFile)
    subtitles.saveBar(barFile)
    narration?.save(voiceFile, duration)
  }
  compose({
    source: rawFile,
    subtitlesFile,
    barFile,
    voiceFile,
    voiceRate: narration?.rate,
    file: videoFile
  })

  // A modified split shows a red badge in the header until the backend confirms the changes
  await waitFor('__demo.synced()', 10000).catch(() => {
    console.warn('The split is not synchronized, check that the backend is running')
  })

  console.log(`Saved ${videoFile}\nSaved ${subtitlesFile}`)
} finally {
  cdp?.close()
  chrome?.kill()
  server?.close()
  rmSync(tempDir, { recursive: true, force: true })
}
