import { supabase } from '@/lib/supabase/client'
import {
  DetaineeHistory,
  DetaineeHistoryInsert,
  HistoryEntry,
  HistoryFilter,
  HistoryDiff
} from '@/lib/types/history'
import { Detainee } from '@/lib/types/detainees'

/**
 * Creates a history entry for a detainee change
 */
export async function createHistoryEntry(
  entry: HistoryEntry
): Promise<DetaineeHistory> {
  const { detaineeId, changedBy, changeType, previousData, newData } = entry

  const historyData: DetaineeHistoryInsert = {
    detainee_id: detaineeId,
    changed_by: changedBy,
    change_type: changeType,
    previous_data: previousData || null,
    new_data: newData || null
  }

  const { data: history, error } = await supabase
    .from('detainee_history')
    .insert(historyData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create history entry: ${error.message}`)
  }

  return history
}

/**
 * Retrieves history entries based on filter criteria
 */
export async function getHistoryEntries(
  filter: HistoryFilter
): Promise<DetaineeHistory[]> {
  const {
    detaineeId,
    changedBy,
    changeType,
    startDate,
    endDate,
    limit = 50
  } = filter

  let query = supabase
    .from('detainee_history')
    .select(`
      *,
      changed_by (
        id,
        email
      )
    `)
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (detaineeId) {
    query = query.eq('detainee_id', detaineeId)
  }
  if (changedBy) {
    query = query.eq('changed_by', changedBy)
  }
  if (changeType) {
    query = query.eq('change_type', changeType)
  }
  if (startDate) {
    query = query.gte('changed_at', startDate.toISOString())
  }
  if (endDate) {
    query = query.lte('changed_at', endDate.toISOString())
  }

  const { data: history, error } = await query

  if (error) {
    throw new Error(`Failed to fetch history entries: ${error.message}`)
  }

  return history
}

/**
 * Compares two detainee records and returns the differences
 */
export function compareDetaineeRecords(
  oldRecord?: Partial<Detainee>,
  newRecord?: Partial<Detainee>
): HistoryDiff[] {
  if (!oldRecord || !newRecord) return []

  const diffs: HistoryDiff[] = []
  const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])

  for (const key of allKeys) {
    const oldValue = oldRecord[key as keyof Detainee]
    const newValue = newRecord[key as keyof Detainee]

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({
        field: key,
        oldValue,
        newValue
      })
    }
  }

  return diffs
}

/**
 * Creates a history entry for a detainee update
 */
export async function recordDetaineeUpdate(
  detaineeId: string,
  changedBy: string,
  oldData: Partial<Detainee>,
  newData: Partial<Detainee>
): Promise<DetaineeHistory> {
  // Only create history entry if there are actual changes
  const diffs = compareDetaineeRecords(oldData, newData)
  if (diffs.length === 0) {
    throw new Error('No changes detected')
  }

  return createHistoryEntry({
    detaineeId,
    changedBy,
    changeType: 'update',
    previousData: oldData,
    newData: newData
  })
}

/**
 * Records verification of a detainee
 */
export async function recordDetaineeVerification(
  detaineeId: string,
  verifiedBy: string
): Promise<DetaineeHistory> {
  // Get current detainee data
  const { data: detainee, error: fetchError } = await supabase
    .from('detainees')
    .select()
    .eq('id', detaineeId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch detainee: ${fetchError.message}`)
  }

  const newData = {
    ...detainee,
    verified: true,
    verified_at: new Date().toISOString(),
    verified_by: verifiedBy
  }

  return createHistoryEntry({
    detaineeId,
    changedBy: verifiedBy,
    changeType: 'verify',
    previousData: detainee,
    newData: newData
  })
}

/**
 * Records deletion of a detainee
 */
export async function recordDetaineeDeletion(
  detaineeId: string,
  deletedBy: string,
  detaineeData: Detainee
): Promise<DetaineeHistory> {
  return createHistoryEntry({
    detaineeId,
    changedBy: deletedBy,
    changeType: 'delete',
    previousData: detaineeData,
    newData: undefined
  })
}
