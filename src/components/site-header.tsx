'use client'

import * as React from 'react'
import { Github, List, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

function CrossEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      role="img"
    >
      <path d="M11.1 1h1.8v7.6h6.6v1.8h-6.6V23h-1.8V10.4H4.5V8.6h6.6z" />
    </svg>
  )
}

interface SiteHeaderProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  onOpenTopics: () => void
}

export function SiteHeader({ query, onQueryChange, onSubmit, onOpenTopics }: SiteHeaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit()
    }
    if (e.key === 'Escape') {
      onQueryChange('')
      inputRef.current?.blur()
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-background double-rule">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
        <div className="flex items-center gap-3 py-3">
          <CrossEmblem className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="font-display text-[1.28rem] leading-tight tracking-wide text-primary sm:text-[1.45rem]">
              Catholic Apologetics
            </h1>
            <p className="hidden text-[0.8rem] text-muted-foreground sm:block">
              Scripture master list with the Original Douay-Rheims (1582, 1609)
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Browse topics"
              onClick={onOpenTopics}
            >
              <List className="h-[1.15rem] w-[1.15rem]" />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open github.com in a new tab"
              >
                <Github className="h-[1.15rem] w-[1.15rem]" />
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="pb-3">
          <div className="relative mx-auto w-full max-w-xl">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search topics, citations, verse text"
              aria-label="Search topics, citations, or verse text"
              className={cn('w-full pl-9 pr-9')}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
