import { useState } from 'react'
import { PostgrestError, PostgrestFilterBuilder } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Tables = Database['public']['Tables']
export type TableName = keyof Tables

type MutationType = 'insert' | 'update' | 'upsert' | 'delete'

type UseSupabaseMutationOptions<T extends TableName> = {
  table: T
  type: MutationType
  onSuccess?: (data: Tables[T]['Row']) => void
  onError?: (error: PostgrestError) => void
}

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'

type MutationData<T extends TableName, M extends MutationType> = 
  M extends 'insert' ? Tables[T]['Insert'] :
  M extends 'update' ? Tables[T]['Update'] :
  M extends 'upsert' ? Tables[T]['Insert'] :
  never

export function useSupabaseMutation<T extends TableName, M extends MutationType>({
  table,
  type,
  onSuccess,
  onError
}: UseSupabaseMutationOptions<T>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const mutate = async (
    data: MutationData<T, M>,
    options?: {
      filter?: {
        column: keyof Tables[T]['Row']
        operator: FilterOperator
        value: any
      }[]
    }
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase.from(table)

      switch (type) {
        case 'insert': {
          const insertQuery = query.insert(data as Tables[T]['Insert'])
          query = insertQuery as unknown as typeof query
          break
        }
        case 'update': {
          let updateQuery = query.update(data as Tables[T]['Update'])
          if (options?.filter) {
            options.filter.forEach(({ column, operator, value }) => {
              updateQuery = applyFilter(updateQuery, column as string, operator, value)
            })
          }
          query = updateQuery as unknown as typeof query
          break
        }
        case 'upsert': {
          const upsertQuery = query.upsert(data as Tables[T]['Insert'])
          query = upsertQuery as unknown as typeof query
          break
        }
        case 'delete': {
          let deleteQuery = query.delete()
          if (options?.filter) {
            options.filter.forEach(({ column, operator, value }) => {
              deleteQuery = applyFilter(deleteQuery, column as string, operator, value)
            })
          }
          query = deleteQuery as unknown as typeof query
          break
        }
      }

      const { data: result, error: mutationError } = await query.select().single()

      if (mutationError) {
        throw mutationError
      }

      onSuccess?.(result)
      return result
    } catch (err) {
      const postgrestError = err as PostgrestError
      setError(postgrestError)
      onError?.(postgrestError)
      throw postgrestError
    } finally {
      setIsLoading(false)
    }
  }

  return {
    mutate,
    isLoading,
    error
  }
}

function applyFilter<T>(
  query: PostgrestFilterBuilder<any>,
  column: string,
  operator: FilterOperator,
  value: any
): PostgrestFilterBuilder<T> {
  switch (operator) {
    case 'eq':
      return query.eq(column, value)
    case 'neq':
      return query.neq(column, value)
    case 'gt':
      return query.gt(column, value)
    case 'gte':
      return query.gte(column, value)
    case 'lt':
      return query.lt(column, value)
    case 'lte':
      return query.lte(column, value)
  }
}
