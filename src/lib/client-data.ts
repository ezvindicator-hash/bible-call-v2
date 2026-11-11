// Client-side data access for the static export. The former /api/categories
// and /api/entries routes queried SQLite on the server; a static site has no
// server, so the browser loads /data/apologetics.json once and computes the
// same responses locally. The filter and ordering rules below match the old
// route handlers exactly.

import { searchTerms } from '@/lib/search'
import type {
  CategoriesResponse,
  CategoryDTO,
  EntryDTO,
  EntriesResponse,
  StatsDTO,
} from '@/lib/types'

interface VerseJson {
  n: number
  text: string
}
interface NoteJson {
  verse: number
  label: string
  text: string
}
interface AnnotationJson {
  verse: number
  title: string
  text: string
  notes: { marker: string; text: string }[]
}
interface PassageJson {
  ref: string
  book: string
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number
  verses: VerseJson[]
  notes: NoteJson[]
  annotations: AnnotationJson[]
  note?: string
}
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
  passages?: PassageJson[]
}
interface CatJson {
  name: string
  displayName: string
  slug: string
  groupName?: string | null
  entries: EntryJson[]
}
interface DataJson {
  generatedAt: string
  stats: StatsDTO
  drNameNote: string
  categories: CatJson[]
}

const MAX_RESULTS = 250
const DATA_URL = '/data/apologetics.json'

export interface Dataset {
  categories: CategoryDTO[]
  stats: StatsDTO
  drNameNote: string
  entries: EntryDTO[]
  searchStrings: string[] // parallel to entries; same text the old searchText column held
}

let datasetPromise: Promise<Dataset> | null = null

function buildSearchText(cat: CatJson, e: EntryJson): string {
  // Same fields scripts/seed.ts concatenated into the searchText column.
  return [
    cat.name,
    cat.displayName,
    cat.groupName ?? '',
    e.refDisplay ?? '',
    e.summary ?? '',
    e.note ?? '',
    e.author ?? '',
    e.year ?? '',
    e.work ?? '',
    e.text ?? '',
    ...(e.passages ?? []).flatMap((p) => [
      p.ref,
      p.bookName,
      p.note ?? '',
      ...p.verses.map((v) => v.text),
    ]),
  ]
    .join(' | ')
    .toLowerCase()
}

function buildDataset(raw: DataJson): Dataset {
  const entries: EntryDTO[] = []
  const searchStrings: string[] = []
  let id = 0

  const categories: CategoryDTO[] = raw.categories.map((c) => {
    for (const e of c.entries) {
      id++
      entries.push({
        id,
        kind: e.kind,
        refDisplay: e.refDisplay ?? '',
        summary: e.summary ?? '',
        note: e.note ?? null,
        isObjection: e.isObjection ?? false,
        author: e.author ?? null,
        year: e.year ?? null,
        work: e.work ?? null,
        text: e.text ?? null,
        category: {
          slug: c.slug,
          name: c.name,
          displayName: c.displayName,
          groupName: c.groupName ?? null,
        },
        passages: (e.passages ?? []).map((p) => ({
          ref: p.ref,
          bookName: p.bookName,
          chapter: p.chapter,
          verseStart: p.verseStart,
          verseEnd: p.verseEnd,
          note: p.note ?? null,
          verses: p.verses,
          notes: p.notes,
          annotations: p.annotations,
        })),
      })
      searchStrings.push(buildSearchText(c, e))
    }
    return {
      slug: c.slug,
      name: c.name,
      displayName: c.displayName,
      groupName: c.groupName ?? null,
      entryCount: c.entries.length,
      objectionCount: c.entries.filter((e) => e.isObjection).length,
      fatherCount: c.entries.filter((e) => e.kind === 'father').length,
    }
  })

  return {
    categories,
    stats: raw.stats,
    drNameNote: raw.drNameNote,
    entries,
    searchStrings,
  }
}

async function fetchDataJson(): Promise<DataJson> {
  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
  return (await res.json()) as DataJson
}

export function loadDataset(): Promise<Dataset> {
  if (!datasetPromise) {
    datasetPromise = fetchDataJson().then(buildDataset).catch((err) => {
      datasetPromise = null // a later call can retry the fetch
      throw err
    })
  }
  return datasetPromise
}

export async function loadCategories(): Promise<CategoriesResponse> {
  const { categories, stats, drNameNote } = await loadDataset()
  return { categories, stats, drNameNote }
}

export async function loadEntries(params: {
  q?: string
  category?: string
  objection?: boolean
}): Promise<EntriesResponse> {
  const ds = await loadDataset()
  const q = (params.q ?? '').trim()
  const categorySlug = params.category?.trim() ?? ''
  const objectionOnly = params.objection === true

  const terms = searchTerms(q)
  const needsEntries = terms.length > 0 || categorySlug !== '' || objectionOnly
  if (!needsEntries) return { total: 0, entries: [] }
  if (q.length > 0 && terms.length === 0) {
    // only stopwords: nothing meaningful to match
    return { total: 0, entries: [] }
  }

  const matched = ds.entries.filter((e, i) => {
    if (categorySlug && e.category.slug !== categorySlug) return false
    if (objectionOnly && !e.isObjection) return false
    const hay = ds.searchStrings[i]
    return terms.every((t) => hay.includes(t))
  })

  const entries = matched.slice(0, MAX_RESULTS)
  return { total: entries.length, entries }
}
