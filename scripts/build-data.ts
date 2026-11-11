/**
 * Builds src/data/apologetics.json from:
 *   1. upload/Master List BV &c..md   (apologetics topics, citations, commentaries)
 *   2. douay-rheims/bible/raw/*.json  (Original Douay-Rheims 1582/1610 verse text)
 *   3. douay-rheims/annotations/*      (Original Douay-Rheims chapter annotations)
 *
 * Run: bun scripts/build-data.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const MASTER = join(ROOT, 'upload', 'Master List BV &c..md')
const DR_DIR = join(ROOT, 'douay-rheims')
const OUT = join(ROOT, 'src', 'data', 'apologetics.json')
// Static-site copy: the browser fetches this file at runtime (no server, no database).
const OUT_PUBLIC = join(ROOT, 'public', 'data', 'apologetics.json')

// ---------------------------------------------------------------------------
// Book abbreviation map (master list abbreviation -> Douay-Rheims file name).
// The Douay-Rheims keeps the older book names:
//   1/2 Samuel = 1/2 Kings, 1/2 Kings = 3/4 Kings, Chronicles = Paralipomenon.
// ---------------------------------------------------------------------------
const BOOKS: Record<string, string> = {
  // New Testament
  mt: 'matthew', matt: 'matthew', matthew: 'matthew', mk: 'mark', mark: 'mark',
  lk: 'luke', luke: 'luke', jn: 'john', john: 'john',
  acts: 'acts', rom: 'romans', romans: 'romans',
  '1 cor': '1-corinthians', '2 cor': '2-corinthians',
  gal: 'galatians', eph: 'ephesians', phil: 'philippians', col: 'colossians',
  '1 thess': '1-thessalonians', '2 thess': '2-thessalonians', '2 th': '2-thessalonians',
  '1 tim': '1-timothy', '2 tim': '2-timothy', tit: 'titus', titus: 'titus',
  philem: 'philemon', heb: 'hebrews', hb: 'hebrews', hebrews: 'hebrews',
  jam: 'james', jms: 'james', james: 'james',
  '1 pet': '1-peter', '2 pet': '2-peter',
  '1 jn': '1-john', '2 jn': '2-john', '3 jn': '3-john', jude: 'jude',
  rev: 'apocalypse', rv: 'apocalypse',
  // Old Testament
  gn: 'genesis', gen: 'genesis', genesis: 'genesis',
  ex: 'exodus', exod: 'exodus',
  lv: 'leviticus', lev: 'leviticus', leviticus: 'leviticus',
  num: 'numbers', nb: 'numbers', dt: 'deuteronomy', deut: 'deuteronomy',
  jos: 'josue', josue: 'josue', judg: 'judges', judges: 'judges', ruth: 'ruth',
  '1 sm': '1-kings', '2 sm': '2-kings', '1 sam': '1-kings', '2 sam': '2-kings',
  '1 kgs': '3-kings', '2 kgs': '4-kings', '1 kings': '3-kings', '2 kings': '4-kings',
  '1 chr': '1-paralipomenon', '2 chr': '2-paralipomenon',
  '1 par': '1-paralipomenon', '2 par': '2-paralipomenon',
  ezra: '1-esdras', neh: '2-esdras',
  tob: 'tobias', jdt: 'judith', est: 'esther', job: 'job',
  ps: 'psalms', psalm: 'psalms', psalms: 'psalms',
  prv: 'proverbs', prov: 'proverbs', proverbs: 'proverbs',
  eccl: 'ecclesiastes', eccles: 'ecclesiastes', ecclesiastes: 'ecclesiastes',
  cant: 'canticle-of-canticles', song: 'canticle-of-canticles',
  wis: 'wisdom', sir: 'ecclesiasticus', ecclus: 'ecclesiasticus',
  is: 'isaie', isa: 'isaie', isaiah: 'isaie',
  jer: 'jeremie', jr: 'jeremie', jeremiah: 'jeremie',
  lam: 'lamentations', bar: 'baruch',
  ezk: 'ezechiel', ezek: 'ezechiel', ez: 'ezechiel',
  dan: 'daniel', dn: 'daniel',
  hos: 'osee', hosea: 'osee', osee: 'osee',
  joel: 'joel', amos: 'amos',
  obad: 'abdias', abd: 'abdias',
  jon: 'jonas', jonah: 'jonas',
  mic: 'micheas', micah: 'micheas',
  nah: 'nahum', hab: 'habacuc', zeph: 'sophonias',
  hag: 'aggeus', zech: 'zacharias',
  mal: 'malachie', malachi: 'malachie',
  '1 macc': '1-machabees', '2 macc': '2-machabees',
  '1 mac': '1-machabees', '2 mac': '2-machabees',
}

const DR_NAME_NOTE =
  'The Douay-Rheims keeps the older book names: 1 and 2 Samuel are 1 and 2 Kings, 1 and 2 Kings are 3 and 4 Kings, 1 and 2 Chronicles are 1 and 2 Paralipomenon. Psalm numbers follow the Latin Psalter.'

// Psalm numbering: the master list uses Hebrew numbering, the Douay-Rheims
// uses the Latin Psalter. Hebrew 11-146 corresponds to Latin 10-145.
function latinPsalm(hebrew: number): number {
  if (hebrew >= 11 && hebrew <= 146) return hebrew - 1
  return hebrew
}

const bookCache: Record<string, any> = {}
function loadBook(file: string): any {
  if (!bookCache[file]) {
    const p = join(DR_DIR, 'bible', 'raw', `${file}.json`)
    if (!existsSync(p)) throw new Error(`Missing book file: ${p}`)
    bookCache[file] = JSON.parse(readFileSync(p, 'utf8'))
  }
  return bookCache[file]
}

function shortTitle(file: string): string {
  const b = loadBook(file)
  const t: string = b.short_title ?? b.book_title ?? file
  return t.replace(/\.\s*$/, '')
}

// ---------------------------------------------------------------------------
// Reference parsing
// ---------------------------------------------------------------------------
const FF_WINDOW = 8 // verses included after a "ff." reference
const WHOLE_CHAPTER = 9999
const TO_CHAPTER_END = 9998

interface RawRef {
  book: string // Douay-Rheims file name
  chapter: number
  verseStart: number
  verseEnd: number
  ff: boolean
}

interface ScanHit {
  ref: RawRef
  start: number
  end: number
}

const SEP_CHARS = new Set([' ', ',', ';', '(', ')', '.', '\\', '-', '\u2013', '\u00a0', '*'])

function isSepOnly(text: string): boolean {
  for (const c of text) if (!SEP_CHARS.has(c)) return false
  return true
}

function matchBookAt(text: string, pos: number): { abbrev: string; file: string; end: number } | null {
  const rest = text.slice(pos)
  const m = rest.match(/^([123])\s+([A-Za-z]+)\.?/)
  if (m) {
    const key = `${m[1]} ${m[2].toLowerCase()}`
    if (BOOKS[key] !== undefined) return { abbrev: `${m[1]} ${m[2]}`, file: BOOKS[key], end: pos + m[0].length }
  }
  const m2 = rest.match(/^([A-Za-z]+)\b\.?/)
  if (m2) {
    const w = m2[1].toLowerCase()
    if (BOOKS[w] !== undefined) return { abbrev: m2[1], file: BOOKS[w], end: pos + m2[0].length }
  }
  return null
}

/**
 * Parses one book reference with all its units, starting at `i` where a book
 * was already matched. Returns the hits for this reference and the position
 * where parsing stopped (end of the last unit, excluding trailing separators).
 */
function parseOneRef(text: string, i: number, bm: { abbrev: string; file: string; end: number }): { hits: ScanHit[]; end: number } {
  const hits: ScanHit[] = []
  let j = bm.end
  const n = text.length
  while (j < n && (text[j] === ' ' || text[j] === '\u00a0')) j++
  const numMatch = text.slice(j).match(/^(\d+)/)
  if (!numMatch) return { hits, end: bm.end }

  let chapter = parseInt(numMatch[1], 10)
  j += numMatch[0].length
  let firstUnit = true
  let lastEnd = j

  for (let guard = 0; guard < 60; guard++) {
    let k = j
    let verseStart = 0
    let verseEnd = 0
    let ff = false
    let pushed = false

    if (text[k] === ':') {
      const vm = text.slice(k + 1).match(/^(\d+)/)
      if (!vm) break
      verseStart = parseInt(vm[1], 10)
      k += 1 + vm[0].length
      const rm = text.slice(k).match(/^\s*[-\u2013]\s*(\d+)(?::(\d+))?/)
      if (rm) {
        const endC = parseInt(rm[1], 10)
        const endV = rm[2] ? parseInt(rm[2], 10) : null
        k += rm[0].length
        const ffm = text.slice(k).match(/^\s*(ff\.?)/i)
        if (ffm) {
          k += ffm[0].length
          ff = true
        }
        if (endV !== null && endC !== chapter) {
          // chapter-crossing range, e.g. 1 Cor 2:14-3:4 or Rev 11:19-12:1
          hits.push({ ref: { book: bm.file, chapter, verseStart, verseEnd: TO_CHAPTER_END, ff: false }, start: i, end: k })
          hits.push({ ref: { book: bm.file, chapter: endC, verseStart: 1, verseEnd: endV, ff: false }, start: i, end: k })
          pushed = true
        } else {
          verseEnd = endC
        }
      } else {
        const ffm = text.slice(k).match(/^\s*(ff\.?)/i)
        if (ffm) {
          ff = true
          k += ffm[0].length
        }
      }
      if (!pushed) {
        hits.push({ ref: { book: bm.file, chapter, verseStart, verseEnd, ff }, start: i, end: k })
      }
      lastEnd = k
    } else if (firstUnit) {
      // chapter only, no colon: whole-chapter reference, e.g. "Gn 19"
      hits.push({ ref: { book: bm.file, chapter, verseStart: 1, verseEnd: WHOLE_CHAPTER, ff: false }, start: i, end: k })
      lastEnd = k
    } else {
      // bare number: verse of the current chapter
      const vm2 = text.slice(k).match(/^(\d+)/)
      if (!vm2) break
      const v = parseInt(vm2[1], 10)
      k += vm2[0].length
      const ffm = text.slice(k).match(/^\s*(ff\.?)/i)
      if (ffm) {
        k += ffm[0].length
      }
      hits.push({ ref: { book: bm.file, chapter, verseStart: v, verseEnd: v, ff: !!ffm }, start: i, end: k })
      lastEnd = k
    }

    firstUnit = false
    j = k

    // consume separators; stop the ref if a new book reference or no digit follows
    let consumed = true
    while (j < n && SEP_CHARS.has(text[j])) {
      if (text[j] === '\\' && text[j + 1] === '-') {
        j += 2
        continue
      }
      j++
    }
    if (j >= n || !/^\d/.test(text.slice(j))) consumed = false
    if (matchBookAt(text, j)) consumed = false
    if (!consumed) break
    // a digit follows: "N:" starts a new chapter:verse unit, a bare number a verse
    const dm = text.slice(j).match(/^(\d+):/)
    if (dm) {
      chapter = parseInt(dm[1], 10)
      j += dm[0].length - 1 // move onto the ':' so the next unit parses it
    }
  }

  return { hits, end: lastEnd }
}

function scanRefs(text: string): ScanHit[] {
  const hits: ScanHit[] = []
  let i = 0
  const n = text.length
  while (i < n) {
    const bm = matchBookAt(text, i)
    if (!bm) {
      i++
      continue
    }
    const { hits: refHits, end } = parseOneRef(text, i, bm)
    if (refHits.length === 0) {
      i = bm.end
      continue
    }
    hits.push(...refHits)
    i = end > i ? end : i + 1
  }
  return hits
}

// ---------------------------------------------------------------------------
// Douay-Rheims passage resolution
// ---------------------------------------------------------------------------
interface PassageVerse {
  n: number
  text: string
}
interface DrNote {
  verse: number
  label: string
  text: string
}
interface DrAnnotation {
  verse: number
  title: string
  text: string
  notes: { marker: string; text: string }[]
}
interface Passage {
  ref: string
  book: string
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number
  verses: PassageVerse[]
  notes: DrNote[]
  annotations: DrAnnotation[]
  note?: string
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

function resolvePassage(raw: RawRef): Passage | null {
  if (!raw.book) return null
  const book = loadBook(raw.book)
  let chapter = raw.chapter
  let verseStart = raw.verseStart
  let verseEnd = raw.verseEnd
  let note: string | undefined

  if (raw.book === 'psalms') {
    const latin = latinPsalm(chapter)
    if (latin !== chapter) {
      note = `Psalm ${chapter} in the Hebrew numbering is Psalm ${latin} in the Douay-Rheims Latin Psalter.`
      chapter = latin
    }
  }

  let chObj = (book.chapters as any[]).find((c) => c.chapter === chapter)
  if (!chObj) {
    // single-chapter books (Philemon, Jude, 2-3 John) are cited by verse:
    // "Philem 10" means verse 10, not chapter 10.
    const only = book.chapters.length === 1 ? book.chapters[0] : null
    if (only && raw.verseEnd === WHOLE_CHAPTER && chapter >= 1 && chapter <= (only.verses as any[]).length) {
      verseStart = chapter
      verseEnd = chapter
      chapter = 1
      chObj = only
    }
  }
  if (!chObj) {
    console.warn(`  ! chapter not found: ${raw.book} ${raw.chapter}`)
    return null
  }
  const allVerses: any[] = chObj.verses
  const lastVerse = allVerses.length

  if (raw.ff) {
    verseStart = verseStart || 1
    verseEnd = Math.min(verseStart + FF_WINDOW, lastVerse)
  } else if (verseEnd === WHOLE_CHAPTER || verseEnd === TO_CHAPTER_END) {
    verseStart = verseStart || 1
    verseEnd = lastVerse
  } else {
    if (!verseEnd || verseEnd < verseStart) verseEnd = verseStart
    verseEnd = Math.min(verseEnd, lastVerse)
  }

  const picked = allVerses.filter((v) => v.verse >= verseStart && v.verse <= verseEnd)
  if (picked.length === 0) {
    console.warn(`  ! no verses: ${raw.book} ${chapter}:${verseStart}-${verseEnd}`)
    return null
  }

  const verses: PassageVerse[] = picked.map((v) => ({ n: v.verse, text: decodeEntities(String(v.text)) }))
  const notes: DrNote[] = []
  for (const v of picked) {
    if (Array.isArray(v.notes)) {
      for (const nt of v.notes) {
        notes.push({ verse: v.verse, label: String(nt.label ?? ''), text: stripTags(String(nt.text ?? '')) })
      }
    }
  }

  const annotations: DrAnnotation[] = []
  const annotPath = join(DR_DIR, 'annotations', raw.book, `${String(chapter).padStart(3, '0')}.json`)
  if (existsSync(annotPath)) {
    try {
      const aj = JSON.parse(readFileSync(annotPath, 'utf8'))
      for (const a of aj.annotations ?? []) {
        const av = typeof a.verse === 'string' ? parseInt(a.verse, 10) : a.verse
        if (av >= verseStart && av <= verseEnd) {
          annotations.push({
            verse: av,
            title: stripTags(String(a.title ?? '')),
            text: stripTags(String(a.text ?? '')),
            notes: (a.notes ?? []).map((nn: any) => ({
              marker: String(nn.marker ?? ''),
              text: stripTags(String(nn.text ?? '')),
            })),
          })
        }
      }
    } catch {
      /* annotations are optional */
    }
  }

  const bookName = shortTitle(raw.book)
  let ref: string
  if (verseEnd === lastVerse && verseStart === 1 && (raw.verseEnd === WHOLE_CHAPTER || raw.ff) && false) ref = ''
  if (raw.verseEnd === WHOLE_CHAPTER && verseStart === 1 && verseEnd === lastVerse) {
    ref = `${bookName} ${chapter}`
  } else if (raw.ff) {
    ref = `${bookName} ${chapter}:${verseStart}-${verseEnd}`
  } else if (verseEnd !== verseStart) {
    ref = `${bookName} ${chapter}:${verseStart}-${verseEnd}`
  } else {
    ref = `${bookName} ${chapter}:${verseStart}`
  }

  return {
    ref,
    book: raw.book,
    bookName,
    chapter,
    verseStart,
    verseEnd,
    verses,
    notes,
    annotations,
    ...(note ? { note } : {}),
  }
}

// ---------------------------------------------------------------------------
// Master list line parsing
// ---------------------------------------------------------------------------
interface EntryJson {
  kind: 'verse' | 'father'
  refDisplay?: string
  summary?: string
  isObjection?: boolean
  note?: string
  author?: string
  year?: string
  work?: string
  text?: string
  passages?: Passage[]
}

interface CatJson {
  name: string
  displayName: string
  slug: string
  groupName?: string | null
  entries: EntryJson[]
}

// Obvious slips in the master list, corrected so that the verse text matches
// the commentary attached to it (chapter beyond book length or text mismatch).
const REF_CORRECTIONS: [RegExp, string][] = [
  [/Jn 24:24-25/g, 'Jn 20:24-25'],
  [/Mk 18:18/g, 'Mt 18:18'],
  [/Mk 25:23/g, 'Mt 25:23'],
  [/Mk 9:2-8/g, 'Mk 2:2-8'],
  [/\(Dt 18;10-11\)/g, '(Dt 18:10-11)'],
  [/Ex 3:14, 20-7/g, 'Ex 3:14, 20:7'],
]

function cleanMd(line: string): string {
  let s = line
  s = s.replace(/\\([-.[\]()"*_!?&;:])/g, '$1')
  s = s.replace(/\\(.)/g, '$1')
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  s = s.replace(/\*\*(.*?)\*\*/g, '$1')
  return s.trim()
}

function isHeader(line: string): string | null {
  const m = line.match(/^\*\*(.+?)\*\*\s*$/)
  if (m) return m[1].trim()
  return null
}

function normalizeRefSpacing(s: string): string {
  let out = s.replace(/(\d)\s*[-\u2013]\s*(\d)/g, '$1-$2')
  out = out.replace(/(\d);(\d)/g, '$1:$2')
  return out
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const SMALL = new Set(['of', 'the', 'and', 'or', 'to', 'be', 'a', 'an', 'in', 'is', 'no', 'with', 'for', 'as', 'not'])
function titleCaseWord(w: string, i: number): string {
  const m = w.match(/^([^A-Za-z]*)([A-Za-z].*)$/)
  if (!m) return w
  const pre = m[1]
  const letters = m[2]
  const bare = letters.replace(/[^A-Za-z]/g, '')
  if (i > 0 && SMALL.has(bare.toLowerCase())) return pre + letters.toLowerCase()
  if (bare.length >= 2 && bare === bare.toUpperCase()) {
    // ALL-CAPS word: Body, Eucharist, Father? ... (leading/trailing punctuation stays)
    return pre + letters[0] + letters.slice(1).toLowerCase()
  }
  return pre + letters[0].toUpperCase() + letters.slice(1)
}
function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w, i) => titleCaseWord(w, i))
    .join(' ')
}

const GROUP_SUBCATS = new Set([
  'Past Event (I have been saved)',
  'Present Process (I am being saved)',
  'Future Event (I will be saved)',
])
const GROUP_NAME = 'HAVE YOU BEEN SAVED?'

const HEADER_ALIAS: Record<string, string> = {
  'bible-alone-of-bible-plus-tradition': 'bible-alone-or-bible-plus-tradition',
}

function parseFathersLine(rawLine: string): { author: string; year: string; work: string; text: string } | null {
  const s = cleanMd(rawLine)
  if (!s) return null
  const yearMatch = s.match(/\(([^)]*)\)/)
  const year = yearMatch ? yearMatch[1].trim() : ''
  const rest = yearMatch ? s.slice(s.indexOf('(') + yearMatch[0].length) : s

  const qChars = ['\u201c', '\u201d', '"']
  let openIdx = -1
  for (let i = 0; i < rest.length; i++) {
    if (qChars.includes(rest[i])) {
      openIdx = i
      break
    }
  }
  let closeIdx = -1
  for (let i = rest.length - 1; i > openIdx; i--) {
    if (qChars.includes(rest[i])) {
      closeIdx = i
      break
    }
  }

  let author = ''
  let quote = ''
  let work = ''
  if (openIdx !== -1 && closeIdx > openIdx) {
    author = s.slice(0, s.indexOf('(')).replace(/[:\s]+$/, '').trim()
    quote = rest.slice(openIdx + 1, closeIdx)
    work = rest.slice(closeIdx + 1)
  } else {
    const ci = s.indexOf(':')
    quote = ci >= 0 ? s.slice(ci + 1) : s
    author = ci >= 0 ? s.slice(0, ci).replace(/\([^)]*\)/, '').replace(/[:\s]+$/, '').trim() : ''
  }
  author = author.replace(/\s*again$/i, '').trim()
  work = work.replace(/^[.,;:\s*]+/, '').replace(/[*,\s]+$/, '').replace(/\*+/g, '').trim()
  quote = quote.trim()
  if (!quote) return null
  return { author: author || 'Church Father', year, work, text: quote }
}

function main() {
  const md = readFileSync(MASTER, 'utf8')
  const rawLines = md.split(/\r?\n/)

  const cats: CatJson[] = []
  const seen = new Map<string, CatJson>()
  let cur: CatJson | null = null
  let curEntry: EntryJson | null = null
  let fatherMode = false
  const pending: string[] = []

  const flushPending = () => {
    if (pending.length && curEntry) {
      const txt = pending.join(' ').replace(/\s+/g, ' ').trim()
      if (txt) curEntry.note = [curEntry.note, txt].filter(Boolean).join(' ')
    }
    pending.length = 0
  }

  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line) continue

    const header = isHeader(raw)
    if (header) {
      flushPending()
      const name = cleanMd(header).replace(/^\*+|\*+$/g, '').trim()
      const slug = HEADER_ALIAS[slugify(name)] ?? slugify(name)
      const existing = seen.get(slug)
      if (existing) {
        // repeated header: the Church Fathers section of an existing topic
        fatherMode = true
        cur = existing
        curEntry = null
        continue
      }
      fatherMode = false
      const displayName = titleCase(name.replace(/\*/g, ''))
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s+/g, ' ')
        .trim()
      cur = { name, displayName, slug, entries: [] }
      cats.push(cur)
      seen.set(slug, cur)
      curEntry = null
      continue
    }

    // ---- Church Fathers region ----
    if (fatherMode && cur) {
      if (/^\*.*\*$/.test(raw)) {
        const txt = cleanMd(raw)
        if (cur.entries.length) {
          const last = cur.entries[cur.entries.length - 1]
          last.note = [last.note, txt].filter(Boolean).join(' ')
        }
        continue
      }
      const f = parseFathersLine(raw)
      if (f) {
        curEntry = { kind: 'father', ...f }
        cur.entries.push(curEntry)
      }
      continue
    }

    // ---- verse lines ----
    const cleaned = cleanMd(raw)
    if (!cleaned) continue
    const isObjection = cleaned.startsWith('*')
    let s = cleaned.replace(/^\*\s*/, '').trim()
    if (!s) continue
    for (const [re, rep] of REF_CORRECTIONS) s = s.replace(re, rep)
    s = normalizeRefSpacing(s)

    // continuation line: leading dash
    if (/^[-\u2013]\s/.test(s) && curEntry) {
      const add = s.replace(/^[-\u2013]\s*/, '')
      if (curEntry.kind === 'father') curEntry.text = [curEntry.text, add].filter(Boolean).join(' ')
      else curEntry.summary = [curEntry.summary, add].filter(Boolean).join(' ')
      continue
    }

    // bracketed or parenthesised note lines never count as citations
    if (/^[[("]/.test(s)) {
      pending.push(s)
      continue
    }

    const hits = scanRefs(s)
    if (hits.length === 0) {
      pending.push(s)
      continue
    }

    const first = hits[0]
    const dashIdx = s.indexOf(' - ')
    const startsWithRef = isSepOnly(s.slice(0, first.start))

    // leading run: hits joined by separator-only gaps, before the dash
    const leading: ScanHit[] = []
    {
      let prevEnd = -1
      for (const h of hits) {
        const gap = prevEnd === -1 ? s.slice(0, h.start) : s.slice(prevEnd, h.start)
        const beforeDash = dashIdx === -1 ? true : h.start < dashIdx
        if (isSepOnly(gap) && (beforeDash || leading.length === 0)) {
          if (!beforeDash && leading.length > 0) break
          leading.push(h)
          prevEnd = h.end
        } else break
      }
    }

    // trailing run: hits at the end of the line
    const trailing: ScanHit[] = []
    {
      const afterLast = s.slice(hits[hits.length - 1].end)
      if (afterLast === '' || isSepOnly(afterLast)) {
        trailing.push(hits[hits.length - 1])
        for (let hi = hits.length - 2; hi >= 0; hi--) {
          const gap = s.slice(hits[hi].end, hits[hi + 1].start)
          if (isSepOnly(gap)) trailing.unshift(hits[hi])
          else break
        }
      }
    }

    // parenthetical hits (cross references such as "(See Ex 3:14, ...)")
    const parenSpans: [number, number][] = []
    {
      const re = /\(([^()]*)\)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(s))) parenSpans.push([m.index, m.index + m[0].length])
    }
    const inParen = (h: ScanHit) => parenSpans.some(([a, b]) => h.start > a && h.end < b)

    let summary = ''
    let regionText = ''
    let passages: ScanHit[] = []

    if (startsWithRef && dashIdx >= first.end - 1) {
      // refs first, summary after the dash
      passages = [...leading]
      for (const h of hits) if (h.start > dashIdx && inParen(h)) passages.push(h)
      summary = s.slice(dashIdx + 3).trim()
      regionText = s.slice(first.start, dashIdx).trim()
    } else if (!startsWithRef && dashIdx >= 0 && dashIdx < first.start) {
      // summary first, refs after the dash
      summary = s.slice(0, dashIdx).trim()
      passages = hits.filter((h) => h.start > dashIdx)
      regionText = s.slice(first.start).replace(/[),.;:\s]+$/, '').trim()
    } else if (startsWithRef) {
      // refs first, prose follows without a dash
      passages = [...leading]
      const lastLeadingEnd = leading.length ? leading[leading.length - 1].end : first.end
      summary = s.slice(lastLeadingEnd).replace(/^[\s,;.)(]+/, '').trim()
      regionText = s.slice(first.start, lastLeadingEnd).trim()
    } else {
      // refs embedded at the end of the line, often inside parentheses
      summary = s.slice(0, trailing.length ? trailing[0].start : first.start).replace(/[\s,;:(]+$/, '').trim()
      passages = [...trailing, ...hits.filter((h) => inParen(h) && !trailing.includes(h))]
      const p0 = passages.length ? passages[0].start : first.start
      regionText = s.slice(p0).replace(/[),.;:\s]+$/, '').trim()
    }

    const refsOnly = startsWithRef && !summary

    if (refsOnly) {
      // refs-only line: combine with a pending summary; its summary may also
      // arrive on the next line as a continuation ("- to symbolically eat...")
      const p = pending.join(' ').replace(/\s+/g, ' ').trim()
      pending.length = 0
      const resolved = passages.map((h) => resolvePassage(h.ref)).filter(Boolean) as Passage[]
      curEntry = { kind: 'verse', refDisplay: regionText, summary: p, isObjection, passages: resolved }
      if (cur) cur.entries.push(curEntry)
      continue
    }

    flushPending()
    const resolved = passages.map((h) => resolvePassage(h.ref)).filter(Boolean) as Passage[]
    const entry: EntryJson = { kind: 'verse', refDisplay: regionText, summary, isObjection, passages: resolved }
    if (cur) cur.entries.push(entry)
    curEntry = entry
  }
  flushPending()

  // ---- group handling: "HAVE YOU BEEN SAVED?" has three sub-questions ----
  const catsOut: CatJson[] = []
  for (const c of cats) {
    if (c.entries.length === 0 && c.name === GROUP_NAME) continue
    if (GROUP_SUBCATS.has(c.name)) c.groupName = GROUP_NAME
    catsOut.push(c)
  }

  // ---- stats ----
  let totalEntries = 0
  let totalPassages = 0
  let totalVerses = 0
  let objections = 0
  let fathers = 0
  const missing: string[] = []
  for (const c of catsOut) {
    for (const e of c.entries) {
      totalEntries++
      if (e.kind === 'father') {
        fathers++
        continue
      }
      if (e.isObjection) objections++
      const ps = e.passages ?? []
      totalPassages += ps.length
      totalVerses += ps.reduce((a, p) => a + p.verses.length, 0)
      if (ps.length === 0) missing.push(`${c.name}: ${e.refDisplay || e.summary}`)
    }
  }

  const data = {
    generatedAt: new Date().toISOString(),
    stats: { topics: catsOut.length, entries: totalEntries, passages: totalPassages, verses: totalVerses, objections, fathers },
    drNameNote: DR_NAME_NOTE,
    categories: catsOut,
  }

  writeFileSync(OUT, JSON.stringify(data, null, 1))
  writeFileSync(OUT_PUBLIC, JSON.stringify(data, null, 1))
  console.log(`Wrote ${OUT}`)
  console.log(`Wrote ${OUT_PUBLIC}`)
  console.log(JSON.stringify(data.stats, null, 2))
  if (missing.length) {
    console.log('\nEntries with no resolved passage:')
    for (const m of missing) console.log('  - ' + m)
  }
}

main()
