import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

const FONT_CSS = '@quasar/extras/roboto-font/roboto-font.css'

// Subsets preloaded for every visitor and the ones preloaded only for the
// listed locales (detected the same way as in main.js)
const SUBSETS_ALWAYS = ['latin']
const SUBSETS_BY_LOCALE = { cyrillic: ['ru'] }

const LOCALE_STORAGE_KEY = 'split:locale'

// Maps the subset names from the comments of the font CSS to the font file names
function readSubsetFiles() {
  const files = {}
  try {
    const css = fs.readFileSync(require.resolve(FONT_CSS), 'utf-8')
    for (const matched of css.matchAll(
      /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{[^}]*?url\(([^)]+)\)/g
    )) {
      files[matched[1]] = path.basename(matched[2].replace(/['"]/g, ''))
    }
  } catch (err) {
    console.error('Unable to read font CSS:', err.message)
  }
  return files
}

// The fonts are requested only after the app renders its text, which happens
// after the script is loaded and executed. Preloading starts the requests
// together with the script, so the text is shown in the right font at once
export default function fontPreloadPlugin() {
  return {
    name: 'vite-plugin-font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return

        const subsetFiles = readSubsetFiles()
        const urls = {}
        for (const [subset, file] of Object.entries(subsetFiles)) {
          const asset = Object.values(bundle).find(
            (chunk) => chunk.type === 'asset' && chunk.names?.includes(file)
          )
          if (asset) urls[subset] = `/${asset.fileName}`
        }

        const link = (href) =>
          `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`

        const tags = []
        for (const subset of SUBSETS_ALWAYS) {
          if (urls[subset]) tags.push(link(urls[subset]))
          else console.error(`Font subset to preload not found: ${subset}`)
        }

        const byLocale = Object.entries(SUBSETS_BY_LOCALE).filter(([subset]) => {
          if (urls[subset]) return true
          console.error(`Font subset to preload not found: ${subset}`)
        })
        if (byLocale.length > 0) {
          const preloads = Object.fromEntries(
            byLocale.map(([subset, locales]) => [urls[subset], locales])
          )
          tags.push(`<script>
      try {
        const locale = (
          JSON.parse(localStorage.getItem('${LOCALE_STORAGE_KEY}')) ||
          (navigator.languages ? navigator.languages[0] : navigator.language) ||
          ''
        ).trim().split(/-|_/)[0]
        Object.entries(${JSON.stringify(preloads)}).forEach(([href, locales]) => {
          if (!locales.includes(locale)) return
          const link = document.createElement('link')
          Object.assign(link, { rel: 'preload', as: 'font', type: 'font/woff2', href })
          link.crossOrigin = ''
          document.head.appendChild(link)
        })
      } catch (err) {
        console.warn('Unable to preload fonts:', err.message)
      }
    </script>`)
        }

        // Inserted before the app script and styles: an inline script placed
        // after a stylesheet waits for it to load
        const anchor = html.search(/<script type="module"|<link rel="stylesheet"/)
        if (anchor < 0) {
          console.error('Unable to find where to insert font preloads')
          return
        }
        return html.slice(0, anchor) + tags.join('\n    ') + '\n    ' + html.slice(anchor)
      }
    }
  }
}
