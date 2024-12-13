import type { Database } from '@/lib/supabase/types'

type Detainee = Database['public']['Tables']['detainees']['Row']

export type DetaineeFormData = {
  // Basic Information
  full_name_ar: string
  full_name_en?: string
  date_of_birth?: string
  place_of_birth_ar?: string
  place_of_birth_en?: string
  gender: 'male' | 'female' | 'other'
  nationality?: string

  // Detention Information
  detention_date?: string
  detention_location_ar?: string
  detention_location_en?: string
  last_seen_date?: string
  last_seen_location_ar?: string
  last_seen_location_en?: string

  // Additional Information
  additional_info_ar?: string
  additional_info_en?: string

  // Status
  status?: Detainee['status']
}

export type DetaineeSubmissionFormData = DetaineeFormData & {
  // Submitter Information
  submitter_name: string
  submitter_email?: string
  submitter_phone?: string
  relationship_to_detainee?: string
  submission_type: 'individual' | 'bulk'
}
