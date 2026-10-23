// Generates the YouTube upload guide with the metadata of the recorded demo videos into
// videos/youtube-upload.md. Chapters are taken from the actual subtitle timings, the names of
// the sections from the application locales. Run with `node scripts/demo/youtube.js`.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import content from './content.js'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SITE = 'https://split.mayfleet.com/'
const GITHUB = 'https://github.com/andrew-markin/split'

// Captions in the order the scenario shows them
const CAPTION_KEYS = Object.keys(content.en.captions)

const META = {
  en: {
    name: 'English',
    studioLanguage: 'English',
    title: 'Split: how to split shared expenses with friends (demo)',
    intro: 'Intro',
    sharing: 'Sharing the link',
    try: 'Try it',
    source: 'Source code',
    chapters: 'Chapters',
    body:
      'Split is a free open-source app for splitting shared expenses with friends, family or colleagues. ' +
      'This demo plans a weekend at the lake: participants with transfer preferences, a parent paying ' +
      'for their child, a wine category with a custom share, expenses, removing what is no longer ' +
      'needed, a loan between participants, settlements with as few transfers as possible and copying ' +
      'them to a group chat.\n\nNo sign-up is needed: just share the link. All the data is encrypted in ' +
      'the browser, so only those having the link can read it.',
    tags: 'split, expense splitting, shared expenses, split bills, group expenses, trip expenses, settle up, splitwise alternative, open source, free app'
  },
  ru: {
    name: 'Русский',
    studioLanguage: 'Russian',
    title: 'Split: как делить общие расходы с друзьями (демо)',
    intro: 'Вступление',
    sharing: 'Ссылка на сплит',
    try: 'Попробовать',
    source: 'Исходный код',
    chapters: 'Содержание',
    body:
      'Split — бесплатное приложение с открытым исходным кодом для разделения общих расходов с друзьями, ' +
      'семьёй или коллегами. В этом демо планируем выходные на озере: участники с предпочтениями по ' +
      'переводу, родитель, который платит за ребёнка, категория «Вино» с особой долей, расходы, ' +
      'удаление лишнего, заём между участниками, взаиморасчёты с минимальным числом переводов и их ' +
      'копирование в общий чат.\n\nРегистрация не нужна: достаточно поделиться ссылкой. Все данные ' +
      'шифруются в браузере, поэтому прочитать их могут только те, у кого есть ссылка.',
    tags: 'split, сплит, разделить расходы, общие расходы, совместные расходы, кто кому должен, расходы в поездке, взаиморасчёты, splitwise аналог, бесплатное приложение'
  },
  es: {
    name: 'Español',
    studioLanguage: 'Spanish (Spain)',
    title: 'Split: cómo repartir gastos comunes con amigos (demo)',
    intro: 'Introducción',
    sharing: 'Compartir el enlace',
    try: 'Pruébalo',
    source: 'Código fuente',
    chapters: 'Capítulos',
    body:
      'Split es una aplicación gratuita y de código abierto para repartir gastos comunes con amigos, ' +
      'familia o compañeros. En esta demo organizamos un fin de semana en el lago: participantes con ' +
      'preferencias de transferencia, una madre que paga por su hijo, una categoría de vino con una ' +
      'parte personalizada, gastos, cómo eliminar lo que sobra, un préstamo entre participantes, ' +
      'liquidaciones con el menor número de transferencias posible y cómo copiarlas al chat del grupo.' +
      '\n\nNo hace falta registrarse: basta con compartir el enlace. Todos los datos se cifran en el ' +
      'navegador, así que solo quien tenga el enlace puede leerlos.',
    tags: 'split, repartir gastos, gastos compartidos, dividir cuentas, gastos de grupo, gastos de viaje, alternativa a splitwise, código abierto, app gratis'
  },
  pt: {
    name: 'Português (Brasil)',
    studioLanguage: 'Portuguese (Brazil)',
    title: 'Split: como dividir despesas em grupo com amigos (demo)',
    intro: 'Introdução',
    sharing: 'Compartilhar o link',
    try: 'Experimente',
    source: 'Código-fonte',
    chapters: 'Capítulos',
    body:
      'O Split é um app gratuito e de código aberto para dividir despesas com amigos, família ou ' +
      'colegas. Nesta demo planejamos um fim de semana no lago: participantes com preferências de ' +
      'transferência, uma mãe que paga pelo filho, uma categoria de vinho com uma parte personalizada, ' +
      'despesas, como remover o que não é mais necessário, um empréstimo entre participantes, acertos ' +
      'com o menor número possível de transferências e como copiá-los para o chat do grupo.\n\nNão ' +
      'precisa de cadastro: basta compartilhar o link. Todos os dados são criptografados no navegador, ' +
      'então só quem tem o link pode lê-los.',
    tags: 'split, dividir despesas, despesas compartilhadas, dividir a conta, despesas em grupo, despesas de viagem, alternativa ao splitwise, código aberto, app grátis'
  },
  de: {
    name: 'Deutsch',
    studioLanguage: 'German',
    title: 'Split: gemeinsame Ausgaben mit Freunden aufteilen (Demo)',
    intro: 'Einleitung',
    sharing: 'Link teilen',
    try: 'Ausprobieren',
    source: 'Quellcode',
    chapters: 'Kapitel',
    body:
      'Split ist eine kostenlose Open-Source-App zum Aufteilen gemeinsamer Ausgaben mit Freunden, ' +
      'Familie oder Kollegen. In dieser Demo planen wir ein Wochenende am See: Teilnehmer mit ' +
      'Überweisungspräferenzen, eine Mutter, die für ihren Sohn zahlt, eine Wein-Kategorie mit eigenem ' +
      'Anteil, Ausgaben, das Entfernen von Überflüssigem, ein Darlehen unter Teilnehmern, Abrechnungen ' +
      'mit möglichst wenigen Überweisungen und deren Kopieren in den Gruppenchat.\n\nKeine Anmeldung ' +
      'nötig: einfach den Link teilen. Alle Daten werden im Browser verschlüsselt, daher kann sie nur ' +
      'lesen, wer den Link hat.',
    tags: 'split, Ausgaben teilen, gemeinsame Ausgaben, Kosten aufteilen, Gruppenausgaben, Reisekosten, Splitwise Alternative, Open Source, kostenlose App'
  },
  fr: {
    name: 'Français',
    studioLanguage: 'French',
    title: 'Split : partager les dépenses communes entre amis (démo)',
    intro: 'Introduction',
    sharing: 'Partager le lien',
    try: 'Essayer',
    source: 'Code source',
    chapters: 'Chapitres',
    body:
      'Split est une application gratuite et open source pour partager les dépenses communes entre ' +
      'amis, en famille ou entre collègues. Dans cette démo, nous organisons un week-end au lac : ' +
      'participants avec leurs préférences de virement, une mère qui paie pour son fils, une catégorie ' +
      'vin avec une part personnalisée, des dépenses, la suppression de ce qui ne sert plus, un prêt ' +
      'entre participants, des règlements avec le moins de virements possible et leur copie dans la ' +
      'discussion du groupe.\n\nSans inscription : il suffit de partager le lien. Toutes les données ' +
      'sont chiffrées dans le navigateur, seuls ceux qui ont le lien peuvent les lire.',
    tags: 'split, partager les dépenses, dépenses communes, partage de frais, dépenses de groupe, frais de voyage, alternative à splitwise, open source, application gratuite'
  }
}

// Captions starting the chapters along with their names
function chapterNames(locale) {
  const messages = JSON.parse(readFileSync(`${ROOT}/src/locales/${locale}.json`, 'utf8'))
  const meta = META[locale]
  return {
    greeting: meta.intro,
    participants: messages['participant.plural'],
    category: messages['category.plural'],
    expenses: messages['expense.plural'],
    loan: messages['transfer.plural'],
    settlements: messages['settlement.plural'],
    share: meta.sharing
  }
}

function parseCues(file) {
  const seconds = (stamp) => {
    const [h, m, s] = stamp.split(':')
    return Number(h) * 3600 + Number(m) * 60 + Number(s)
  }
  return [...readFileSync(file, 'utf8').matchAll(/(\S+) --> (\S+)/g)].map(([, start, end]) => ({
    start: seconds(start),
    end: seconds(end)
  }))
}

const stamp = (seconds) => {
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function chapters(locale) {
  const cues = parseCues(`${ROOT}/videos/split-demo-${locale}.vtt`)
  if (cues.length !== CAPTION_KEYS.length) throw new Error(`Unexpected cues of ${locale}`)
  const names = chapterNames(locale)
  const result = []
  CAPTION_KEYS.forEach((key, index) => {
    if (names[key]) result.push({ start: index === 0 ? 0 : cues[index].start, name: names[key] })
  })
  const end = cues.at(-1).end
  result.forEach((chapter, index) => {
    const next = result[index + 1]?.start ?? end
    // YouTube ignores the chapters when any of them is shorter than 10 seconds
    if (next - chapter.start < 10) throw new Error(`Short chapter "${chapter.name}" of ${locale}`)
  })
  return result.map(({ start, name }) => `${stamp(start)} ${name}`).join('\n')
}

const sections = []
for (const locale of ['en', 'ru', 'es', 'pt', 'de', 'fr']) {
  const meta = META[locale]
  const video = `videos/split-demo-${locale}.mp4`
  if (!existsSync(`${ROOT}/${video}`)) continue
  const description = [
    meta.body,
    `▶ ${meta.try}: ${SITE}\n⌨ ${meta.source}: ${GITHUB}`,
    `${meta.chapters}:\n${chapters(locale)}`
  ].join('\n\n')
  sections.push(`## ${meta.name} (\`${locale}\`)

**Файлы:** видео [split-demo-${locale}.mp4](split-demo-${locale}.mp4), субтитры [split-demo-${locale}.vtt](split-demo-${locale}.vtt)

**Title** (${meta.title.length} из 100 символов):

\`\`\`text
${meta.title}
\`\`\`

**Description:**

\`\`\`text
${description}
\`\`\`

**Tags:**

\`\`\`text
${meta.tags}
\`\`\`

**Video language** и язык субтитров: **${meta.studioLanguage}**
`)
}

writeFileSync(
  `${ROOT}/videos/youtube-upload.md`,
  `# Загрузка демо-роликов на YouTube

Порядок одинаковый для всех роликов, названия элементов даны по английскому интерфейсу YouTube Studio. Тексты для каждого языка ниже, каждый блок копируется целиком.

0. Новые ролики загружаются как отдельные видео: заменить файл у опубликованного ролика YouTube не позволяет. Старые ролики удалите или переведите в **Private**, когда новые ссылки появятся в приложении, иначе пункт меню будет вести на удалённое видео.
1. Откройте [YouTube Studio](https://studio.youtube.com/), нажмите **Create → Upload videos** и выберите файл ролика.
2. Вкладка **Details**:
   - **Title** и **Description** — из блоков ниже. Главы в конце описания YouTube превратит в разметку шкалы времени.
   - **Thumbnail** — можно оставить автоматический или загрузить свой.
   - **Playlists** — удобно создать один плейлист, например «Split — demo», и добавить в него все ролики.
   - **Audience** — **No, it's not made for kids**.
   - **Show more** (внизу):
     - **Tags** — из блока ниже;
     - **Language and captions certification** → **Video language** — язык ролика (указан в блоке), **Caption certification** не нужна;
     - **Category** — **Science & Technology**;
     - **License** — **Standard YouTube License**, флажок **Allow embedding** включён (пригодится для превью в README).
3. Вкладка **Video elements** → **Add subtitles** → **Add** → **Upload file** → **With timing** → **Continue** → файл \`.vtt\` этого языка → **Done**, затем **Next**. Язык субтитров берётся из **Video language**, поэтому его нужно указать на шаге 2. Встроенную в mp4 дорожку субтитров YouTube не использует, поэтому файл загружается отдельно.
4. Вкладка **Checks** — дождитесь окончания, **Next**.
5. Вкладка **Visibility** — **Public** (или **Unlisted**, если сначала хотите посмотреть) → **Publish**.
6. Пришлите ссылки на все ролики: по ним обновятся ссылки в приложении и превью в README, а точка у пункта «Демо на YouTube» снова загорится у всех.

${sections.join('\n')}`
)
console.log(`Written ${sections.length} sections`)
