import { supabase } from './client'

type UploadOptions = {
  file: File
  detaineeId: string
  documentType: 'id' | 'photo' | 'report' | 'other'
}

export async function uploadDocument({ file, detaineeId, documentType }: UploadOptions) {
  try {
    // Generate a unique file path
    const timestamp = new Date().getTime()
    const fileExtension = file.name.split('.').pop()
    const filePath = `${detaineeId}/${documentType}/${timestamp}.${fileExtension}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    // Create document record in the database
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        detainee_id: detaineeId,
        document_type: documentType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single()

    if (documentError) {
      // If database insert fails, clean up the uploaded file
      await supabase.storage.from('documents').remove([filePath])
      throw documentError
    }

    return documentData
  } catch (error) {
    console.error('Error uploading document:', error)
    throw error
  }
}

export async function getDocumentUrl(filePath: string) {
  try {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600) // URL valid for 1 hour

    return data?.signedUrl
  } catch (error) {
    console.error('Error getting document URL:', error)
    throw error
  }
}

export async function deleteDocument(documentId: string, filePath: string) {
  try {
    // Delete the document record from the database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      throw deleteError
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath])

    if (storageError) {
      throw storageError
    }
  } catch (error) {
    console.error('Error deleting document:', error)
    throw error
  }
}
