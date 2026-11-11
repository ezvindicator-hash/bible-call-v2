import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import type { DrAnnotation, DrNote, EntryDTO, PassageDTO, PassageVerse } from '@/lib/types'
import { searchTerms } from '@/lib/search'

export const dynamic = 'force-dynamic'

const MAX_RESULTS = 250

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const q = (sp.get('q') ?? '').trim()
    const categorySlug = sp.get('category')?.trim() ?? ''
    const objectionOnly = sp.get('objection') === '1'

    const terms = searchTerms(q)

    const where: {
      AND?: { searchText: { contains: string } }[]
      category?: { slug: string }
      isObjection?: boolean
    } = {}
    if (terms.length > 0) where.AND = terms.map((t) => ({ searchText: { contains: t } }))
    if (categorySlug) where.category = { slug: categorySlug }
    if (objectionOnly) where.isObjection = true

    const needsEntries = terms.length > 0 || categorySlug !== '' || objectionOnly
    if (!needsEntries) {
      return NextResponse.json({ total: 0, entries: [] })
    }
    if (q.trim().length > 0 && terms.length === 0) {
      // only stopwords: nothing meaningful to match
      return NextResponse.json({ total: 0, entries: [] })
    }

    const rows = await db.entry.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { order: 'asc' }],
      include: { category: true, passages: { orderBy: { order: 'asc' } } },
      take: MAX_RESULTS,
    })

    const entries: EntryDTO[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind as 'verse' | 'father',
      refDisplay: r.refDisplay,
      summary: r.summary,
      note: r.note,
      isObjection: r.isObjection,
      author: r.author,
      year: r.year,
      work: r.work,
      text: r.text,
      category: {
        slug: r.category.slug,
        name: r.category.name,
        displayName: r.category.displayName,
        groupName: r.category.groupName,
      },
      passages: r.passages.map<PassageDTO>((p) => ({
        ref: p.ref,
        bookName: p.bookName,
        chapter: p.chapter,
        verseStart: p.verseStart,
        verseEnd: p.verseEnd,
        note: p.note,
        verses: JSON.parse(p.versesJson) as PassageVerse[],
        notes: p.notesJson ? (JSON.parse(p.notesJson) as DrNote[]) : [],
        annotations: p.annotJson ? (JSON.parse(p.annotJson) as DrAnnotation[]) : [],
      })),
    }))

    return NextResponse.json({ total: entries.length, entries })
  } catch (err) {
    console.error('entries error', err)
    return NextResponse.json({ error: 'Failed to load entries' }, { status: 500 })
  }
}
