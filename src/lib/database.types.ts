export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DetaineeStatus = 'in_custody' | 'missing' | 'released' | 'deceased' | 'unknown';
export type DetaineeGender = 'male' | 'female' | 'unknown';
export type CsvUploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Database {
  public: {
    Tables: {
      detainees: {
        Row: {
          id: string
          full_name: string
          original_name: string | null
          normalized_name: string | null
          date_of_detention: string | null
          effective_date: string | null
          last_seen_location: string | null
          detention_facility: string | null
          physical_description: string | null
          age_at_detention: number | null
          gender: DetaineeGender
          gender_terms: string | null
          status: DetaineeStatus
          last_update_date: string
          contact_info: string | null
          additional_notes: string | null
          created_at: string
          source_organization: string
          source_document_id: string | null
          organization: string | null
          original_organization: string | null
          upload_session_id: string | null
          search_vector: unknown | null
          name_fts: unknown | null
          location_fts: unknown | null
          description_fts: unknown | null
          contact_fts: unknown | null
        }
        Insert: {
          id?: string
          full_name: string
          original_name?: string | null
          normalized_name?: string | null
          date_of_detention?: string | null
          effective_date?: string | null
          last_seen_location?: string | null
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          gender?: DetaineeGender
          gender_terms?: string | null
          status?: DetaineeStatus
          last_update_date?: string
          contact_info?: string | null
          additional_notes?: string | null
          created_at?: string
          source_organization?: string
          source_document_id?: string | null
          organization?: string | null
          original_organization?: string | null
          upload_session_id?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          original_name?: string | null
          normalized_name?: string | null
          date_of_detention?: string | null
          effective_date?: string | null
          last_seen_location?: string | null
          detention_facility?: string | null
          physical_description?: string | null
          age_at_detention?: number | null
          gender?: DetaineeGender
          gender_terms?: string | null
          status?: DetaineeStatus
          last_update_date?: string
          contact_info?: string | null
          additional_notes?: string | null
          created_at?: string
          source_organization?: string
          source_document_id?: string | null
          organization?: string | null
          original_organization?: string | null
          upload_session_id?: string | null
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
          status: CsvUploadStatus
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
          status?: CsvUploadStatus
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
          status?: CsvUploadStatus
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
          file_url: string | null
          file_size: number | null
          mime_type: string | null
          uploaded_by: string
          total_records: number
          processed_records: number
          skipped_duplicates: number
          valid_records: number
          invalid_records: number
          duplicate_records: number
          status: CsvUploadStatus
          error_message: string | null
          errors: Json
          failed_records: Json | null
          processing_details: Json
          created_at: string
          updated_at: string
          last_update: string
          completed_at: string | null
          organization: string
          current_record: string | null
        }
        Insert: {
          id?: string
          file_name: string
          file_url?: string | null
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string
          total_records?: number
          processed_records?: number
          skipped_duplicates?: number
          valid_records?: number
          invalid_records?: number
          duplicate_records?: number
          status?: CsvUploadStatus
          error_message?: string | null
          errors?: Json
          failed_records?: Json | null
          processing_details?: Json
          created_at?: string
          updated_at?: string
          last_update?: string
          completed_at?: string | null
          organization: string
          current_record?: string | null
        }
        Update: {
          id?: string
          file_name?: string
          file_url?: string | null
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string
          total_records?: number
          processed_records?: number
          skipped_duplicates?: number
          valid_records?: number
          invalid_records?: number
          duplicate_records?: number
          status?: CsvUploadStatus
          error_message?: string | null
          errors?: Json
          failed_records?: Json | null
          processing_details?: Json
          created_at?: string
          updated_at?: string
          last_update?: string
          completed_at?: string | null
          organization?: string
          current_record?: string | null
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
      search_detainees_enhanced: {
        Args: {
          search_params: {
            query: string;
            page_size?: number;
            page_number?: number;
            sort_ascending?: boolean;
            estimate_total?: boolean;
          }
        }
        Returns: Json
      }
      get_detainee_documents: {
        Args: {
          detainee_uuid: string
        }
        Returns: {
          id: string
          detainee_id: string
          file_url: string
          document_type: string
          submission_date: string
          description: string | null
          file_name: string
          created_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
