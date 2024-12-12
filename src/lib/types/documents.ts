import { Database } from '@/lib/supabase/types'

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type DocumentType = 'id' | 'photo' | 'report' | 'other'

export interface DocumentUpload {
  file: File
  documentType: DocumentType
  detaineeId: string
}

export interface DocumentMetadata {
  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
}

export interface VerificationResult {
  isValid: boolean
  error?: string
}

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types per document type
export const ALLOWED_MIME_TYPES: Record<DocumentType, string[]> = {
  id: ['image/jpeg', 'image/png', 'application/pdf'],
  photo: ['image/jpeg', 'image/png'],
  report: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  other: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
}
