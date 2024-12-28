export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DetaineeStatus = 'in_custody' | 'missing' | 'released' | 'deceased' | 'unknown';
export type DetaineeGender = 'male' | 'female' | 'unknown';
export type DocumentCategory = 'identification' | 'detention_record' | 'witness_statement' | 'medical_record' | 'legal_document' | 'photo' | 'correspondence' | 'other';
export type DocumentType = 'csv_upload' | 'supporting_document' | 'media';
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'requires_review';
export type AccessLevel = 'public' | 'restricted' | 'confidential' | 'private';
export type RelationType = 'supersedes' | 'supplements' | 'contradicts' | 'confirms' | 'related_to' | 'CSV_UPLOAD';

export interface SearchParams {
  query: string;
  pageSize?: number;
  pageNumber?: number;
  estimateTotal?: boolean;
  detentionStatus?: DetaineeStatus;
  gender?: DetaineeGender;
  ageMin?: number;
  ageMax?: number;
  location?: string;
  facility?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchResult {
  id: string;
  full_name: string;
  original_name: string | null;
  date_of_detention: string | null;
  last_seen_location: string | null;
  detention_facility: string | null;
  physical_description: string | null;
  age_at_detention: number | null;
  gender: DetaineeGender;
  status: DetaineeStatus;
  contact_info: string | null;
  additional_notes: string | null;
  created_at: string;
  last_update_date: string;
  source_organization: string;
  search_rank?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
}

export interface Database {
  public: {
    Tables: {
      detainees: {
        Row: {
          id: string;
          full_name: string;
          original_name: string | null;
          normalized_name: string | null;
          date_of_detention: string | null;
          effective_date: string | null;
          last_seen_location: string | null;
          detention_facility: string | null;
          physical_description: string | null;
          age_at_detention: number | null;
          gender: DetaineeGender;
          gender_terms: string | null;
          status: DetaineeStatus;
          last_update_date: string;
          contact_info: string | null;
          additional_notes: string | null;
          created_at: string;
          source_organization: string;
          source_document_id: string | null;
          organization: string | null;
          original_organization: string | null;
          upload_session_id: string | null;
          name_fts: unknown | null;
          location_fts: unknown | null;
          description_fts: unknown | null;
          contact_fts: unknown | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          original_name?: string | null;
          normalized_name?: string | null;
          date_of_detention?: string | null;
          effective_date?: string | null;
          last_seen_location?: string | null;
          detention_facility?: string | null;
          physical_description?: string | null;
          age_at_detention?: number | null;
          gender?: DetaineeGender;
          gender_terms?: string | null;
          status?: DetaineeStatus;
          last_update_date?: string;
          contact_info?: string | null;
          additional_notes?: string | null;
          created_at?: string;
          source_organization?: string;
          source_document_id?: string | null;
          organization?: string | null;
          original_organization?: string | null;
          upload_session_id?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          original_name?: string | null;
          normalized_name?: string | null;
          date_of_detention?: string | null;
          effective_date?: string | null;
          last_seen_location?: string | null;
          detention_facility?: string | null;
          physical_description?: string | null;
          age_at_detention?: number | null;
          gender?: DetaineeGender;
          gender_terms?: string | null;
          status?: DetaineeStatus;
          last_update_date?: string;
          contact_info?: string | null;
          additional_notes?: string | null;
          created_at?: string;
          source_organization?: string;
          source_document_id?: string | null;
          organization?: string | null;
          original_organization?: string | null;
          upload_session_id?: string | null;
        };
      };
      csv_upload_records: {
        Row: {
          id: string;
          session_id: string;
          detainee_id: string;
          row_number: number;
          original_data: Json;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          detainee_id: string;
          row_number: number;
          original_data: Json;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          detainee_id?: string;
          row_number?: number;
          original_data?: Json;
          created_at?: string | null;
        };
      };
      upload_sessions: {
        Row: {
          id: string;
          file_name: string;
          file_url: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          organization: string;
          total_records: number | null;
          processed_records: number | null;
          skipped_duplicates: number | null;
          status: UploadStatus;
          error_message: string | null;
          processing_details: Json | null;
          created_at: string;
          last_update: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          file_url: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          organization: string;
          total_records?: number | null;
          processed_records?: number | null;
          skipped_duplicates?: number | null;
          status?: UploadStatus;
          error_message?: string | null;
          processing_details?: Json | null;
          created_at?: string;
          last_update?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          file_url?: string;
          file_size?: number;
          mime_type?: string;
          uploaded_by?: string;
          organization?: string;
          total_records?: number | null;
          processed_records?: number | null;
          skipped_duplicates?: number | null;
          status?: UploadStatus;
          error_message?: string | null;
          processing_details?: Json | null;
          created_at?: string;
          last_update?: string;
        };
      };
    };
    Functions: {
      check_detainee_duplicate: {
        Args: {
          p_name: string;
          p_organization: string;
        };
        Returns: {
          id: string;
          full_name: string;
          original_name: string;
          normalized_match: boolean;
        }[];
      };
      search_detainees_enhanced: {
        Args: {
          search_params: Json;
        };
        Returns: Json;
      };
    };
  };
}

export type CsvUploadSession = Database['public']['Tables']['upload_sessions']['Row'];
export type CsvUploadRecord = Database['public']['Tables']['csv_upload_records']['Row'];
