import { supabase } from './client'
import type { Database } from './types'

type Submission = Database['public']['Tables']['submissions']['Row']
type SubmissionInsert = Database['public']['Tables']['submissions']['Insert']
type SubmissionUpdate = Database['public']['Tables']['submissions']['Update']
type DetaineeInsert = Database['public']['Tables']['detainees']['Insert']

export async function createSubmission(submission: SubmissionInsert) {
  const { data, error } = await supabase
    .from('submissions')
    .insert(submission)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSubmission(id: string, updates: SubmissionUpdate) {
  const { data, error } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSubmission(id: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, documents(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getSubmissions(options: {
  page?: number
  limit?: number
  status?: Submission['status']
  orderBy?: { column: keyof Submission; direction: 'asc' | 'desc' }
}) {
  const {
    page = 1,
    limit = 10,
    status,
    orderBy = { column: 'created_at', direction: 'desc' }
  } = options

  let query = supabase
    .from('submissions')
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

export async function verifySubmission(
  id: string, 
  verifierUserId: string, 
  approved: boolean,
  detaineeData: DetaineeInsert
) {
  const updates: SubmissionUpdate = {
    status: approved ? 'verified' : 'rejected',
    verification_date: new Date().toISOString(),
    verification_notes: approved ? 'Submission approved' : 'Submission rejected'
  }

  const { data: submission, error: updateError } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) throw updateError

  if (approved && submission) {
    // Create or update detainee record with the provided data
    const { error: detaineeError } = await supabase
      .from('detainees')
      .upsert({
        ...detaineeData,
        verified_at: new Date().toISOString(),
        verified_by: verifierUserId
      })
      .eq('id', submission.detainee_id || '')

    if (detaineeError) throw detaineeError
  }

  return submission
}
