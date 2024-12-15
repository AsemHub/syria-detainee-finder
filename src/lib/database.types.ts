export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      detainees: {
        Row: {
          id: string
          full_name: string
          date_of_detention: string | null
          last_seen_location: string
          detention_facility: string | null
          physical_description: string | null
          age_at_detention: number | null
          gender: 'male' | 'female' | 'other'
          status: 'missing' | 'released' | 'deceased'
          last_update_date: string
          contact_info: string
          additional_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          date_of_detention?: string | null
          last_seen_location: string
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          gender: 'male' | 'female' | 'other'
          status: 'missing' | 'released' | 'deceased'
          last_update_date?: string
          contact_info: string
          additional_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          date_of_detention?: string | null
          last_seen_location?: string
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          gender?: 'male' | 'female' | 'other'
          status?: 'missing' | 'released' | 'deceased'
          last_update_date?: string
          contact_info?: string
          additional_notes?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          detainee_id: string
          file_url: string
          document_type: string | null
          submission_date: string | null
          description: string | null
          file_name: string
          file_size: number
          mime_type: string
          created_at: string | null
        }
        Insert: {
          id?: string
          detainee_id: string
          file_url: string
          document_type?: string | null
          submission_date?: string | null
          description?: string | null
          file_name: string
          file_size: number
          mime_type: string
          created_at?: string | null
        }
        Update: {
          id?: string
          detainee_id?: string
          file_url?: string
          document_type?: string | null
          submission_date?: string | null
          description?: string | null
          file_name?: string
          file_size?: number
          mime_type?: string
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_detainees: {
        Args: {
          search_text?: string | null
          detention_start_date?: string | null
          detention_end_date?: string | null
          detainee_status?: 'missing' | 'released' | 'deceased' | null
          location?: string | null
          gender_filter?: 'male' | 'female' | 'other' | null
          age_min?: number | null
          age_max?: number | null
        }
        Returns: {
          id: string
          full_name: string
          date_of_detention: string | null
          last_seen_location: string
          detention_facility: string | null
          status: 'missing' | 'released' | 'deceased'
          gender: 'male' | 'female' | 'other'
          age_at_detention: number | null
          last_update_date: string
          search_rank: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
