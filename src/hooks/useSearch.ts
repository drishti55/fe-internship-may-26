import { useState, useEffect, useRef } from 'react'
import type { Item } from '../types'
import { searchItems } from '../services/mockApi'
import { useDebounce } from './useDebounce'

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

  // Incrementing request ID to detect and discard stale responses
  const requestIdRef = useRef(0)

  // Debounce the raw query by 300 ms using the reusable hook
  const debouncedQuery = useDebounce(query, 300)

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
    // Flag to prevent state updates after the effect has been cleaned up
    let isMounted = true

    // Assign a unique ID to this particular search request
    const currentRequestId = ++requestIdRef.current

    const runSearch = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await searchItems(debouncedQuery)

        // Only commit results if this is still the latest request
        // and the component hasn't unmounted
        if (isMounted && currentRequestId === requestIdRef.current) {
          setResults(data)
        }
      } catch (err) {
        if (isMounted && currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
          setResults([])
        }
      } finally {
        if (isMounted && currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    runSearch()

    // Cleanup: mark as unmounted so stale state updates are skipped
    return () => {
      isMounted = false
    }
  }, [debouncedQuery])

  return { query, setQuery, results, isLoading, error }
}
