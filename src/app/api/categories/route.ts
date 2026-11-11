import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DR_NAME_NOTE =
  'The Douay-Rheims keeps the older book names: 1 and 2 Samuel are 1 and 2 Kings, 1 and 2 Kings are 3 and 4 Kings, 1 and 2 Chronicles are 1 and 2 Paralipomenon. Psalm numbers follow the Latin Psalter.'

export async function GET() {
  try {
    const cats = await db.category.findMany({
      orderBy: { order: 'asc' },
      include: { entries: { select: { kind: true, isObjection: true } } },
    })

    const categories = cats.map((c) => ({
      slug: c.slug,
      name: c.name,
      displayName: c.displayName,
      groupName: c.groupName,
      entryCount: c.entries.length,
      objectionCount: c.entries.filter((e) => e.isObjection).length,
      fatherCount: c.entries.filter((e) => e.kind === 'father').length,
    }))

    const [entryTotal, passageTotal, objectionTotal, fatherTotal, passageRows] = await Promise.all([
      db.entry.count(),
      db.passage.count(),
      db.entry.count({ where: { isObjection: true } }),
      db.entry.count({ where: { kind: 'father' } }),
      db.passage.findMany({ select: { verseCount: true } }),
    ])
    const verseTotal = passageRows.reduce((a, r) => a + r.verseCount, 0)

    return NextResponse.json({
      categories,
      stats: {
        topics: cats.length,
        entries: entryTotal,
        passages: passageTotal,
        verses: verseTotal,
        objections: objectionTotal,
        fathers: fatherTotal,
      },
      drNameNote: DR_NAME_NOTE,
    })
  } catch (err) {
    console.error('categories error', err)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }
}
