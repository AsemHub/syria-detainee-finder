import { useCallback, useEffect, useState } from 'react'
import { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Tables = Database['public']['Tables']
export type TableName = keyof Tables

type UseSupabaseQueryOptions<T extends TableName> = {
  table: T
  select?: string
  filter?: {
    column: keyof Tables[T]['Row']
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike'
    value: any
  }[]
  orderBy?: {
    column: keyof Tables[T]['Row']
    ascending?: boolean
  }
  limit?: number
  page?: number
  dependencies?: any[]
}

export function useSupabaseQuery<T extends TableName>({
  table,
  select = '*',
  filter = [],
  orderBy,
  limit,
  page = 1,
  dependencies = []
}: UseSupabaseQueryOptions<T>) {
  const [data, setData] = useState<Tables[T]['Row'][] | null>(null)
  const [error, setError] = useState<PostgrestError | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [count, setCount] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Start the query
      let query = supabase.from(table).select(select, { count: 'exact' })

      // Apply filters
      filter.forEach(({ column, operator, value }) => {
        switch (operator) {
          case 'eq':
            query = query.eq(column as string, value)
            break
          case 'neq':
            query = query.neq(column as string, value)
            break
          case 'gt':
            query = query.gt(column as string, value)
            break
          case 'gte':
            query = query.gte(column as string, value)
            break
          case 'lt':
            query = query.lt(column as string, value)
            break
          case 'lte':
            query = query.lte(column as string, value)
            break
          case 'like':
            query = query.like(column as string, value)
            break
          case 'ilike':
            query = query.ilike(column as string, value)
            break
        }
      })

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column as string, {
          ascending: orderBy.ascending ?? true
        })
      }

      // Apply pagination
      if (limit) {
        query = query.range((page - 1) * limit, page * limit - 1)
      }

      const { data: result, error: queryError, count: totalCount } = await query

      if (queryError) {
        throw queryError
      }

      setData(result)
      setCount(totalCount)
      setError(null)
    } catch (err) {
      setError(err as PostgrestError)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [table, select, filter, orderBy, limit, page, ...dependencies])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    error,
    isLoading,
    count,
    refetch: fetchData
  }
}
