import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateRecord, validateGender, validateStatus, normalizeNameForDb, cleanupText, parseDate } from '@/lib/validation';
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

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    // Get and validate organization
    const organization = formData.get('organization')?.toString();
    if (!organization) {
      throw new Error('Organization is required');
    }

    // Get and validate session ID
    const sessionId = formData.get('sessionId')?.toString();
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Get and validate file
    const file = formData.get('file');
    
    Logger.debug('File upload details', {
      fileType: file ? typeof file : 'undefined',
      isFile: file instanceof File,
      fileName: file instanceof File ? file.name : 'N/A',
      fileSize: file instanceof File ? file.size : 'N/A',
      contentType: file instanceof File ? file.type : 'N/A'
    });

    if (!file) {
      throw new Error('File is required');
    }
    
    if (!(file instanceof Blob)) {
      throw new Error('Invalid file format: File must be a valid Blob');
    }

    // Convert Blob to File if needed
    const fileToProcess = file instanceof File ? file : new File([file], 'uploaded.csv', {
      type: 'text/csv'
    });

    if (fileToProcess.size === 0) {
      throw new Error('File is empty');
    }

    Logger.info('Upload started', {
      organization,
      fileName: fileToProcess.name,
      fileSize: fileToProcess.size,
      sessionId
    });

    // Parse CSV file
    const csvContent = await fileToProcess.text();
    const { data: records, errors: parseErrors } = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transform: cleanCsvValue
    });

    if (parseErrors.length > 0) {
      Logger.error('CSV parsing failed', {
        errors: parseErrors.map(e => e.message),
        organization,
        sessionId,
        firstLines: csvContent.split('\n').slice(0, 3).join('\n')
      });
      throw new Error('Failed to parse CSV file: ' + parseErrors[0].message);
    }

    if (records.length === 0) {
      throw new Error('CSV file contains no valid records');
    }

    // Start background processing
    processRecords(records, organization, sessionId, supabase).catch(async (error) => {
      Logger.error('Background processing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      await updateSession(supabase, sessionId, {
        status: 'failed',
        errors: [{
          record: '',
          errors: [{ message: error instanceof Error ? error.message : 'Unknown error', type: 'error' }]
        }]
      });
    });

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      sessionId
    }, { headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    Logger.error('Upload failed', {
      error: errorMessage,
      message: 'Upload failed with error: ' + errorMessage
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
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
  let duplicateRecords = 0;
  const processedNames = new Set<string>();

  try {
    // Initial session update
    await updateSession(supabase, sessionId, {
      total_records: records.length,
      status: 'processing'
    });

    for (const record of records) {
      try {
        processedRecords++;

        // Process record logic...
        const cleanedRecord = {
          // Required fields
          full_name: normalizeNameForDb(record.full_name),
          source_organization: organization,
          upload_session_id: sessionId, // Link to upload session

          // Optional fields with defaults
          gender: record.gender,
          status: record.status,
          original_name: record.full_name,

          // Optional date fields
          date_of_detention: record.date_of_detention ? parseDate(record.date_of_detention) : null,
          last_update_date: new Date().toISOString(),

          // Optional text fields
          last_seen_location: cleanupText(record.last_seen_location) || cleanupText(record.place_of_detention) || '',
          detention_facility: cleanupText(record.detention_facility) || cleanupText(record.place_of_detention) || '',
          physical_description: cleanupText(record.physical_description) || '',
          contact_info: cleanupText(record.contact_info) || '',
          additional_notes: cleanupText(record.notes) || '',

          // Optional numeric fields
          age_at_detention: record.age_at_detention ? parseInt(record.age_at_detention) : null
        };

        // Check for duplicates within this upload
        const normalizedName = cleanedRecord.full_name.toLowerCase();
        if (processedNames.has(normalizedName)) {
          duplicateRecords++;
          errors.push({
            record: cleanedRecord.full_name,
            errors: [{ message: 'هذا السجل مكرر', type: 'duplicate' }]
          });
          continue;
        }

        // Validate the record
        const validation = validateRecord(cleanedRecord);
        if (!validation.isValid) {
          invalidRecordsCount++;
          
          // Map each validation error to the UI format
          validation.errors.forEach(errorMsg => {
            errors.push({
              record: cleanedRecord.full_name || `Row ${processedRecords}`,
              errors: [{ message: errorMsg, type: 'validation' }]
            });
          });
          
          // Store invalid record for reference
          await supabase
            .from('invalid_records')
            .insert({
              session_id: sessionId,
              record_data: record,
              errors: validation.errors,
              row_number: processedRecords
            });
          
          Logger.debug(`Validation failed for record: ${cleanedRecord.full_name}`, {
            errors: validation.errors
          });
          
          continue;
        }

        try {
          // Insert valid record into detainees table
          const { data: detainee, error: insertError } = await supabase
            .from('detainees')
            .insert({
              ...cleanedRecord,
              original_data: record
            })
            .select()
            .single();

          if (insertError) {
            Logger.error('Database insert failed', { 
              error: insertError.message,
              record: cleanedRecord.full_name
            });
            throw insertError;
          }

          validRecordsCount++;
          processedNames.add(normalizedName);

          // Update session periodically (every 5 records)
          if (processedRecords % 5 === 0) {
            await updateSession(supabase, sessionId, {
              processed_records: processedRecords,
              valid_records: validRecordsCount,
              invalid_records: invalidRecordsCount,
              duplicate_records: duplicateRecords,
              processing_details: {
                current_index: processedRecords - 1,
                current_name: record.full_name,
                total: records.length
              },
              last_update: new Date().toISOString()
            });
          }

        } catch (error) {
          Logger.error('Processing error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            record: cleanedRecord.full_name
          });
          invalidRecordsCount++;
          errors.push({
            record: cleanedRecord.full_name,
            errors: [{ 
              message: error instanceof Error ? error.message : 'خطأ غير معروف',
              type: 'database'
            }]
          });
        }
      } catch (recordError) {
        Logger.error('Record processing error', {
          error: recordError instanceof Error ? recordError.message : 'Unknown error',
          record: record.full_name
        });
        invalidRecordsCount++;
      }
    }

    // Final session update with completion status
    await updateSession(supabase, sessionId, {
      status: 'completed',
      processed_records: processedRecords,
      total_records: records.length,
      valid_records: validRecordsCount,
      invalid_records: invalidRecordsCount,
      duplicate_records: duplicateRecords,
      errors: errors,
      completed_at: new Date().toISOString()
    });

    Logger.info('Processing completed', {
      organization,
      totalRecords: records.length,
      validRecords: validRecordsCount,
      invalidRecords: invalidRecordsCount,
      duplicates: duplicateRecords,
      errors: errors.length
    });

  } catch (error) {
    Logger.error('Processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId
    });

    // Update session with error state
    await updateSession(supabase, sessionId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString(),
      processed_records: processedRecords,
      total_records: records.length,
      valid_records: validRecordsCount,
      invalid_records: invalidRecordsCount,
      duplicate_records: duplicateRecords,
      errors: errors
    });
  }
}

// Helper function to update session state
async function updateSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  updates: any
) {
  try {
    // Always include timestamp for status changes
    const updatesWithTimestamp = {
      ...updates,
      ...(updates.status && { updated_at: new Date().toISOString() })
    };

    const { error } = await supabase
      .from('upload_sessions')
      .update(updatesWithTimestamp)
      .eq('id', sessionId);

    if (error) {
      Logger.error('Failed to update session', {
        error: error.message,
        sessionId,
        updates: updatesWithTimestamp
      });
      throw error;
    }

    // Log successful updates
    Logger.debug('Session updated', {
      sessionId,
      status: updates.status,
      processed: updates.processed_records,
      total: updates.total_records
    });

  } catch (error) {
    Logger.error('Session update error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
      updates
    });
    throw error;
  }
}