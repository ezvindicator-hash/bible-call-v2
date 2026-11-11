'use client'

import * as React from 'react'
import { BookOpen, Quote } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { CategoryDTO } from '@/lib/types'

interface TopicNavProps {
  categories: CategoryDTO[]
  activeSlug: string | null
  onSelect: (slug: string | null) => void
  objectionOnly: boolean
  onObjectionChange: (value: boolean) => void
}

export function TopicNav({ categories, activeSlug, onSelect, objectionOnly, onObjectionChange }: TopicNavProps) {
  const groups = React.useMemo(() => {
    const root: { type: 'item'; cat: CategoryDTO }[] = []
    const grouped: { name: string; cats: CategoryDTO[] }[] = []
    let currentGroup: { name: string; cats: CategoryDTO[] } | null = null
    for (const cat of categories) {
      if (cat.groupName) {
        if (!currentGroup || currentGroup.name !== cat.groupName) {
          currentGroup = { name: cat.groupName, cats: [] }
          grouped.push(currentGroup)
        }
        currentGroup.cats.push(cat)
      } else {
        currentGroup = null
        root.push({ type: 'item', cat })
      }
    }
    return { root, grouped }
  }, [categories])

  const renderButton = (cat: CategoryDTO, indented?: boolean) => {
    const active = activeSlug === cat.slug
    return (
      <button
        key={cat.slug}
        type="button"
        onClick={() => onSelect(cat.slug)}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'flex w-full items-baseline justify-between gap-2 rounded-sm py-1.5 pr-2 text-left text-[0.95rem] transition-colors',
          indented && 'pl-5',
          active
            ? 'border-l-2 border-primary pl-2 font-semibold text-primary'
            : 'border-l-2 border-transparent pl-2 text-foreground/85 hover:bg-muted hover:text-primary',
        )}
      >
        <span className="min-w-0 truncate">{cat.displayName}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {cat.fatherCount > 0 && (
            <Quote
              className="h-3 w-3"
              aria-hidden
              title={`${cat.fatherCount} quotations from the Church Fathers`}
            />
          )}
          <span aria-hidden title={`${cat.entryCount} entries`}>
            {cat.entryCount}
          </span>
          <span className="sr-only">
            {cat.entryCount === 1 ? '1 entry' : `${cat.entryCount} entries`}
          </span>
        </span>
      </button>
    )
  }

  return (
    <nav aria-label="Topics" className="text-[0.95rem]">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-current={activeSlug === null ? 'true' : undefined}
        className={cn(
          'mb-2 flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left font-display tracking-wide transition-colors',
          activeSlug === null
            ? 'bg-secondary text-primary'
            : 'text-primary/85 hover:bg-muted',
        )}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" aria-hidden />
          All topics
        </span>
      </button>

      <h2 className="small-caps mb-1.5 mt-3 border-b border-border pb-1 text-[0.8rem] font-medium text-muted-foreground">
        The topics
      </h2>

      <div className="topic-scroll relative max-h-[calc(100vh_-_19rem)] overflow-y-auto pr-1 pb-2">
        {groups.root.map(({ cat }) => renderButton(cat))}
        {groups.grouped.map((g) => (
          <div key={g.name} className="mt-2">
            <h3 className="mb-0.5 pl-2 text-[0.78rem] small-caps text-muted-foreground">{g.name}</h3>
            {g.cats.map((cat) => renderButton(cat, true))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <label
          htmlFor="objection-toggle"
          className="cursor-pointer text-[0.9rem] text-foreground/85"
          title="Show only the verses objectors commonly cite"
        >
          Objection verses only
        </label>
        <Switch
          id="objection-toggle"
          checked={objectionOnly}
          onCheckedChange={onObjectionChange}
          aria-label="Show only objection verses"
        />
      </div>
    </nav>
  )
}
