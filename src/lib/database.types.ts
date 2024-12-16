export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DetaineeStatus = 'detained' | 'released' | 'deceased' | 'unknown';
export type DetaineeGender = 'male' | 'female' | 'unknown';

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
          status: DetaineeStatus
          gender: DetaineeGender
          notes: string | null
          created_at: string
          updated_at: string
          search_rank?: number
        }
        Insert: {
          id?: string
          full_name: string
          date_of_detention?: string | null
          last_seen_location: string
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          status?: DetaineeStatus
          gender?: DetaineeGender
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          date_of_detention?: string | null
          last_seen_location?: string
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          status?: DetaineeStatus
          gender?: DetaineeGender
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          detainee_id: string
          file_url: string
          document_type: string
          submission_date: string
          description: string | null
          file_name: string
          created_at: string
        }
        Insert: {
          id?: string
          detainee_id: string
          file_url: string
          document_type: string
          submission_date?: string
          description?: string | null
          file_name: string
          created_at?: string
        }
        Update: {
          id?: string
          detainee_id?: string
          file_url?: string
          document_type?: string
          submission_date?: string
          description?: string | null
          file_name?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_detainees: {
        Args: {
          search_query?: string | null
          status_filter?: DetaineeStatus | null
          gender_filter?: DetaineeGender | null
          age_min?: number | null
          age_max?: number | null
          location_filter?: string | null
        }
        Returns: {
          id: string
          full_name: string
          date_of_detention: string | null
          last_seen_location: string
          detention_facility: string | null
          physical_description: string | null
          age_at_detention: number | null
          status: DetaineeStatus
          gender: DetaineeGender
          notes: string | null
          created_at: string
          updated_at: string
          search_rank: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
