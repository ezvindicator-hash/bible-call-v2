'use client'

import * as React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Highlight } from '@/components/highlight'
import type { EntryDTO, PassageDTO } from '@/lib/types'
import { cn } from '@/lib/utils'

function PassageBlock({ passage, terms }: { passage: PassageDTO; terms: string[] }) {
  return (
    <figure className="mt-3">
      <figcaption className="flex items-baseline justify-between gap-3 pb-1">
        <span className="small-caps text-[0.78rem] font-medium text-accent">Douay-Rheims</span>
        <span className="font-display text-[0.92rem] text-primary">{passage.ref}</span>
      </figcaption>
      <blockquote className="rounded-sm border-l-2 border-primary/40 bg-card px-4 py-3 shadow-[0_1px_0_0_var(--border)]">
        <p className="text-[1.02rem] leading-8 text-foreground/95">
          {passage.verses.map((v) => (
            <React.Fragment key={v.n}>
              <sup className="verse-n" aria-label={`verse ${v.n}`}>
                {v.n}
              </sup>
              <Highlight text={v.text} terms={terms} />{' '}
            </React.Fragment>
          ))}
        </p>
        {passage.note && (
          <p className="mt-2 text-[0.8rem] italic leading-6 text-muted-foreground">{passage.note}</p>
        )}
      </blockquote>

      {passage.notes.length > 0 && (
        <div className="mt-1.5 space-y-0.5 px-1">
          {passage.notes.map((n, i) => (
            <p key={i} className="text-[0.82rem] leading-6 text-muted-foreground">
              <span className="mr-1 font-display text-accent">{n.label}.</span>
              {n.text}
            </p>
          ))}
        </div>
      )}

      {passage.annotations.length > 0 && (
        <Accordion type="multiple" className="mt-1.5">
          {passage.annotations.map((a, i) => (
            <AccordionItem key={i} value={`annotation-${i}`} className="border-border/70">
              <AccordionTrigger className="rounded-sm py-2 text-left text-[0.9rem] hover:text-primary hover:no-underline">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="small-caps shrink-0 text-[0.76rem] font-medium text-accent">
                    Annotation
                  </span>
                  <span className="shrink-0 text-[0.78rem] text-muted-foreground">v. {a.verse}</span>
                  <span className="min-w-0 truncate font-medium text-foreground/90">{a.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 text-[0.92rem] leading-7 text-foreground/90">
                <p>{a.text}</p>
                {a.notes.length > 0 && (
                  <div className="mt-2 space-y-1 border-l border-border pl-3">
                    {a.notes.map((nn, j) => (
                      <p key={j} className="text-[0.85rem] leading-6 text-muted-foreground">
                        {nn.text}
                      </p>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </figure>
  )
}

interface EntryCardProps {
  entry: EntryDTO
  terms: string[]
  showCategoryLink?: boolean
  onSelectCategory?: (slug: string) => void
  index: number
}

export function EntryCard({ entry, terms, showCategoryLink, onSelectCategory, index }: EntryCardProps) {
  if (entry.kind === 'father') return null

  return (
    <article
      aria-label={`Citation: ${entry.refDisplay}`}
      className={cn('py-5', index > 0 && 'border-t border-border/70')}
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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <h3 className="font-display text-[1.12rem] leading-snug text-primary">
          <Highlight text={entry.refDisplay} terms={terms} />
        </h3>
        {entry.isObjection && (
          <Badge
            variant="outline"
            title="A verse commonly cited against the position; the neighbouring entries give the Catholic reading."
            className="border-accent/70 bg-accent/10 text-[0.68rem] tracking-wide text-accent"
          >
            Objection verse
          </Badge>
        )}
      </div>

      {entry.summary && (
        <p className="mt-1.5 text-[1.02rem] leading-7 text-foreground/95">
          <Highlight text={entry.summary} terms={terms} />
        </p>
      )}

      {entry.note && (
        <p className="mt-1.5 border-l-2 border-accent/40 pl-3 text-[0.9rem] italic leading-6 text-muted-foreground">
          {entry.note}
        </p>
      )}

      {entry.passages.map((p, i) => (
        <PassageBlock key={i} passage={p} terms={terms} />
      ))}
    </article>
  )
}
