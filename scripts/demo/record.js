// Records a walkthrough video of filling a split along with its subtitles, with no dependencies:
// builds the application, serves the build, drives Google Chrome via the DevTools protocol,
// encodes the screencast by ffmpeg and adds the captions as a subtitles track and file,
// optionally also as a bar below the page. The captions are voiced by Piper when the locale
// has a voice, and the clicks and key presses are heard too. Needs a running Blobs backend,
// Chrome, ffmpeg and Piper for the voice.
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
    // Voice model to try instead of the locale one, e.g. ru_RU-denis-medium, along with its speed
    // where values below 1 speed it up
    voice: { type: 'string' },
    'length-scale': { type: 'string', default: '1' },
    // Records the video without the sounds of the clicks and key presses
    'no-sounds': { type: 'boolean', default: false },
    // Prints the phonemes of the captions speech to check the pronunciation, records nothing
    phonemes: { type: 'boolean', default: false },
    // Saves an example of the typing and clicking sounds, records nothing
    'sounds-sample': { type: 'boolean', default: false },
    // Shows the browser window, for debugging of the scenario
    show: { type: 'boolean', default: false }
  }
})

// The page is laid out in CSS pixels of a 720p screen and rendered with the scale, so the video
// is Full HD while the application is as large in it as in a 720p one
const WIDTH = 1280
const HEIGHT = 720
const SCALE = 1.5
const FPS = 30
// The captions bar is added below the page, so it never covers the application
const BAR_HEIGHT = options.captions ? 96 : 0
const PAGE_HEIGHT = HEIGHT - BAR_HEIGHT
// Sizes of the video frames in device pixels
const VIDEO_WIDTH = WIDTH * SCALE
const VIDEO_HEIGHT = HEIGHT * SCALE
const VIDEO_PAGE_HEIGHT = PAGE_HEIGHT * SCALE
const BAR_COLOR = '5c6bc0'
const CAPTION_FONT = 'Noto Sans'
const PACE = Number(options.pace)
// Delay after every typed character in milliseconds, varied between the bounds like a person types
const TYPING_DELAY = [80, 140]

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

const readVoiceRate = ({ model }) =>
  JSON.parse(readFileSync(join(options.piper, 'voices', `${model}.onnx.json`), 'utf8')).audio
    .sample_rate

// Loudness normalization of the audio track, the limiter keeps its peaks below -1.5 dB
const AUDIO_FILTERS = 'loudnorm=I=-16:TP=-1.5,alimiter=limit=0.84:level=false'

// Speeches of the captions placed at the times they're shown
class Narration {
  #clips = []

  constructor(voice) {
    this.rate = readVoiceRate(voice)
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

  // Adds the speeches to the samples ranging from -1 to 1
  mix(samples) {
    for (const { time, speech } of this.#clips) {
      const start = Math.round(time * this.rate)
      const length = Math.min(speech.length / 2, samples.length - start)
      for (let i = 0; i < length; i++) samples[start + i] += speech.readInt16LE(i * 2) / 32768
    }
  }
}

// Recorded sounds of the key presses and mouse clicks, see the sources in sounds/README.md.
// Every event takes a random variant with a slightly varied volume, so the typing doesn't sound
// mechanical, the levels are the peaks of the sounds
const SOUNDS = {
  key: { variants: ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6'], level: 0.07 },
  press: { variants: ['mouse-press'], level: 0.15 },
  release: { variants: ['mouse-release'], level: 0.1 }
}

const SOUNDS_DIR = fileURLToPath(new URL('sounds', import.meta.url))

// Decodes the sound into samples of the rate with the peak of 1
function loadSound(name, rate) {
  const result = spawnSync(
    'ffmpeg',
    ['-loglevel', 'error', '-i', join(SOUNDS_DIR, `${name}.ogg`)]
      .concat(['-ac', '1', '-ar', rate, '-f', 'f32le', '-'])
      .map(String),
    { maxBuffer: 1 << 24 }
  )
  if (result.status !== 0) throw new Error(`Unable to load the "${name}" sound`)
  const { buffer, byteOffset, length } = result.stdout
  const samples = new Float32Array(buffer.slice(byteOffset, byteOffset + length))
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
  return samples.map((value) => value / peak)
}

class Sounds {
  #events = []
  #seed = 1
  #loaded = new Map()

  add(kind, time = recorder?.time()) {
    if (time !== undefined) this.#events.push({ kind, time })
  }

  // Seeded, so the same scenario sounds the same
  #random() {
    this.#seed = (this.#seed * 1103515245 + 12345) % 2147483648
    return this.#seed / 2147483648
  }

  #load(name, rate) {
    if (!this.#loaded.has(name)) this.#loaded.set(name, loadSound(name, rate))
    return this.#loaded.get(name)
  }

  // Adds the sounds to the samples ranging from -1 to 1
  mix(samples, rate) {
    for (const { kind, time } of this.#events) {
      const { variants, level } = SOUNDS[kind]
      const sound = this.#load(variants[Math.floor(this.#random() * variants.length)], rate)
      const gain = level * (0.85 + 0.3 * this.#random())
      const start = Math.round(time * rate)
      const length = Math.min(sound.length, samples.length - start)
      for (let i = 0; i < length; i++) samples[start + i] += sound[i] * gain
    }
  }
}

// Saves an example of a caption spoken by the locale voice followed by typing and clicking,
// mixed and normalized as in the video, to tune the sounds without recording one
function saveSoundsSample(file) {
  const sample = new Sounds()
  const speech = data.voice && synthesize(captionSpeech(data.captions.greeting), data.voice)
  const rate = data.voice ? readVoiceRate(data.voice) : SOUNDS_RATE
  let time = 0.3 + (speech ? speech.length / 2 / rate + 0.5 : 0)
  for (const word of ['Weekend', 'at', 'the', 'lake', 'trip']) {
    for (let i = 0; i < word.length + 1; i++) {
      sample.add('key', time)
      time += (TYPING_DELAY[0] + Math.random() * (TYPING_DELAY[1] - TYPING_DELAY[0])) / 1000
    }
  }
  for (let i = 0; i < 3; i++) {
    time += 0.8
    sample.add('press', time)
    sample.add('release', time + 0.08)
  }
  const samples = new Float32Array(Math.ceil((time + 1) * rate))
  if (speech) {
    const start = Math.round(0.3 * rate)
    for (let i = 0; i < speech.length / 2; i++)
      samples[start + i] = speech.readInt16LE(i * 2) / 32768
  }
  sample.mix(samples, rate)
  const pcm = Buffer.from(Int16Array.from(samples, (value) => Math.round(value * 32767)).buffer)
  const result = spawnSync(
    'ffmpeg',
    [
      ['-loglevel', 'error', '-y', '-f', 's16le', '-ar', rate, '-ac', '1', '-i', '-'],
      ['-af', AUDIO_FILTERS, file]
    ]
      .flat()
      .map(String),
    { input: pcm }
  )
  if (result.status !== 0) throw new Error('Unable to save the sounds sample')
  console.log(`Saved ${file}`)
}

// Sample rate of the audio track when there's no voice to take it from
const SOUNDS_RATE = 22050

// Saves the voice and the sounds as raw 16-bit mono samples, returns their rate
function saveAudio(file, duration) {
  const rate = narration?.rate || SOUNDS_RATE
  const samples = new Float32Array(Math.ceil(duration * rate))
  narration?.mix(samples)
  if (!options['no-sounds']) sounds.mix(samples, rate)
  const pcm = Buffer.alloc(samples.length * 2)
  samples.forEach((value, index) => {
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), index * 2)
  })
  writeFileSync(file, pcm)
  return rate
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
        ['-vf', `scale=${VIDEO_WIDTH}:${VIDEO_PAGE_HEIGHT},format=yuv420p`],
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
      maxWidth: VIDEO_WIDTH,
      maxHeight: VIDEO_PAGE_HEIGHT
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

// Encodes the final video with the subtitles track, the optional captions bar and audio
function compose({ source, subtitlesFile, barFile, audioFile, audioRate, file }) {
  console.log('Encoding the video...')
  const filters = [`pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:0:0:color=0x${BAR_COLOR}`]
  if (BAR_HEIGHT) filters.push(`ass=${barFile}`)
  const audioInput = audioFile ? ['-f', 's16le', '-ar', audioRate, '-ac', '1', '-i', audioFile] : []
  const audioOutput = audioFile
    ? ['-map', '2:a', '-af', AUDIO_FILTERS, '-c:a', 'aac', '-b:a', '160k']
    : []
  const result = spawnSync(
    'ffmpeg',
    [
      ['-y', '-loglevel', 'error', '-i', source, '-i', subtitlesFile, ...audioInput],
      ['-map', '0:v', '-map', '1:s', ...audioOutput, '-vf', filters.join(',')],
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

  // Captions for the bar in the ASS format rendered by ffmpeg, it scales them to the video
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

// Script evaluated in the page before the application: sets the locale, adds a visible mouse
// cursor, the title card shown at the start and the end, and the chat message showing the copied
// text, along with the helpers locating the application elements by their texts

const PAGE_SCRIPT = `(() => {
  try {
    localStorage.setItem('split:locale', ${JSON.stringify(JSON.stringify(locale))})
  } catch {}

  const style = document.createElement('style')
  style.textContent = \`
    #demo-cursor {
      position: fixed; left: 0; top: 0; z-index: 2147483646; pointer-events: none;
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
    /* The pulsing badges hinting at the menu items only distract in the video */
    .hint-badge { display: none !important; }
    #demo-card {
      position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #5c6bc0; color: #fff; font-family: Roboto, sans-serif; text-align: center;
      opacity: 0; transition: opacity 0.8s ease;
    }
    #demo-card::before {
      content: ''; position: absolute; inset: 0; background: rgba(255, 255, 255, 0.07);
      mask: url('/pattern.svg') 0 0 / 480px 480px repeat;
    }
    #demo-card.shown { opacity: 1; }
    #demo-card.instant { transition: none; }
    #demo-card > * { position: relative; }
    #demo-card.shown > * { animation: demo-rise 0.9s ease both; }
    #demo-card.shown > :nth-child(2) { animation-delay: 0.15s; }
    #demo-card.shown > :nth-child(3) { animation-delay: 0.3s; }
    #demo-card.shown > :nth-child(4) { animation-delay: 0.45s; }
    #demo-card img { width: 112px; height: 112px; margin-bottom: 20px; }
    #demo-card .title { font-size: 72px; font-weight: 700; line-height: 1.1; }
    #demo-card .subtitle { font-size: 30px; margin-top: 12px; }
    #demo-card .link { font-size: 22px; margin-top: 40px; opacity: 0.8; }
    @keyframes demo-rise {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: none; }
    }
    #demo-chat {
      position: fixed; right: 40px; bottom: 12px; z-index: 2147483645; pointer-events: none;
      width: max-content; min-width: 400px; max-width: calc(100vw - 80px);
      border-radius: 16px; overflow: hidden; font-family: Roboto, sans-serif;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3); opacity: 0; transform: translateY(24px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    #demo-chat.shown { opacity: 1; transform: none; }
    #demo-chat .head {
      padding: 12px 18px; background: #5c6bc0; color: #fff; font-size: 16px; font-weight: 500;
    }
    #demo-chat .body { padding: 18px; background: #eceff8; }
    #demo-chat .message {
      margin-left: 40px; padding: 10px 14px; border-radius: 14px 14px 4px 14px;
      background: #fff; color: #212121; font-size: 15px; line-height: 1.5;
      white-space: pre; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    }
  \`

  const cursor = document.createElement('div')
  cursor.id = 'demo-cursor'
  cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26">' +
    '<path d="M3 2 L3 21 L8 16.5 L11.5 24 L15 22.5 L11.5 15 L18 15 Z" ' +
    'fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'

  const card = document.createElement('div')
  card.id = 'demo-card'
  card.innerHTML = '<img src="/favicon.svg" alt=""><div class="title">Split</div>' +
    '<div class="subtitle"></div><div class="link">split.mayfleet.com</div>'

  const chat = document.createElement('div')
  chat.id = 'demo-chat'
  chat.innerHTML = '<div class="head"></div><div class="body"><div class="message"></div></div>'
  chat.querySelector('.head').textContent = ${JSON.stringify(data.title)}

  document.addEventListener('DOMContentLoaded', () => {
    // A fresh profile may check the spelling with a dictionary of another language
    document.documentElement.spellcheck = false
    document.head.append(style)
    document.body.append(cursor, card, chat)
  })

  // The application copies the text by the clipboard API or by the copy command
  // as a fallback, so both are watched to show the copied text in the chat
  let copied = ''
  const writeText = navigator.clipboard?.writeText?.bind(navigator.clipboard)
  if (writeText) {
    navigator.clipboard.writeText = (value) => {
      copied = value
      return writeText(value)
    }
  }
  window.addEventListener('copy', () => {
    copied = document.getSelection()?.toString() || copied
  }, true)

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
    // Shows the title card with the subtitle or hides it when there's none
    card(subtitle, instant) {
      card.classList.toggle('instant', !!instant)
      if (subtitle) card.querySelector('.subtitle').textContent = subtitle
      card.classList.toggle('shown', !!subtitle)
    },
    copied: () => copied,
    // Shows the copied text in the chat, one line per settlement, and tells whether it fits
    chat(shown) {
      const message = chat.querySelector('.message')
      message.textContent = copied
      chat.classList.toggle('shown', shown)
      return message.scrollWidth <= message.clientWidth
    },
    ready: () => !!document.querySelector('.app.ready section'),
    synced: () => !document.querySelector('.header .q-badge.bg-negative'),
    dialog: () => all('.backdrop').filter((el) => !leaving(el)).pop()?.querySelector('.q-card'),
    menu: () => all('.q-menu').length > 0,
    header: () => document.querySelector('.header .cursor-pointer'),
    menuButton: () => document.querySelector('.btn-menu'),
    section: (title) => all('section').find((el) => text(el.querySelector('.text-h6')) === title),
    // The first button next to the section title, e.g. adding a new item
    headerButton: (title) => __demo.section(title)?.querySelector('.q-btn'),
    remove: (title) => __demo.section(title)?.querySelector('.q-btn.text-negative'),
    // Checkbox of the section row having a cell with the value
    select: (title, value) =>
      all('tbody tr', __demo.section(title))
        .find((row) => [...row.children].some((cell) => text(cell) === value))
        ?.querySelector('.q-checkbox'),
    field: (label) =>
      all('.q-field', __demo.dialog()).find((el) => text(el.querySelector('.q-field__label')) === label),
    button: (label) => all('.q-btn', __demo.dialog()).find((el) => text(el) === label),
    checkbox: (label) =>
      all('.q-checkbox', __demo.dialog()).find(
        (el) => text(el) === label || text(el).startsWith(label + ' (')
      ),
    thumb: (label) => __demo.checkbox(label)?.parentElement.querySelector('.q-slider__thumb'),
    // Point of the participation slider track matching the rate
    ratePoint(label, rate) {
      const slider = __demo.checkbox(label)?.parentElement.querySelector('[role=slider]')
      const track = slider?.querySelector('.q-slider__track')?.getBoundingClientRect()
      if (!track) return null
      const { ariaValueMin: min, ariaValueMax: max } = slider
      return {
        x: track.left + (track.width * (rate - min)) / (max - min),
        y: track.top + track.height / 2
      }
    },
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
let narration
const subtitles = new Subtitles()
const sounds = new Sounds()
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

// Moves the mouse smoothly, holding its button down when dragging
async function move(x, y, { dragging = false, slowdown = 1 } = {}) {
  const distance = Math.hypot(x - mouse.x, y - mouse.y)
  const duration = Math.min(Math.max(distance * 1.1, 250), 900) * PACE * slowdown
  const steps = Math.max(Math.round(duration / 16), 1)
  const from = { ...mouse }
  for (let step = 1; step <= steps; step++) {
    const progress = step / steps
    const eased = progress < 0.5 ? 2 * progress ** 2 : 1 - (-2 * progress + 2) ** 2 / 2
    mouse.x = from.x + (x - from.x) * eased
    mouse.y = from.y + (y - from.y) * eased
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: mouse.x,
      y: mouse.y,
      ...(dragging && { button: 'left', buttons: 1 })
    })
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
  sounds.add('press')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...event })
  await sleep(80)
  sounds.add('release')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...event })
  await wait(350)
}

async function type(value) {
  for (const char of value) {
    sounds.add('key')
    await cdp.send('Input.insertText', { text: char })
    await wait(TYPING_DELAY[0] + Math.random() * (TYPING_DELAY[1] - TYPING_DELAY[0]))
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
    sounds.add('key')
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

// Drags the participation slider to the rate, the keyboard corrects it in case of rounding
async function setRate(label, rate) {
  await hover(`__demo.thumb(${str(label)})`)
  await wait(200)
  const event = { button: 'left', clickCount: 1 }
  sounds.add('press')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...mouse, ...event })
  await wait(150)
  const point = await evaluate(`__demo.ratePoint(${str(label)}, ${rate})`)
  await move(point.x, mouse.y, { dragging: true, slowdown: 2.5 })
  await wait(250)
  sounds.add('release')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...mouse, ...event })
  for (let attempt = 0; ; attempt++) {
    const current = await evaluate(`__demo.rate(${str(label)})`)
    if (current === rate) break
    if (Number.isNaN(current) || attempt > 50) throw new Error(`Unable to set ${label} rate`)
    if (attempt === 0) console.warn(`The slider is dragged to ${current} instead of ${rate}`)
    await press(current < rate ? 'ArrowRight' : 'ArrowLeft')
  }
  await wait(600)
}

async function submit(label = t('save')) {
  await click(`__demo.button(${str(label)})`)
  await waitFor('!__demo.dialog()')
  await wait(500)
}

// Selects the section row having a cell with the value and removes it after the confirmation
async function removeItem(title, value) {
  await click(`__demo.select(${str(title)}, ${str(value)})`)
  await openDialog(`__demo.remove(${str(title)})`)
  await submit(t('confirm'))
}

async function addExpense({ description, category, payer, amount, dated }) {
  await openDialog(`__demo.headerButton(${str(t('expense.plural'))})`)
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

let captionEnd = 0

// Waits until the current caption is spoken or shown long enough to be read
async function captionShown() {
  const delay = captionEnd - recorder.time()
  if (delay > 0) await sleep(delay * 1000)
}

// Shows the caption once the previous one is done, or ends the last one
async function caption(key) {
  await captionShown()
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

// Shows the title card with the subtitle, hides it when there's none
async function card(subtitle) {
  await evaluate(`__demo.card(${str(subtitle || '')})`)
  await wait(900)
}

// Scenario

async function scenario() {
  const { anna, ben, clara, tim, oscar } = data.participants
  const { rent, groceries, wine, taxi } = data.expenses

  // The recording starts with the title card shown
  await caption('greeting')
  await caption('about')
  await caption('demo')
  await captionShown()
  await card(null)

  await caption('title')
  await openDialog('__demo.header()')
  await fill(t('split.title'), data.title)
  await submit()

  await caption('participants')
  await focusSection(t('participant.plural'))
  for (const participant of [anna, ben, clara, oscar]) {
    await openDialog(`__demo.headerButton(${str(t('participant.plural'))})`)
    await fill(t('participant.name'), participant.name)
    if (participant.preferences) await fill(t('participant.preferences'), participant.preferences)
    await submit()
  }

  await caption('patron')
  await openDialog(`__demo.headerButton(${str(t('participant.plural'))})`)
  await fill(t('participant.name'), tim.name)
  await select(t('participant.patron'), clara.name)
  await submit()

  await caption('removal')
  await removeItem(t('participant.plural'), oscar.name)

  await caption('category')
  await focusSection(t('category.plural'))
  await openDialog(`__demo.headerButton(${str(t('category.plural'))})`)
  await fill(t('category.name'), data.wine)
  for (const participant of [anna, ben, clara]) {
    await click(`__demo.checkbox(${str(participant.name)})`)
  }
  await caption('rate')
  await setRate(ben.name, 150)
  await submit()

  await caption('expenses')
  await focusSection(t('expense.plural'))
  await addExpense({ ...rent, payer: anna, dated: true })
  await addExpense({ ...groceries, payer: ben })
  await caption('categoryExpense')
  await addExpense({ ...wine, category: data.wine, payer: clara })

  await caption('taxi')
  await addExpense({ ...taxi, payer: ben })
  await caption('expenseRemoval')
  await removeItem(t('expense.plural'), taxi.description)

  await caption('loan')
  await focusSection(t('transfer.plural'))
  await openDialog(`__demo.headerButton(${str(t('transfer.plural'))})`)
  await select(t('sender'), ben.name)
  await select(t('receiver'), anna.name)
  await fill(t('transfer.comment'), data.loan.comment)
  await fill(t('amount'), data.loan.amount)
  await submit()

  await caption('settlements')
  await focusSection(t('settlement.plural'))
  await hover(`__demo.section(${str(t('settlement.plural'))})`)
  await wait(2500)

  await caption('copy')
  await click(`__demo.headerButton(${str(t('settlement.plural'))})`)
  await waitFor('__demo.copied()')
  if (!(await evaluate('__demo.chat(true)'))) console.warn('The copied text exceeds the chat width')
  await wait(1000)
  await captionShown()
  await wait(1500)
  await evaluate('__demo.chat(false)')
  await wait(600)

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
  await captionShown()

  await card(data.card.tagline)
  await caption('outro')
  await captionShown()
  await evaluate(`__demo.card(${str(data.card.thanks)})`)
  await caption('goodbye')
  await caption(null)
  await wait(1500)
}

// Main

if (options.phonemes) {
  printPhonemes()
  process.exit()
}

if (options['sounds-sample']) {
  mkdirSync(resolve(ROOT, options.out), { recursive: true })
  saveSoundsSample(join(resolve(ROOT, options.out), 'sounds-sample.mp3'))
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
    const voice = options.voice
      ? { model: options.voice, lengthScale: Number(options['length-scale']) }
      : data.voice
    narration = new Narration(voice)
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
    deviceScaleFactor: SCALE,
    mobile: false
  })
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }]
  })
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_SCRIPT })
  await cdp.send('Page.navigate', { url: appUrl })
  await waitFor('window.__demo?.ready()', 20000)
  await evaluate(`__demo.card(${str(data.card.tagline)}, true)`)
  await sleep(1000)

  console.log(`Recording the "${locale}" scenario...`)
  const rawFile = join(tempDir, 'raw.mp4')
  const barFile = join(tempDir, 'captions.ass')
  const audioFile = (narration || !options['no-sounds']) && join(tempDir, 'audio.raw')
  let audioRate
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
    if (audioFile) audioRate = saveAudio(audioFile, duration)
  }
  compose({
    source: rawFile,
    subtitlesFile,
    barFile,
    audioFile,
    audioRate,
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
