import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import Papa from "papaparse"
import { Database, Json } from "@/lib/database.types"

type UploadStatus = 'processing' | 'completed' | 'failed'

interface CsvRecord {
  full_name: string
  date_of_detention: string
  last_seen_location: string
  detention_facility: string | null
  physical_description: string | null
  age_at_detention: string | null
  gender: string | null
  status: string | null
  contact_info: string
  additional_notes: string | null
}

type DetaineeStatus = 'in_custody' | 'missing' | 'released' | 'deceased' | 'unknown';
type Gender = 'male' | 'female' | 'unknown';

// Helper function to calculate age
function calculateAge(birthDate: Date, detentionDate: Date): number {
  const years = detentionDate.getFullYear() - birthDate.getFullYear()
  const months = detentionDate.getMonth() - birthDate.getMonth()
  if (months < 0 || (months === 0 && detentionDate.getDate() < birthDate.getDate())) {
    return years - 1
  }
  return years
}

// Helper function to normalize status
function normalizeStatus(status: string | null): DetaineeStatus {
  if (!status) return 'unknown';
  
  const normalized = status.toLowerCase().trim();
  
  // Map common variations to standard values
  const statusMap: Record<string, DetaineeStatus> = {
    'detained': 'in_custody',
    'in custody': 'in_custody',
    'missing': 'missing',
    'released': 'released',
    'deceased': 'deceased',
    'unknown': 'unknown'
  };
  
  return statusMap[normalized] || 'unknown';
}

// Helper function to normalize gender
function normalizeGender(gender: string | null): Gender {
  if (!gender) return 'unknown';
  
  const normalized = gender.toLowerCase().trim();
  return normalized === 'male' ? 'male' :
         normalized === 'female' ? 'female' :
         'unknown';
}

// Helper function to convert record to Json type
function recordToJson(record: CsvRecord): Json {
  return record as unknown as Json
}

// Helper function to validate date
function isValidDate(dateStr: string): boolean {
  // First check format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) {
    return false
  }

  // Parse the date parts
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Check month range
  if (month < 1 || month > 12) {
    return false
  }

  // Check day range based on month
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) {
    return false
  }

  // Check if date is not in the future
  const inputDate = new Date(dateStr)
  const today = new Date()
  if (inputDate > today) {
    return false
  }

  return true
}

// Helper function to validate record
function validateRecord(record: any): { isValid: boolean; error?: string } {
  // Check required fields
  if (!record.full_name?.trim()) {
    return { isValid: false, error: 'missing_required_name' }
  }
  if (!record.last_seen_location?.trim()) {
    return { isValid: false, error: 'missing_required_location' }
  }

  // Validate detention date if provided
  if (record.date_of_detention && !isValidDate(record.date_of_detention)) {
    return { isValid: false, error: 'invalid_detention_date' }
  }

  // Validate age if provided
  if (record.age_at_detention) {
    const age = parseInt(record.age_at_detention)
    if (isNaN(age) || age < 0 || age > 120) {
      return { isValid: false, error: 'invalid_age' }
    }
  }

  // Validate gender if provided
  if (record.gender && !['male', 'female', 'unknown'].includes(record.gender.toLowerCase())) {
    return { isValid: false, error: 'invalid_gender' }
  }

  // Validate status if provided
  const validStatuses = ['in_custody', 'missing', 'released', 'deceased', 'unknown']
  if (record.status && !validStatuses.includes(record.status.toLowerCase())) {
    return { isValid: false, error: 'invalid_status' }
  }

  return { isValid: true }
}

export const maxDuration = 300 // Set max duration to 5 minutes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    console.log('Starting file upload process')
    const formData = await request.formData()
    const organization = formData.get('organization') as string
    const file = formData.get('file') as File

    if (!file || !organization) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate file type and size (reduced from 10MB to 5MB)
    if (!file.type || !["text/csv", "application/vnd.ms-excel"].includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV files are allowed." },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      )
    }

    // Parse and validate record count
    const fileContent = await file.text()
    const { data: records } = Papa.parse(fileContent, { header: true })
    
    if (records.length > 500) {
      return NextResponse.json(
        { error: "Too many records. Maximum allowed is 500 records per file. Please split your data into smaller files." },
        { status: 400 }
      )
    }

    console.log('Creating upload session...')
    // Create upload session
    const { data: session, error: sessionError } = await supabaseServer
      .from('upload_sessions')
      .insert({
        file_name: file.name,
        file_url: '',  // Will be updated after storage upload
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: 'system',
        status: 'processing' as UploadStatus,
        total_records: 0,
        processed_records: 0,
        skipped_duplicates: 0,
        processing_details: {}
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating upload session:', sessionError)
      return NextResponse.json(
        { error: "Failed to create upload session", details: sessionError },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: "No session data returned" },
        { status: 500 }
      )
    }

    console.log('Upload session created:', session.id)

    // Upload file to storage
    const fileBuffer = await file.arrayBuffer()
    console.log('Uploading file to storage...')
    const { data: storageData, error: storageError } = await supabaseServer
      .storage
      .from('csv-uploads')
      .upload(
        `${session.id}/${file.name}`,
        fileBuffer,
        {
          contentType: file.type,
          duplex: 'half',
          upsert: false
        }
      )

    if (storageError) {
      console.error('Error uploading file to storage:', storageError)
      await supabaseServer
        .from('upload_sessions')
        .update({
          status: 'failed' as UploadStatus,
          error_message: 'Failed to upload file to storage'
        })
        .eq('id', session.id)

      return NextResponse.json(
        { error: "Failed to upload file", details: storageError },
        { status: 500 }
      )
    }

    console.log('File uploaded to storage:', storageData)

    // Get file URL and update session
    const { data: { publicUrl } } = supabaseServer
      .storage
      .from('csv-uploads')
      .getPublicUrl(`${session.id}/${file.name}`)

    await supabaseServer
      .from('upload_sessions')
      .update({
        file_url: publicUrl,
        status: 'processing' as UploadStatus
      })
      .eq('id', session.id)

    console.log('File URL updated:', publicUrl)

    // Process CSV file
    const fileContent2 = await file.text()
    console.log('Processing CSV file...')
    Papa.parse<CsvRecord>(fileContent2, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          console.log('CSV parsing complete')
          const records = results.data
          let processedCount = 0
          let errorCounts = {
            duplicates: 0,
            missing_required_name: 0,
            missing_required_location: 0,
            invalid_detention_date: 0,
            invalid_age: 0,
            invalid_gender: 0,
            invalid_status: 0,
            other: 0
          }

          // Update total records count
          await supabaseServer
            .from('upload_sessions')
            .update({ 
              total_records: records.length,
              processing_details: errorCounts
            })
            .eq('id', session.id)

          console.log('Updated total records count:', records.length)

          // Process each record
          for (const record of records) {
            try {
              console.log('Processing record:', record.full_name)

              // Validate record
              const validation = validateRecord(record)
              if (!validation.isValid) {
                console.error(`Invalid data: ${validation.error}`)
                switch (validation.error) {
                  case 'missing_required_name':
                    errorCounts.missing_required_name++
                    break
                  case 'missing_required_location':
                    errorCounts.missing_required_location++
                    break
                  case 'invalid_detention_date':
                    errorCounts.invalid_detention_date++
                    break
                  case 'invalid_age':
                    errorCounts.invalid_age++
                    break
                  case 'invalid_gender':
                    errorCounts.invalid_gender++
                    break
                  case 'invalid_status':
                    errorCounts.invalid_status++
                    break
                  default:
                    errorCounts.other++
                }
                // Update session with current counts
                await supabaseServer
                  .from('upload_sessions')
                  .update({ 
                    processing_details: errorCounts,
                    processed_records: processedCount,
                    skipped_duplicates: errorCounts.duplicates
                  })
                  .eq('id', session.id)
                continue
              }

              // First, insert into detainees table
              const { data: detainee, error: detaineeError } = await supabaseServer
                .from('detainees')
                .insert({
                  full_name: record.full_name.trim(),
                  date_of_detention: record.date_of_detention?.trim() || null,
                  last_seen_location: record.last_seen_location.trim(),
                  detention_facility: record.detention_facility?.trim() || null,
                  gender: record.gender ? normalizeGender(record.gender) : null,
                  status: record.status ? normalizeStatus(record.status) : 'unknown',
                  additional_notes: record.additional_notes?.trim() || null,
                  source_organization: organization,
                  contact_info: record.contact_info,
                  physical_description: record.physical_description?.trim() || null,
                  age_at_detention: record.age_at_detention ? parseInt(record.age_at_detention) : null,
                  last_update_date: new Date().toISOString()
                })
                .select()
                .single()

              if (detaineeError) {
                if (detaineeError.code === '23505') {
                  console.error('Duplicate record:', detaineeError)
                  errorCounts.duplicates++
                } else {
                  console.error('Error creating detainee:', detaineeError)
                  errorCounts.other++
                }
                // Update session with current counts
                await supabaseServer
                  .from('upload_sessions')
                  .update({ 
                    processing_details: errorCounts,
                    processed_records: processedCount,
                    skipped_duplicates: errorCounts.duplicates
                  })
                  .eq('id', session.id)
                continue
              }

              console.log('Detainee created:', detainee.id)
              processedCount++
              // Update session with current counts
              await supabaseServer
                .from('upload_sessions')
                .update({ 
                  processing_details: errorCounts,
                  processed_records: processedCount,
                  skipped_duplicates: errorCounts.duplicates
                })
                .eq('id', session.id)

              // Create document for this record
              const { data: document, error: documentError } = await supabaseServer
                .from('documents')
                .insert({
                  file_name: file.name,
                  file_path: `${session.id}/${file.name}`,
                  uploaded_by: 'system',
                  upload_session_id: session.id,
                  is_csv_upload: true,
                  status: 'processing',
                  total_records: 1,
                  processed_records: 0,
                  skipped_duplicates: 0,
                  processing_details: recordToJson(record)
                })
                .select()
                .single()

              if (documentError) {
                console.error('Error creating document:', documentError)
                errorCounts.other++
                await supabaseServer
                  .from('upload_sessions')
                  .update({ 
                    processing_details: errorCounts,
                    processed_records: processedCount,
                    skipped_duplicates: errorCounts.duplicates
                  })
                  .eq('id', session.id)
                continue
              }

              console.log('Document created:', document.id)

              // Link document to detainee
              const { error: linkError } = await supabaseServer
                .from('detainees')
                .update({ source_document_id: document.id })
                .eq('id', detainee.id)

              if (linkError) {
                console.error('Error linking document:', linkError)
                errorCounts.other++
                await supabaseServer
                  .from('upload_sessions')
                  .update({ 
                    processing_details: errorCounts,
                    processed_records: processedCount,
                    skipped_duplicates: errorCounts.duplicates
                  })
                  .eq('id', session.id)
              } else {
                console.log('Document linked to detainee')
              }
            } catch (error) {
              console.error('Error processing record:', error)
              errorCounts.other++
              await supabaseServer
                .from('upload_sessions')
                .update({ 
                  processing_details: errorCounts,
                  processed_records: processedCount,
                  skipped_duplicates: errorCounts.duplicates
                })
                .eq('id', session.id)
            }
          }

          // Update final status
          await supabaseServer
            .from('upload_sessions')
            .update({
              status: 'completed' as UploadStatus,
              processed_records: processedCount,
              processing_details: errorCounts
            })
            .eq('id', session.id)

        } catch (error) {
          console.error('Error processing CSV:', error)
          await supabaseServer
            .from('upload_sessions')
            .update({
              status: 'failed' as UploadStatus,
              error_message: 'Failed to process CSV file'
            })
            .eq('id', session.id)
        }
      },
      error: async (error: Error) => {
        console.error('Error parsing CSV:', error)
        await supabaseServer
          .from('upload_sessions')
          .update({
            status: 'failed' as UploadStatus,
            error_message: 'Failed to parse CSV file'
          })
          .eq('id', session.id)
      }
    })

    console.log('Upload process complete')
    return NextResponse.json({ 
      message: "Upload started",
      sessionId: session.id
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
