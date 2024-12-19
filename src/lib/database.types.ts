export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DetaineeStatus = 'in_custody' | 'missing' | 'released' | 'deceased' | 'unknown';
export type DetaineeGender = 'male' | 'female' | 'unknown';
export type CsvUploadStatus = 'processing' | 'completed' | 'failed';

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
          gender: DetaineeGender
          status: DetaineeStatus
          last_update_date: string
          contact_info: string
          additional_notes: string | null
          created_at: string
          search_vector: unknown | null
          source_organization: string
          source_document_id: string | null
        }
        Insert: {
          id?: string
          full_name: string
          date_of_detention?: string | null
          last_seen_location: string
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          gender?: DetaineeGender
          status?: DetaineeStatus
          last_update_date?: string
          contact_info: string
          additional_notes?: string | null
          created_at?: string
          search_vector?: unknown | null
          source_organization?: string
          source_document_id?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          date_of_detention?: string | null
          last_seen_location?: string
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          gender?: DetaineeGender
          status?: DetaineeStatus
          last_update_date?: string
          contact_info?: string
          additional_notes?: string | null
          created_at?: string
          search_vector?: unknown | null
          source_organization?: string
          source_document_id?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          file_name: string
          file_path: string
          uploaded_by: string
          uploaded_at: string
          total_records: number
          processed_records: number
          skipped_duplicates: number
          status: 'processing' | 'completed' | 'failed'
          error_message: string | null
          processing_details: Json
          created_at: string
          updated_at: string
          upload_session_id: string | null
          is_csv_upload: boolean
        }
        Insert: {
          id?: string
          file_name: string
          file_path: string
          uploaded_by: string
          uploaded_at?: string
          total_records?: number
          processed_records?: number
          skipped_duplicates?: number
          status?: 'processing' | 'completed' | 'failed'
          error_message?: string | null
          processing_details?: Json
          created_at?: string
          updated_at?: string
          upload_session_id?: string | null
          is_csv_upload?: boolean
        }
        Update: {
          id?: string
          file_name?: string
          file_path?: string
          uploaded_by?: string
          uploaded_at?: string
          total_records?: number
          processed_records?: number
          skipped_duplicates?: number
          status?: 'processing' | 'completed' | 'failed'
          error_message?: string | null
          processing_details?: Json
          created_at?: string
          updated_at?: string
          upload_session_id?: string | null
          is_csv_upload?: boolean
        }
      }
      upload_sessions: {
        Row: {
          id: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          uploaded_by: string
          total_records: number
          processed_records: number
          skipped_duplicates: number
          status: 'processing' | 'completed' | 'failed'
          error_message: string | null
          processing_details: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          uploaded_by: string
          total_records?: number
          processed_records?: number
          skipped_duplicates?: number
          status?: 'processing' | 'completed' | 'failed'
          error_message?: string | null
          processing_details?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          mime_type?: string
          uploaded_by?: string
          total_records?: number
          processed_records?: number
          skipped_duplicates?: number
          status?: 'processing' | 'completed' | 'failed'
          error_message?: string | null
          processing_details?: Json
          created_at?: string
          updated_at?: string
        }
      }
      csv_upload_records: {
        Row: {
          id: string
          session_id: string
          detainee_id: string
          row_number: number
          original_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          detainee_id: string
          row_number: number
          original_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          detainee_id?: string
          row_number?: number
          original_data?: Json
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
