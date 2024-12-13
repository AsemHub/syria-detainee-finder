import { supabase } from './client'
import type { Database } from './types'

type DetaineeHistory = Database['public']['Tables']['detainee_history']['Row']
type DetaineeHistoryInsert = Database['public']['Tables']['detainee_history']['Insert']

export async function createHistoryEntry(entry: DetaineeHistoryInsert) {
  const { data, error } = await supabase
    .from('detainee_history')
    .insert(entry)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getDetaineeHistory(detaineeId: string, options: {
  page?: number
  limit?: number
  orderBy?: { column: keyof DetaineeHistory; direction: 'asc' | 'desc' }
} = {}) {
  const {
    page = 1,
    limit = 10,
    orderBy = { column: 'created_at', direction: 'desc' }
  } = options

  const { data, error, count } = await supabase
    .from('detainee_history')
    .select('*', { count: 'exact' })
    .eq('detainee_id', detaineeId)
    .order(orderBy.column, { ascending: orderBy.direction === 'asc' })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error
  return { data, count }
}

export async function getLatestHistoryEntry(detaineeId: string) {
  const { data, error } = await supabase
    .from('detainee_history')
    .select('*')
    .eq('detainee_id', detaineeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data
}
