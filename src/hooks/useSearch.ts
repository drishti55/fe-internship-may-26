import { useState, useEffect } from 'react'
import type { Item } from '../types'
import { searchItems } from '../services/mockApi'

declare global {
  interface Window {
    __searchTimer: number | ReturnType<typeof setTimeout>
  }
}

export interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: Item[]
  isLoading: boolean
  error: string | null
}

export function useSearch(): UseSearchReturn {
  // Read initial query from URL (?q=...) for URL persistence bonus
  const [query, setQueryState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('q') ?? ''
  })
  const [results, setResults] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep URL in sync with the query (bonus: persist in URL)
  const setQuery = (q: string) => {
    setQueryState(q)
    const url = new URL(window.location.href)
    if (q) {
      url.searchParams.set('q', q)
    } else {
      url.searchParams.delete('q')
    }
    window.history.replaceState(null, '', url.toString())
  }

  useEffect(() => {
    clearTimeout(window.__searchTimer as unknown as number)

    const performSearch = (q: string) => {
      if (q.length === 0) {
        setResults([])
        return
      }

      setIsLoading(true)
      setError(null)

      let cancelled = false
      searchItems(q)
        .then(results => {
          setIsLoading(false)
          cancelled = true
          if (!cancelled) setResults(results)
        })
        .catch(err => {
          setIsLoading(false)
          setError(err instanceof Error ? err.message : 'Something went wrong')
        })
    }

    window.__searchTimer = setTimeout(() => performSearch(query), 300)
  }, [query, isLoading])

  return { query, setQuery, results, isLoading, error }
}
