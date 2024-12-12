import { createClient } from '@/lib/supabase/client'
import {
  Document,
  DocumentInsert,
  DocumentMetadata,
  DocumentType,
  DocumentUpload,
  VerificationResult,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
} from '@/lib/types/documents'

/**
 * Validates a file upload against size and type restrictions
 */
export async function validateDocument(
  upload: DocumentUpload
): Promise<VerificationResult> {
  const { file, documentType } = upload

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File size exceeds maximum allowed size of 10MB'
    }
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES[documentType].includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types for ${documentType}: ${ALLOWED_MIME_TYPES[documentType].join(', ')}`
    }
  }

  return { isValid: true }
}

/**
 * Uploads a document to Supabase storage and creates a database record
 */
export async function uploadDocument(
  upload: DocumentUpload
): Promise<Document> {
  const supabase = createClient()
  const { file, documentType, detaineeId } = upload

  // Validate document
  const validation = await validateDocument(upload)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  // Generate unique file path
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const filePath = `${detaineeId}/${documentType}/${timestamp}.${fileExt}`

  // Upload to storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('documents')
    .upload(filePath, file)

  if (storageError) {
    throw new Error(`Failed to upload document: ${storageError.message}`)
  }

  // Create database record
  const documentData: DocumentInsert = {
    detainee_id: detaineeId,
    document_type: documentType,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    verified: false
  }

  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert(documentData)
    .select()
    .single()

  if (dbError) {
    // Cleanup storage if database insert fails
    await supabase.storage.from('documents').remove([filePath])
    throw new Error(`Failed to create document record: ${dbError.message}`)
  }

  return document
}

/**
 * Retrieves all documents associated with a detainee
 */
export async function getDetaineeDocuments(
  detaineeId: string
): Promise<Document[]> {
  const supabase = createClient()

  const { data: documents, error } = await supabase
    .from('documents')
    .select()
    .eq('detainee_id', detaineeId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`)
  }

  return documents
}

/**
 * Verifies a document
 */
export async function verifyDocument(
  documentId: string,
  verified: boolean
): Promise<Document> {
  const supabase = createClient()

  const { data: document, error } = await supabase
    .from('documents')
    .update({ verified })
    .eq('id', documentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to verify document: ${error.message}`)
  }

  return document
}

/**
 * Deletes a document and its associated storage file
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createClient()

  // Get document to find storage path
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch document: ${fetchError.message}`)
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([document.file_path])

  if (storageError) {
    throw new Error(`Failed to delete document from storage: ${storageError.message}`)
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (dbError) {
    throw new Error(`Failed to delete document record: ${dbError.message}`)
  }
}
