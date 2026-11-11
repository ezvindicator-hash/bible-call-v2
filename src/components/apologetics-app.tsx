'use client'

import * as React from 'react'
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ArrowLeft, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SiteHeader } from '@/components/site-header'
import { TopicNav } from '@/components/topic-nav'
import { EntryCard } from '@/components/entry-card'
import { FatherQuote } from '@/components/father-quote'
import { SiteFooter } from '@/components/site-footer'
import { Highlight } from '@/components/highlight'
import { searchTerms } from '@/lib/search'
import { loadCategories, loadEntries } from '@/lib/client-data'
import type { CategoriesResponse, EntryDTO, EntriesResponse, StatsDTO } from '@/lib/types'

type View = { mode: 'home' } | { mode: 'category'; slug: string } | { mode: 'search'; q: string }

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(t)
  }, [value, delay])
  return debounced
}

function numberFmt(n: number) {
  return n.toLocaleString('en-US')
}

function plural(n: number, singular: string, pluralWord: string) {
  return `${numberFmt(n)} ${n === 1 ? singular : pluralWord}`
}

function EntryList({
  entries,
  terms,
  showCategoryLink,
  onSelectCategory,
  withFathersDivider,
}: {
  entries: EntryDTO[]
  terms: string[]
  showCategoryLink?: boolean
  onSelectCategory?: (slug: string) => void
  withFathersDivider?: boolean
}) {
  const firstFatherIdx = withFathersDivider
    ? entries.findIndex((e, i) => e.kind === 'father' && i > 0)
    : -1
  return (
    <div>
      {entries.map((e, i) => (
        <React.Fragment key={e.id}>
          {withFathersDivider && i === firstFatherIdx && (
              <h3 className="small-caps mt-4 border-t border-border pt-5 text-[0.85rem] font-medium text-accent">
                Church Fathers
              </h3>
            )}
            {e.kind === 'father' ? (
              <FatherQuote
                entry={e}
                terms={terms}
                index={i}
                showCategoryLink={showCategoryLink}
                onSelectCategory={onSelectCategory}
              />
            ) : (
              <EntryCard
                entry={e}
                terms={terms}
                index={i}
                showCategoryLink={showCategoryLink}
                onSelectCategory={onSelectCategory}
              />
            )}
          </React.Fragment>
      ))}
    </div>
  )
}

function EntriesSkeleton() {
  return (
    <div className="space-y-8 pt-4" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-24 w-full rounded-sm" />
        </div>
      ))}
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-sm border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  )
}

function HomeView({
  categories,
  stats,
  objectionOnly,
  onSelect,
}: {
  categories: CategoriesResponse['categories']
  stats: StatsDTO
  objectionOnly: boolean
  onSelect: (slug: string | null) => void
}) {
  const statItems: { label: string; value: number }[] = [
    { label: 'Topics', value: stats.topics },
    { label: 'Citations', value: stats.entries },
    { label: 'Passages', value: stats.passages },
    { label: 'Verses', value: stats.verses },
    { label: 'Objections', value: stats.objections },
    { label: 'Fathers', value: stats.fathers },
  ]

  return (
    <div className="pt-4 sm:pt-6">
      {objectionOnly ? (
        <ObjectionIntro />
      ) : (
        <>
          <h2 className="font-display text-[1.55rem] leading-tight text-primary sm:text-[1.7rem]">
            A topical scripture index for Catholic apologetics
          </h2>
          <p className="mt-2 max-w-2xl text-[1.02rem] leading-7 text-foreground/90">
            Every citation from the master list appears here with the text of the Original
            Douay-Rheims Bible (1582 New Testament, 1609 Old Testament), its marginal notes, and the
            annotations printed in that edition. Pick a topic, or search citations and verse text.
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Collection size">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="rounded-sm border border-border bg-card px-2 py-2 text-center"
              >
                <dt className="small-caps text-[0.7rem] text-muted-foreground">{s.label}</dt>
                <dd className="font-display text-[1.3rem] leading-tight text-primary">
                  {numberFmt(s.value)}
                </dd>
              </div>
            ))}
          </dl>

          <h3 className="small-caps mt-9 border-b border-border pb-1.5 text-[0.85rem] font-medium text-muted-foreground">
            Browse by topic
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat) =>
              cat.groupName ? null : (
                <TopicCard key={cat.slug} cat={cat} onSelect={onSelect} />
              ),
            )}
            {(() => {
              const grouped = categories.filter((c) => c.groupName)
              if (grouped.length === 0) return null
              return (
                <>
                  <div className="col-span-full mt-2">
                    <h4 className="small-caps text-[0.78rem] text-muted-foreground">
                      {grouped[0].groupName}
                    </h4>
                  </div>
                  {grouped.map((cat) => (
                    <TopicCard key={cat.slug} cat={cat} onSelect={onSelect} />
                  ))}
                </>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}

function ObjectionIntro() {
  return (
    <div className="pt-2">
      <h2 className="font-display text-[1.55rem] text-primary">Objection verses</h2>
      <p className="mt-2 max-w-2xl text-[1.02rem] leading-7 text-foreground/90">
        The verses the master list marks with an asterisk: those commonly cited against the Catholic
        position. Each is listed with the topic that answers it.
      </p>
    </div>
  )
}

function TopicCard({
  cat,
  onSelect,
}: {
  cat: CategoriesResponse['categories'][number]
  onSelect: (slug: string | null) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(cat.slug)}
      className="group flex items-baseline justify-between gap-3 rounded-sm border border-border bg-card px-3.5 py-2.5 text-left transition-colors hover:border-primary/60 hover:bg-muted/60"
    >
      <span className="min-w-0 font-display text-[0.98rem] leading-snug text-primary">
        {cat.displayName}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-[0.78rem] text-muted-foreground">
        <span aria-hidden title={`${cat.entryCount} entries`}>
          {cat.entryCount}
        </span>
        <span className="sr-only">
          {cat.entryCount === 1 ? '1 entry' : `${cat.entryCount} entries`}
        </span>
        {cat.objectionCount > 0 && (
          <span
            aria-hidden
            className="text-accent"
            title={`${cat.objectionCount} objection verses`}
          >
            · {cat.objectionCount}*
          </span>
        )}
        {cat.objectionCount > 0 && (
          <span className="sr-only">
            {`, ${cat.objectionCount} objection verse${cat.objectionCount === 1 ? '' : 's'}`}
          </span>
        )}
        {cat.fatherCount > 0 && (
          <span
            aria-hidden
            title={`${cat.fatherCount} quotations from the Church Fathers`}
          >
            · {cat.fatherCount}F
          </span>
        )}
        {cat.fatherCount > 0 && (
          <span className="sr-only">
            {`, ${cat.fatherCount} quotation${cat.fatherCount === 1 ? '' : 's'} from the Fathers`}
          </span>
        )}
      </span>
    </button>
  )
}

export function ApologeticsAppInner() {
  const [view, setView] = React.useState<View>({ mode: 'home' })
  const [rawQuery, setRawQuery] = React.useState('')
  const query = useDebouncedValue(rawQuery, 300)
  const [objectionOnly, setObjectionOnly] = React.useState(false)
  const [navOpen, setNavOpen] = React.useState(false)

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => loadCategories(),
  })

  React.useEffect(() => {
    const t = query.trim()
    if (t) {
      setView({ mode: 'search', q: t })
    } else {
      setView((v) => (v.mode === 'search' ? { mode: 'home' } : v))
    }
  }, [query])

  const activeSlug = view.mode === 'category' ? view.slug : null
  const terms = view.mode === 'search' ? searchTerms(view.q) : []

  const entriesQ = useQuery({
    queryKey: [
      'entries',
      view.mode,
      view.mode === 'category' ? view.slug : '',
      view.mode === 'search' ? view.q : '',
      objectionOnly,
    ],
    queryFn: () =>
      loadEntries({
        q: view.mode === 'search' ? view.q : '',
        category: view.mode === 'category' ? view.slug : '',
        objection: objectionOnly,
      }),
    enabled: view.mode !== 'home' || objectionOnly,
    placeholderData: (prev: unknown) => prev,
  })

  const selectCategory = (slug: string | null) => {
    setRawQuery('')
    setNavOpen(false)
    if (slug !== null) window.scrollTo({ top: 0 })
    setView(slug === null ? { mode: 'home' } : { mode: 'category', slug })
  }

  const submitSearch = () => {
    const t = rawQuery.trim()
    if (t) setView({ mode: 'search', q: t })
  }

  const categories = categoriesQ.data?.categories ?? []
  const entries = (entriesQ.data as EntriesResponse | undefined)?.entries ?? []
  const entriesTotal = (entriesQ.data as EntriesResponse | undefined)?.total ?? 0
  const activeCategory = categories.find((c) => c.slug === activeSlug)

  const showObjectionHome = view.mode === 'home' && objectionOnly
  const entriesLoading = (view.mode !== 'home' || objectionOnly) && entriesQ.isLoading && !entriesQ.data

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        query={rawQuery}
        onQueryChange={setRawQuery}
        onSubmit={submitSearch}
        onOpenTopics={() => setNavOpen(true)}
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[6.5rem] pt-6">
              {categoriesQ.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : categoriesQ.isError ? (
                <ErrorBox message="The topic list failed to load." />
              ) : (
                <TopicNav
                  categories={categories}
                  activeSlug={activeSlug}
                  onSelect={selectCategory}
                  objectionOnly={objectionOnly}
                  onObjectionChange={setObjectionOnly}
                />
              )}
            </div>
          </aside>

          <main id="content" className="min-w-0 pt-2 sm:pt-4">
            {view.mode !== 'home' && (
              <button
                type="button"
                onClick={() => selectCategory(null)}
                className="small-caps mb-2 inline-flex items-center gap-1 rounded-sm text-[0.74rem] text-muted-foreground transition-colors hover:text-primary lg:hidden"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                All topics
              </button>
            )}

            {/* ---------- home ---------- */}
            {view.mode === 'home' && categoriesQ.data && (
              <HomeView
                categories={categories}
                stats={categoriesQ.data.stats}
                objectionOnly={objectionOnly}
                onSelect={selectCategory}
              />
            )}

            {/* ---------- objection-only listing from the home view ---------- */}
            {showObjectionHome && (
              <div className="pt-2">
                {entriesLoading ? (
                  <EntriesSkeleton />
                ) : entriesQ.isError ? (
                  <ErrorBox message="The entries failed to load." />
                ) : entries.length === 0 ? (
                  <div className="rounded-sm border border-dashed border-border bg-card/50 px-6 py-10 text-center">
                    <p className="font-display text-[1.05rem] text-primary">No objection verses.</p>
                  </div>
                ) : (
                  <EntryList
                    entries={entries}
                    terms={[]}
                    showCategoryLink
                    onSelectCategory={(slug) => selectCategory(slug)}
                  />
                )}
              </div>
            )}

            {/* ---------- category view ---------- */}
            {view.mode === 'category' && (
              <div className="pt-2">
                {activeCategory && (
                  <header className="border-b border-border pb-3">
                    {activeCategory.groupName && (
                      <p className="small-caps text-[0.72rem] text-muted-foreground">
                        {activeCategory.groupName}
                      </p>
                    )}
                    <h2 className="font-display text-[1.5rem] leading-tight text-primary">
                      {activeCategory.displayName}
                    </h2>
                    <p className="mt-0.5 text-[0.85rem] text-muted-foreground">
                      {plural(
                        activeCategory.entryCount - activeCategory.fatherCount,
                        'citation',
                        'citations',
                      )}
                      {activeCategory.fatherCount > 0 &&
                        ` · ${plural(activeCategory.fatherCount, 'quotation', 'quotations')} from the Fathers`}
                    </p>
                  </header>
                )}

                {entriesLoading ? (
                  <EntriesSkeleton />
                ) : entriesQ.isError ? (
                  <ErrorBox message="The entries failed to load." />
                ) : entries.length === 0 ? (
                  <div className="rounded-sm border border-dashed border-border bg-card/50 px-6 py-10 text-center">
                    <p className="font-display text-[1.05rem] text-primary">
                      {objectionOnly
                        ? 'This topic lists no objection verses.'
                        : 'No entries in this topic.'}
                    </p>
                  </div>
                ) : (
                  <EntryList
                    entries={entries}
                    terms={[]}
                    withFathersDivider={!objectionOnly}
                  />
                )}
              </div>
            )}

            {/* ---------- search view ---------- */}
            {view.mode === 'search' && (
              <div className="pt-2">
                <header className="border-b border-border pb-3">
                  <h2 className="font-display text-[1.4rem] leading-tight text-primary">
                    {entriesLoading ? (
                      'Searching…'
                    ) : (
                      <>
                        {entriesTotal === 1
                          ? '1 entry matches'
                          : `${numberFmt(entriesTotal)} entries match`}{' '}
                        <span className="italic">“{view.q}”</span>
                      </>
                    )}
                  </h2>
                  {objectionOnly && (
                    <p className="mt-0.5 text-[0.85rem] text-muted-foreground">
                      Objection verses only.
                    </p>
                  )}
                </header>

                {entriesLoading ? (
                  <EntriesSkeleton />
                ) : entriesQ.isError ? (
                  <ErrorBox message="The entries failed to load." />
                ) : entries.length === 0 ? (
                  <div className="mt-4 rounded-sm border border-dashed border-border bg-card/50 px-6 py-12 text-center">
                    <SearchX className="mx-auto h-8 w-8 text-accent" aria-hidden />
                    <p className="mt-2 font-display text-[1.05rem] text-primary">
                      No entries match <span className="italic">“{view.q}”</span>.
                    </p>
                    <p className="mt-1 text-[0.9rem] text-muted-foreground">
                      Try a topic name (purgatory, confession), a citation (Jn 3:5), or words from a
                      verse.
                    </p>
                  </div>
                ) : (
                  <div className="pt-2">
                    <EntryList
                      entries={entries}
                      terms={terms}
                      showCategoryLink
                      onSelectCategory={(slug) => selectCategory(slug)}
                    />
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <SiteFooter drNameNote={categoriesQ.data?.drNameNote ?? ''} />

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="topic-scroll w-[18rem] overflow-y-auto bg-background p-5"
        >
          <SheetHeader className="p-0 pb-3">
            <SheetTitle className="text-left font-display text-[1.2rem] text-primary">
              Topics
            </SheetTitle>
            <SheetDescription className="sr-only">
              Browse the apologetics topics.
            </SheetDescription>
          </SheetHeader>
          {categoriesQ.data && (
            <TopicNav
              categories={categories}
              activeSlug={activeSlug}
              onSelect={selectCategory}
              objectionOnly={objectionOnly}
              onObjectionChange={setObjectionOnly}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function ApologeticsApp() {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ApologeticsAppInner />
    </QueryClientProvider>
  )
}
