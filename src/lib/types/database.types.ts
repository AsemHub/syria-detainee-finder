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
          created_at: string
          updated_at: string
          name: string
          status: string
          gender: string
          nationality: string
          date_of_detention: string | null
          place_of_detention: string | null
          notes: string | null
          verified: boolean
          source: string | null
          source_url: string | null
          documents: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          status: string
          gender: string
          nationality: string
          date_of_detention?: string | null
          place_of_detention?: string | null
          notes?: string | null
          verified?: boolean
          source?: string | null
          source_url?: string | null
          documents?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          status?: string
          gender?: string
          nationality?: string
          date_of_detention?: string | null
          place_of_detention?: string | null
          notes?: string | null
          verified?: boolean
          source?: string | null
          source_url?: string | null
          documents?: string[] | null
        }
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
    }
    Enums: {
      [_ in never]: never
    }
  }
}
