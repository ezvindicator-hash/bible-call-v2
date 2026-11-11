/**
 * Seeds SQLite from src/data/apologetics.json.
 * Run after: bun run db:push
 *
 *   bun scripts/seed.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

async function main() {
  const dataPath = join(process.cwd(), 'src', 'data', 'apologetics.json')
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as { categories: CatJson[] }

  console.log('Clearing old rows...')
  await prisma.passage.deleteMany()
  await prisma.entry.deleteMany()
  await prisma.category.deleteMany()

  let entryCount = 0
  let passageCount = 0

  for (const cat of data.categories) {
    const entries = cat.entries.map((e, idx) => {
      const passages = (e.passages ?? []).map((p, pidx) => ({
        ref: p.ref,
        book: p.book,
        bookName: p.bookName,
        chapter: p.chapter,
        verseStart: p.verseStart,
        verseEnd: p.verseEnd,
        verseCount: p.verses.length,
        versesJson: JSON.stringify(p.verses),
        notesJson: p.notes.length ? JSON.stringify(p.notes) : null,
        annotJson: p.annotations.length ? JSON.stringify(p.annotations) : null,
        note: p.note ?? null,
        order: pidx + 1,
      }))
      passageCount += passages.length
      entryCount++

      const searchText = [
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

      return {
        kind: e.kind,
        refDisplay: e.refDisplay ?? '',
        summary: e.summary ?? '',
        note: e.note ?? null,
        isObjection: e.isObjection ?? false,
        author: e.author ?? null,
        year: e.year ?? null,
        work: e.work ?? null,
        text: e.text ?? null,
        order: idx + 1,
        searchText,
        passages: { create: passages },
      }
    })

    await prisma.category.create({
      data: {
        slug: cat.slug,
        name: cat.name,
        displayName: cat.displayName,
        groupName: cat.groupName ?? null,
        order: 0,
        entries: { create: entries },
      },
    })
    console.log(`  ${cat.displayName}: ${entries.length} entries`)
  }

  // fix category order (stored incrementally)
  for (let i = 0; i < data.categories.length; i++) {
    await prisma.category.update({ where: { slug: data.categories[i].slug }, data: { order: i + 1 } })
  }

  console.log(`\nSeeded ${data.categories.length} categories, ${entryCount} entries, ${passageCount} passages.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
