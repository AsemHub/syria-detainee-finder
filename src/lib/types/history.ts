import { Database } from '@/lib/supabase/types'
import { Detainee } from './detainees'

export type DetaineeHistory = Database['public']['Tables']['detainee_history']['Row']
export type DetaineeHistoryInsert = Database['public']['Tables']['detainee_history']['Insert']
export type DetaineeHistoryUpdate = Database['public']['Tables']['detainee_history']['Update']

export type ChangeType = 'create' | 'update' | 'delete' | 'verify'

export interface HistoryEntry {
  detaineeId: string
  changedBy: string
  changeType: ChangeType
  previousData?: Partial<Detainee>
  newData?: Partial<Detainee>
}

export interface HistoryFilter {
  detaineeId?: string
  changedBy?: string
  changeType?: ChangeType
  startDate?: Date
  endDate?: Date
  limit?: number
}

export interface HistoryDiff {
  field: string
  oldValue: any
  newValue: any
}
