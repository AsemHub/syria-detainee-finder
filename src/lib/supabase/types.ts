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
          full_name_ar: string
          full_name_ar_normalized: string | null
          full_name_en: string | null
          date_of_birth: string | null
          place_of_birth_ar: string | null
          place_of_birth_ar_normalized: string | null
          place_of_birth_en: string | null
          gender: 'male' | 'female' | 'other'
          nationality: string | null
          detention_date: string | null
          detention_location_ar: string | null
          detention_location_ar_normalized: string | null
          detention_location_en: string | null
          last_seen_date: string | null
          last_seen_location_ar: string | null
          last_seen_location_ar_normalized: string | null
          last_seen_location_en: string | null
          status: 'detained' | 'released' | 'deceased' | 'unknown'
          additional_info_ar: string | null
          additional_info_en: string | null
          created_at: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['detainees']['Row'], 
          'id' | 'created_at' | 'updated_at' | 'verified' | 
          'full_name_ar_normalized' | 'place_of_birth_ar_normalized' | 
          'detention_location_ar_normalized' | 'last_seen_location_ar_normalized'>
        Update: Partial<Database['public']['Tables']['detainees']['Insert']>
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          role: 'admin' | 'verifier' | 'staff' | 'public'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      submissions: {
        Row: {
          id: string
          detainee_id: string | null
          submitter_name: string | null
          submitter_email: string | null
          submitter_phone: string | null
          relationship_to_detainee: string | null
          submission_type: 'individual' | 'bulk'
          status: 'pending' | 'verified' | 'rejected'
          created_at: string
          verification_date: string | null
          verification_notes: string | null
          ip_address: string | null
          recaptcha_score: number | null
        }
        Insert: Omit<Database['public']['Tables']['submissions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>
      }
      documents: {
        Row: {
          id: string
          detainee_id: string | null
          document_type: 'id' | 'photo' | 'report' | 'other'
          file_path: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          uploaded_at: string
          verified: boolean
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'uploaded_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      detainee_history: {
        Row: {
          id: string
          detainee_id: string
          changed_by: string | null
          changed_at: string
          previous_data: Json | null
          new_data: Json | null
          change_type: 'create' | 'update' | 'delete' | 'verify'
        }
        Insert: Omit<Database['public']['Tables']['detainee_history']['Row'], 'id' | 'changed_at'>
        Update: Partial<Database['public']['Tables']['detainee_history']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      normalize_arabic: {
        Args: { input: string }
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: 'admin' | 'verifier' | 'staff' | 'public'
      }
    }
    Enums: {
      user_role: 'admin' | 'verifier' | 'staff' | 'public'
    }
  }
}
