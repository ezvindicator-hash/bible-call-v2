'use client'

import * as React from 'react'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Wraps every occurrence of the search terms in <mark> elements.
 */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const trimmed = terms.map((t) => t.trim()).filter(Boolean)
  if (trimmed.length === 0) return <>{text}</>

  const pattern = trimmed.map(escapeRegExp).join('|')
  const re = new RegExp(`(${pattern})`, 'gi')
  const parts = text.split(re)

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  )
}
