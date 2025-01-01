export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DetaineeStatus = 'معتقل' | 'مفقود' | 'مطلق سراح' | 'متوفى' | 'غير معروف';
export type DetaineeGender = 'ذكر' | 'أنثى' | 'غير معروف';
export type DocumentCategory = 'identification' | 'detention_record' | 'witness_statement' | 'medical_record' | 'legal_document' | 'photo' | 'correspondence' | 'other';
export type DocumentType = 'csv_upload' | 'supporting_document' | 'media';
export type UploadStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
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
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string | null;
          organization: string;
          total_records: number | null;
          processed_records: number | null;
          valid_records: number | null;
          invalid_records: number | null;
          duplicate_records: number | null;
          skipped_duplicates: number | null;
          status: UploadStatus;
          error_message: string | null;
          errors: { record: string; errors: { message: string; type: string; }[]; }[] | null;
          processing_details: {
            current_index?: number;
            current_name?: string;
            total?: number;
          } | null;
          created_at?: string;
          updated_at?: string;
          last_update?: string;
          current_record?: string | null;
          failed_records?: any[] | null;
          completed_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['upload_sessions']['Row'], 'id' | 'created_at' | 'updated_at' | 'last_update'>;
        Update: Partial<Database['public']['Tables']['upload_sessions']['Row']>;
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

export type ErrorType = 'duplicate' | 'invalid_date' | 'missing_required' | 'invalid_age' | 'invalid_gender' | 'invalid_status' | 'invalid_data' | 'error';

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
