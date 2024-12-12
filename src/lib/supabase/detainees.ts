import { supabase } from './client'
import type { Database } from './types'

type Detainee = Database['public']['Tables']['detainees']['Row']
type DetaineeInsert = Database['public']['Tables']['detainees']['Insert']
type DetaineeUpdate = Database['public']['Tables']['detainees']['Update']

export async function getDetainee(id: string) {
  const { data, error } = await supabase
    .from('detainees')
    .select('*, documents(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createDetainee(detainee: DetaineeInsert) {
  const { data, error } = await supabase
    .from('detainees')
    .insert(detainee)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDetainee(id: string, updates: DetaineeUpdate) {
  const { data, error } = await supabase
    .from('detainees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDetainee(id: string) {
  // First, delete all associated documents
  const { data: documents } = await supabase
    .from('documents')
    .select('file_path')
    .eq('detainee_id', id)

  if (documents?.length) {
    const filePaths = documents.map(doc => doc.file_path)
    await supabase.storage.from('documents').remove(filePaths)
    await supabase.from('documents').delete().eq('detainee_id', id)
  }

  // Then delete the detainee record
  const { error } = await supabase
    .from('detainees')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getDetainees(options: {
  page?: number
  limit?: number
  status?: Detainee['status']
  orderBy?: { column: keyof Detainee; direction: 'asc' | 'desc' }
}) {
  const {
    page = 1,
    limit = 10,
    status,
    orderBy = { column: 'created_at', direction: 'desc' }
  } = options

  let query = supabase
    .from('detainees')
    .select('*', { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }

  query = query
    .order(orderBy.column, { ascending: orderBy.direction === 'asc' })
    .range((page - 1) * limit, page * limit - 1)

  const { data, error, count } = await query

  if (error) throw error
  return { data, count }
}
