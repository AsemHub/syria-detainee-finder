export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DetaineeStatus = 'معتقل' | 'مفقود' | 'مغيب قسراً' | 'مطلق سراح' | 'متوفى' | 'غير معروف';
export type DetaineeGender = 'ذكر' | 'أنثى' | 'غير معروف';
export type DocumentCategory = 'identification' | 'detention_record' | 'witness_statement' | 'medical_record' | 'legal_document' | 'photo' | 'correspondence' | 'other';
export type DocumentType = 'csv_upload' | 'supporting_document' | 'media';
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'idle';
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

export interface UpdateHistoryEntry {
  timestamp: string;
  previous_values: {
    contact_info?: string;
    additional_notes?: string;
  };
  update_reason: string;
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
  update_history?: UpdateHistoryEntry[];
  last_update_by?: string;
  last_update_reason?: string;
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
      processing_queue: {
        Row: {
          id: string;
          session_id: string;
          file_path: string;
          status: UploadStatus;
          priority: number;
          attempts: number;
          max_attempts: number;
          error_message: string | null;
          processing_details: Record<string, any> | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          last_attempt_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          file_path: string;
          status?: UploadStatus;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          error_message?: string | null;
          processing_details?: Record<string, any> | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          last_attempt_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          file_path?: string;
          status?: UploadStatus;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          error_message?: string | null;
          processing_details?: Record<string, any> | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          last_attempt_at?: string | null;
        };
      };
      detainees: {
        Row: SearchResult;
        Insert: Omit<SearchResult, 'id' | 'created_at' | 'search_rank'>;
        Update: Partial<Omit<SearchResult, 'id' | 'created_at' | 'search_rank'>>;
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
          file_url: string | null;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          organization: string;
          total_records: number;
          processed_records: number;
          valid_records: number;
          invalid_records: number;
          duplicate_records: number;
          skipped_duplicates: number;
          status: UploadStatus;
          error_message: string | null;
          errors: Json | null;
          processing_details: Json | null;
          created_at: string;
          updated_at: string;
          last_update: string | null;
          current_record: string | null;
          failed_records: Json | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          file_name: string;
          file_url?: string | null;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          organization: string;
          total_records?: number;
          processed_records?: number;
          valid_records?: number;
          invalid_records?: number;
          duplicate_records?: number;
          skipped_duplicates?: number;
          status: UploadStatus;
          error_message?: string | null;
          errors?: Json | null;
          processing_details?: Json | null;
          created_at?: string;
          updated_at?: string;
          last_update?: string | null;
          current_record?: string | null;
          failed_records?: Json | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          file_name?: string;
          file_url?: string | null;
          file_size?: number;
          mime_type?: string;
          uploaded_by?: string;
          organization?: string;
          total_records?: number;
          processed_records?: number;
          valid_records?: number;
          invalid_records?: number;
          duplicate_records?: number;
          skipped_duplicates?: number;
          status?: UploadStatus;
          error_message?: string | null;
          errors?: Json | null;
          processing_details?: Json | null;
          created_at?: string;
          updated_at?: string;
          last_update?: string | null;
          current_record?: string | null;
          failed_records?: Json | null;
          completed_at?: string | null;
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

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ErrorType = 
  | 'validation' 
  | 'missing_required' 
  | 'invalid_age' 
  | 'invalid_gender' 
  | 'invalid_status' 
  | 'duplicate' 
  | 'invalid_data';

export interface ValidationError {
  type: ErrorType;
  message: string;
}

export interface UploadError {
  record?: string;
  errors: ValidationError[];
}

export interface UploadStats {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
}

export type CsvUploadSession = Database['public']['Tables']['upload_sessions']['Row'];
export type CsvUploadRecord = Database['public']['Tables']['csv_upload_records']['Row'];
export type Detainee = Database['public']['Tables']['detainees']['Row'];
export type DetaineeInsert = Database['public']['Tables']['detainees']['Insert'];
export type DetaineeUpdate = Database['public']['Tables']['detainees']['Update'];
