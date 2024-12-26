export type DetaineeStatus = 'in_custody' | 'missing' | 'released' | 'deceased' | 'unknown' | 'detained';
export type DetaineeGender = 'male' | 'female' | 'unknown';

export interface Detainee {
  id?: string;
  full_name: string;
  date_of_detention?: string | null;
  last_seen_location: string;
  detention_facility?: string | null;
  physical_description?: string | null;
  age_at_detention?: number | null;
  gender: DetaineeGender;
  status: DetaineeStatus;
  contact_info: string;
  additional_notes?: string | null;
  created_at?: string;
  last_update_date?: string;
  search_vector?: any;
  notes?: string | null;
  updated_at?: string;
}

export interface DetaineeMatch extends Detainee {
  search_rank?: number;
}

export interface Database {
  public: {
    Tables: {
      detainees: {
        Row: DetaineeMatch;
        Insert: Detainee;
        Update: Partial<Detainee>;
      };
      documents: {
        Row: {
          id: string;
          detainee_id: string;
          file_url: string;
          document_type: string;
          submission_date: string;
          description: string | null;
          file_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          detainee_id: string;
          file_url: string;
          document_type: string;
          submission_date?: string;
          description?: string | null;
          file_name: string;
          created_at?: string;
        };
        Update: Partial<{
          detainee_id: string;
          file_url: string;
          document_type: string;
          submission_date: string;
          description: string | null;
          file_name: string;
          created_at: string;
        }>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_detainees: {
        Args: {
          search_query?: string | null;
          status_filter?: DetaineeStatus | null;
          gender_filter?: DetaineeGender | null;
          age_min?: number | null;
          age_max?: number | null;
          location_filter?: string | null;
        };
        Returns: DetaineeMatch[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
