import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateRecord, validateGender, validateStatus, normalizeNameForDb, cleanupText } from '@/lib/validation';
import { Database } from '@/lib/database.types';
import Logger, { LogContext } from "@/lib/logger";

// Initialize server-side Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Helper function to sanitize file name for storage
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace any non-alphanumeric chars (except . and -) with _
    .toLowerCase();
}

// Helper function to clean CSV values
function cleanCsvValue(value: string): string {
  return value ? value.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ') : '';
}

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  let sessionId: string | undefined = undefined;

  try {
    Logger.info('Starting file upload process');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const organization = formData.get('organization') as string;

    if (!file || !organization) {
      throw new Error('File and organization are required');
    }

    Logger.info(`Received file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    Logger.info(`Organization: ${organization}`);

    const context: LogContext = { organization };

    // Create upload session
    Logger.info('Creating upload session', context);
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        organization,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: 'anonymous',
        status: 'processing',
        total_records: 0,
        processed_records: 0,
        valid_records: 0,
        invalid_records: 0,
        duplicate_records: 0,
        skipped_duplicates: 0,
        errors: [],
        processing_details: {
          current_index: 0,
          total: 0
        }
      })
      .select()
      .single();

    if (sessionError) {
      Logger.error('Failed to create upload session', { error: sessionError });
      throw new Error(`Failed to create upload session: ${sessionError.message}`);
    }

    if (!session) {
      Logger.error('No session data returned');
      throw new Error('Failed to create upload session: No session data returned');
    }

    sessionId = session.id;
    Logger.info(`Created upload session: ${sessionId}`, context);

    // Upload file to storage with correct MIME type
    const fileName = `${sanitizeFileName(organization)}/${Date.now()}_${sanitizeFileName(file.name)}`;
    Logger.info(`Uploading file to storage: ${fileName}`, context);

    // Convert file to text and create a new Blob with correct MIME type
    const fileContent = await file.text();
    const csvBlob = new Blob([fileContent], { type: 'text/csv' });

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('csv-uploads')
      .upload(fileName, csvBlob, {
        contentType: 'text/csv',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      Logger.error('Failed to upload file to storage', { error: uploadError });
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('csv-uploads')
      .getPublicUrl(fileName);

    // Update session with file URL
    const { error: urlUpdateError } = await supabase
      .from('upload_sessions')
      .update({
        file_url: publicUrl
      })
      .eq('id', sessionId);

    if (urlUpdateError) {
      Logger.error('Failed to update session with file URL', { error: urlUpdateError });
      throw new Error(`Failed to update session with file URL: ${urlUpdateError.message}`);
    }

    Logger.info(`File uploaded successfully: ${publicUrl}`, context);

    // Parse CSV (we already have the content)
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    });

    if (parseResult.errors.length > 0) {
      Logger.error('CSV parsing errors', { errors: parseResult.errors });
      throw new Error(`Failed to parse CSV: ${parseResult.errors[0].message}`);
    }

    const records = parseResult.data as Record<string, string>[];
    Logger.info(`Parsed ${records.length} records`, context);

    // Process records in chunks
    const CHUNK_SIZE = 10;
    let validRecords = 0;
    let invalidRecords = 0;
    let errors: { record: string; errors: { message: string; type: string; }[]; }[] = [];

    // Initial session update with total records
    await supabase
      .from('upload_sessions')
      .update({
        status: 'processing',
        total_records: records.length,
        valid_records: 0,
        invalid_records: 0,
        processed_records: 0,
        processing_details: {
          current_index: 0,
          total: records.length
        }
      })
      .eq('id', sessionId);

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      Logger.info(`Processing chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(records.length / CHUNK_SIZE)}`, context);

      for (const record of chunk) {
        try {
          const cleanedRecord = {
            full_name: normalizeNameForDb(record.full_name),
            source_organization: organization,
            gender: validateGender(record.gender),
            status: validateStatus(record.status),
            original_name: record.full_name,
            date_of_detention: record.date_of_detention || null,
            last_update_date: new Date().toISOString(),
            last_seen_location: cleanupText(record.last_seen_location) || cleanupText(record.place_of_detention) || '',
            detention_facility: cleanupText(record.detention_facility) || cleanupText(record.place_of_detention) || '',
            physical_description: cleanupText(record.physical_description) || '',
            contact_info: cleanupText(record.contact_info) || '',
            additional_notes: cleanupText(record.notes) || '',
            age_at_detention: record.age_at_detention ? parseInt(record.age_at_detention) : null,
            upload_session_id: sessionId
          };

          const validation = validateRecord(cleanedRecord);
          if (!validation.isValid) {
            invalidRecords++;
            errors.push({
              record: cleanedRecord.full_name || 'Unknown',
              errors: validation.errors.map(error => ({
                message: error,
                type: error.includes('مطلوب') ? 'missing_required' :
                      error.includes('تاريخ') ? 'invalid_date' :
                      error.includes('العمر') ? 'invalid_age' :
                      error.includes('الجنس') ? 'invalid_gender' :
                      error.includes('الحالة') ? 'invalid_status' : 'other'
              }))
            });
          } else {
            const { error: insertError } = await supabase
              .from('detainees')
              .insert(cleanedRecord);

            if (insertError) {
              invalidRecords++;
              errors.push({
                record: cleanedRecord.full_name || 'Unknown',
                errors: [{
                  message: insertError.message,
                  type: 'database_error'
                }]
              });
            } else {
              validRecords++;
            }
          }

          // Update session with progress after each record
          await supabase
            .from('upload_sessions')
            .update({
              processed_records: i + chunk.indexOf(record) + 1,
              current_record: record.full_name || 'Unknown',
              valid_records: validRecords,
              invalid_records: invalidRecords,
              errors: errors,
              processing_details: {
                current_index: i + chunk.indexOf(record) + 1,
                current_name: record.full_name || 'Unknown',
                total: records.length
              }
            })
            .eq('id', sessionId);

          Logger.debug('Record processed', { 
            name: cleanedRecord.full_name,
            recordNumber: i + chunk.indexOf(record) + 1,
            valid: validRecords,
            invalid: invalidRecords,
            total: records.length
          });

        } catch (error) {
          Logger.error('Error processing record', {
            error,
            record,
            index: i + chunk.indexOf(record)
          });

          invalidRecords++;
          errors.push({
            record: record.full_name || 'Unknown',
            errors: [{
              message: error instanceof Error ? error.message : 'Unknown error',
              type: 'processing_error'
            }]
          });

          // Update session with error
          await supabase
            .from('upload_sessions')
            .update({
              processed_records: i + chunk.indexOf(record) + 1,
              current_record: record.full_name || 'Unknown',
              valid_records: validRecords,
              invalid_records: invalidRecords,
              errors: errors,
              processing_details: {
                current_index: i + chunk.indexOf(record) + 1,
                current_name: record.full_name || 'Unknown',
                total: records.length
              }
            })
            .eq('id', sessionId);
        }
      }
    }

    // Final session update with completion status
    const { error: completeError } = await supabase
      .from('upload_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_records: records.length,
        valid_records: validRecords,
        invalid_records: invalidRecords,
        errors: errors,
        processing_details: {
          current_index: records.length,
          total: records.length
        }
      })
      .eq('id', sessionId);

    if (completeError) {
      Logger.error('Failed to complete session', { error: completeError });
      throw new Error(`Failed to complete session: ${completeError.message}`);
    }

    Logger.info('Processing completed', {
      ...context,
      totalRecords: records.length,
      validRecords,
      invalidRecords,
      errors: errors.length
    });

    return NextResponse.json({ success: true, sessionId });

  } catch (error) {
    Logger.error('Upload process error', { error });

    // If we have a session ID, update it with error status
    if (sessionId) {
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Process records in the background
async function processRecords(
  records: any[],
  organization: string,
  sessionId: string,
  supabase: SupabaseClient<Database>
) {
  let processedRecords = 0;
  let validRecordsCount = 0;
  let invalidRecordsCount = 0;
  let errors: { record: string, errors: { message: string, type: string }[] }[] = [];

  try {
    for (const record of records) {
      try {
        processedRecords++;

        // Update session with current record
        await supabase
          .from('upload_sessions')
          .update({
            processed_records: processedRecords,
            valid_records: validRecordsCount,
            invalid_records: invalidRecordsCount,
            processing_details: {
              current_index: processedRecords - 1,
              current_name: record.full_name,
              total: records.length
            },
            last_update: new Date().toISOString()
          })
          .eq('id', sessionId);

        // Process record logic...
        const cleanedRecord = {
          // Required fields
          full_name: normalizeNameForDb(record.full_name),
          source_organization: organization,

          // Optional fields with defaults
          gender: validateGender(record.gender),
          status: validateStatus(record.status),
          original_name: record.full_name,

          // Optional date fields
          date_of_detention: record.date_of_detention || null,
          last_update_date: new Date().toISOString(),

          // Optional text fields
          last_seen_location: cleanupText(record.last_seen_location) || cleanupText(record.place_of_detention) || '',
          detention_facility: cleanupText(record.detention_facility) || cleanupText(record.place_of_detention) || '',
          physical_description: cleanupText(record.physical_description) || '',
          contact_info: cleanupText(record.contact_info) || '',
          additional_notes: cleanupText(record.notes) || '',

          // Optional numeric fields
          age_at_detention: record.age_at_detention ? parseInt(record.age_at_detention) : null,

          // Reference fields
          upload_session_id: sessionId
        };

        // Validate the record
        const validation = validateRecord(cleanedRecord);
        if (!validation.isValid) {
          invalidRecordsCount++;
          
          // Map each validation error to the UI format
          validation.errors.forEach(errorMsg => {
            errors.push({
              record: cleanedRecord.full_name || `Row ${processedRecords}`,
              errors: [{ message: errorMsg, type: errorMsg.includes('مطلوب') ? 'missing_required' :
                    errorMsg.includes('تاريخ') ? 'invalid_date' :
                    errorMsg.includes('العمر') ? 'invalid_data' :
                    errorMsg.includes('الجنس') ? 'invalid_data' :
                    errorMsg.includes('الحالة') ? 'invalid_data' : 'other' }]
            });
          });
          
          Logger.error('Record validation failed', {
            errors: validation.errors,
            record: cleanedRecord.full_name
          });
          
          // Skip invalid record
          continue;
        }

        // Insert the record
        const { error: insertError } = await supabase
          .from('detainees')
          .insert(cleanedRecord);

        if (insertError) {
          Logger.error('Failed to insert record', { 
            error: insertError,
            record: cleanedRecord.full_name
          });
          throw insertError;
        }

        validRecordsCount++;
        Logger.debug('Record processed successfully', { 
          name: cleanedRecord.full_name,
          recordNumber: processedRecords
        });
      } catch (error) {
        invalidRecordsCount++;
        errors.push({
          record: record.full_name || `Row ${processedRecords}`,
          errors: [{ message: error instanceof Error ? error.message : 'Unknown error', type: 'other' }]
        });
        
        Logger.error('Record processing error', { 
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error,
          record: record.full_name || `Row ${processedRecords}`
        });
      }
    }

    // Final update with error summary
    await supabase
      .from('upload_sessions')
      .update({
        status: 'completed',
        processed_records: processedRecords,
        valid_records: validRecordsCount,
        invalid_records: invalidRecordsCount,
        errors: errors
      })
      .eq('id', sessionId);

    Logger.info('Background processing completed', { 
      stats: {
        total: processedRecords,
        valid: validRecordsCount,
        invalid: invalidRecordsCount
      }
    });

  } catch (error) {
    Logger.error('Background processing error', { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });

    // Update session with error
    await supabase
      .from('upload_sessions')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        errors: errors
      })
      .eq('id', sessionId);
  }
}