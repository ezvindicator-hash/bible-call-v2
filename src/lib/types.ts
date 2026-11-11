export interface PassageVerse {
  n: number
  text: string
}

export interface DrNote {
  verse: number
  label: string
  text: string
}

export interface DrAnnotation {
  verse: number
  title: string
  text: string
  notes: { marker: string; text: string }[]
}

export interface PassageDTO {
  ref: string
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number
  note: string | null
  verses: PassageVerse[]
  notes: DrNote[]
  annotations: DrAnnotation[]
}

export interface EntryDTO {
  id: number
  kind: 'verse' | 'father'
  refDisplay: string
  summary: string
  note: string | null
  isObjection: boolean
  author: string | null
  year: string | null
  work: string | null
  text: string | null
  category: { slug: string; name: string; displayName: string; groupName: string | null }
  passages: PassageDTO[]
}

export interface CategoryDTO {
  slug: string
  name: string
  displayName: string
  groupName: string | null
  entryCount: number
  objectionCount: number
  fatherCount: number
}

export interface StatsDTO {
  topics: number
  entries: number
  passages: number
  verses: number
  objections: number
  fathers: number
}

export interface CategoriesResponse {
  categories: CategoryDTO[]
  stats: StatsDTO
  drNameNote: string
}

export interface EntriesResponse {
  total: number
  entries: EntryDTO[]
}
