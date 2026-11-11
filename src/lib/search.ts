// Shared search term handling for the entries API and the search UI.

export const SEARCH_STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'is', 'are', 'was', 'be',
  'been', 'being', 'that', 'this', 'these', 'those', 'it', 'its', 'as', 'for',
  'with', 'on', 'at', 'by', 'from', 'but',
])

export function searchTerms(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !SEARCH_STOPWORDS.has(t))
    .slice(0, 8)
}
