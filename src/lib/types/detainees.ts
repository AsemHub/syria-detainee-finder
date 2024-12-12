import { Database } from '@/lib/supabase/types'

export type Detainee = Database['public']['Tables']['detainees']['Row']
export type DetaineeInsert = Database['public']['Tables']['detainees']['Insert']
export type DetaineeUpdate = Database['public']['Tables']['detainees']['Update']

export type DetaineeStatus = 'detained' | 'released' | 'deceased' | 'unknown'
export type Gender = 'male' | 'female' | 'other'

export interface DetaineeFilter {
  fullNameAr?: string
  fullNameEn?: string
  status?: DetaineeStatus
  gender?: Gender
  nationality?: string
  verified?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface DetaineeSearchResult {
  detainee: Detainee
  similarity: number
  matchedField: string
}

export interface DetaineeWithDocuments extends Detainee {
  documents: {
    id: string
    documentType: string
    fileName: string
    verified: boolean
  }[]
}
