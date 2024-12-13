'use client'

import { useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { DetaineeSearchResult, DetaineeFilter } from '@/lib/types/detainees'

interface UseDetaineeSearchProps {
  initialFilter?: DetaineeFilter
}

interface UseDetaineeSearchReturn {
  results: DetaineeSearchResult[]
  loading: boolean
  error: Error | null
  totalCount: number
  search: (query: string, filter?: DetaineeFilter) => Promise<void>
  updateFilter: (newFilter: Partial<DetaineeFilter>) => void
  currentFilter: DetaineeFilter
  hasMore: boolean
  loadMore: () => Promise<void>
}

const DEFAULT_FILTER: DetaineeFilter = {
  limit: 10,
  offset: 0,
  status: undefined,
  gender: undefined,
  nationality: undefined,
  verified: undefined,
  startDate: undefined,
  endDate: undefined,
}

export function useDetaineeSearch({
  initialFilter = DEFAULT_FILTER,
}: UseDetaineeSearchProps = {}): UseDetaineeSearchReturn {
  const supabase = useSupabaseClient()
  const [results, setResults] = useState<DetaineeSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentFilter, setCurrentFilter] = useState<DetaineeFilter>(initialFilter)
  const [currentQuery, setCurrentQuery] = useState('')

  const search = async (query: string, filter?: DetaineeFilter) => {
    setLoading(true)
    setError(null)
    setCurrentQuery(query)

    const newFilter = { ...currentFilter, ...filter, offset: 0 }
    setCurrentFilter(newFilter)

    try {
      const { data, error: searchError } = await supabase.functions.invoke('search-detainees', {
        body: { query, filter: newFilter },
      })

      if (searchError) {
        throw searchError
      }

      setResults(data.detainees || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'))
    } finally {
      setLoading(false)
    }
  }

  const updateFilter = (newFilter: Partial<DetaineeFilter>) => {
    const updatedFilter = { ...currentFilter, ...newFilter, offset: 0 }
    setCurrentFilter(updatedFilter)
    if (currentQuery) {
      search(currentQuery, updatedFilter)
    }
  }

  const loadMore = async () => {
    if (loading || results.length >= totalCount) return

    setLoading(true)
    const nextOffset = currentFilter.offset + (currentFilter.limit || DEFAULT_FILTER.limit)
    
    try {
      const { data, error: searchError } = await supabase.functions.invoke('search-detainees', {
        body: {
          query: currentQuery,
          filter: { ...currentFilter, offset: nextOffset },
        },
      })

      if (searchError) {
        throw searchError
      }

      setResults([...results, ...(data.detainees || [])])
      setCurrentFilter({ ...currentFilter, offset: nextOffset })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more results'))
    } finally {
      setLoading(false)
    }
  }

  const hasMore = results.length < totalCount

  return {
    results,
    loading,
    error,
    totalCount,
    search,
    updateFilter,
    currentFilter,
    hasMore,
    loadMore,
  }
}
