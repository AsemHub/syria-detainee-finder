import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import Papa from "papaparse"
import { Database, Json } from "@/lib/database.types"

type UploadStatus = 'processing' | 'completed' | 'failed'

interface CsvRecord {
  full_name: string
  arrest_date: string
  arrest_location: string
  prison_location: string | null
  gender: string | null
  legal_status: string | null
  notes: string | null
  date_of_birth: string | null
  health_status: string | null
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

export const maxDuration = 300 // Set max duration to 5 minutes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    console.log('Starting file upload process')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const organization = formData.get('organization') as string

    console.log('Received file:', file?.name, 'organization:', organization)

    if (!file || !organization) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type || !["text/csv", "application/vnd.ms-excel"].includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV files are allowed." },
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
    const fileContent = await file.text()
    console.log('Processing CSV file...')
    Papa.parse<CsvRecord>(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          console.log('CSV parsing complete')
          const records = results.data
          let processedCount = 0
          let skippedCount = 0

          // Update total records count
          await supabaseServer
            .from('upload_sessions')
            .update({ total_records: records.length })
            .eq('id', session.id)

          console.log('Updated total records count:', records.length)

          // Process each record
          for (const record of records) {
            try {
              console.log('Processing record:', record.full_name)
              // First, insert into detainees table
              const { data: detainee, error: detaineeError } = await supabaseServer
                .from('detainees')
                .insert({
                  full_name: record.full_name,
                  date_of_detention: record.arrest_date,
                  last_seen_location: record.arrest_location,
                  detention_facility: record.prison_location,
                  gender: normalizeGender(record.gender),
                  status: normalizeStatus(record.legal_status),
                  additional_notes: record.notes,
                  source_organization: organization,
                  contact_info: 'Imported from CSV',
                  physical_description: record.health_status || null,
                  age_at_detention: record.date_of_birth ? 
                    calculateAge(new Date(record.date_of_birth), new Date(record.arrest_date)) : 
                    null,
                  last_update_date: new Date().toISOString()
                })
                .select()
                .single()

              if (detaineeError) {
                console.error('Error creating detainee:', detaineeError)
                skippedCount++
                continue
              }

              console.log('Detainee created:', detainee.id)

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
                skippedCount++
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
                skippedCount++
              } else {
                console.log('Document linked to detainee')
                processedCount++
              }

              // Update progress after each record
              await supabaseServer
                .from('upload_sessions')
                .update({ 
                  processed_records: processedCount,
                  skipped_duplicates: skippedCount,
                  status: 'processing' as UploadStatus
                })
                .eq('id', session.id)
            } catch (error) {
              console.error('Error processing record:', error)
              skippedCount++
            }
          }

          // Update final status
          await supabaseServer
            .from('upload_sessions')
            .update({
              status: 'completed' as UploadStatus,
              processed_records: processedCount,
              skipped_duplicates: skippedCount
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
