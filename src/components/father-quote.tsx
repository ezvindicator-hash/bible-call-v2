'use client'

import { Highlight } from '@/components/highlight'
import type { EntryDTO } from '@/lib/types'

interface FatherQuoteProps {
  entry: EntryDTO
  terms: string[]
  index: number
  showCategoryLink?: boolean
  onSelectCategory?: (slug: string) => void
}

export function FatherQuote({ entry, terms, index, showCategoryLink, onSelectCategory }: FatherQuoteProps) {
  if (entry.kind !== 'father') return null

  return (
    <figure
      className={index > 0 ? 'border-t border-border/70 py-5' : 'py-5'}
      aria-label={`Quotation from ${entry.author}`}
    >
      {showCategoryLink && entry.category.slug && (
        <button
          type="button"
          onClick={() => onSelectCategory?.(entry.category.slug)}
          className="small-caps mb-1 text-[0.74rem] text-muted-foreground transition-colors hover:text-primary"
        >
          {entry.category.displayName}
        </button>
      )}
      <blockquote className="border-l-2 border-accent/60 pl-4">
        <p className="text-[1.05rem] italic leading-8 text-foreground/95">
          <span aria-hidden>“</span>
          <Highlight text={entry.text ?? ''} terms={terms} />
          <span aria-hidden>”</span>
        </p>
      </blockquote>
      <figcaption className="mt-2 text-[0.9rem] text-muted-foreground">
        <span className="font-display text-primary">{entry.author}</span>
        {entry.year && `, ${entry.year}`}
        {entry.work && (
          <>
            . <span className="italic">{entry.work.replace(/\.+$/, '')}</span>
          </>
        )}
        .
      </figcaption>
      {entry.note && (
        <p className="mt-1.5 text-[0.85rem] italic leading-6 text-muted-foreground">{entry.note}</p>
      )}
    </figure>
  )
}
