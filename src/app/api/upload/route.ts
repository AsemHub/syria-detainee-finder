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
    // Add CORS headers to the response
    const headers = {
      ...corsHeaders,
      'Access-Control-Allow-Origin': '*',
    };

    // Log request details
    Logger.debug('Upload request received', {
      method: req.method,
      contentType: req.headers.get('content-type'),
      url: req.url
    });

    const formData = await req.formData();
    
    // Log FormData entries
    const formDataEntries: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'object' && value !== null && 'name' in value && 'type' in value) {
        formDataEntries[key] = {
          type: value.type,
          size: 'size' in value ? value.size : 'N/A',
          name: value.name
        };
      } else {
        formDataEntries[key] = value;
      }
    });
    Logger.debug('FormData contents', { formData: formDataEntries });

    // Get and validate organization
    const organization = formData.get('organization')?.toString();
    if (!organization) {
      Logger.error('Organization missing from request');
      return NextResponse.json(
        { error: 'Organization is required' },
        { status: 400, headers }
      );
    }

    // Get and validate session ID
    const sessionId = formData.get('sessionId')?.toString();
    if (!sessionId) {
      Logger.error('Session ID missing from request');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400, headers }
      );
    }

    // Get and validate file
    const fileEntry = formData.get('file');
    
    // Type guard function to check if value is a File-like object
    const isFileLike = (value: any): value is File => {
      return (
        value !== null &&
        typeof value === 'object' &&
        'name' in value &&
        'type' in value &&
        'text' in value &&
        typeof value.text === 'function'
      );
    };
    
    // Log the type information
    Logger.debug('File upload details', {
      fileEntryType: fileEntry ? typeof fileEntry : 'undefined',
      hasRequiredProps: fileEntry ? isFileLike(fileEntry) : false,
      fileValue: fileEntry ? {
        type: isFileLike(fileEntry) ? fileEntry.type : typeof fileEntry,
        size: isFileLike(fileEntry) ? fileEntry.size : 'N/A',
        name: isFileLike(fileEntry) ? fileEntry.name : 'N/A'
      } : 'undefined',
      sessionId,
      organization
    });

    if (!fileEntry || !isFileLike(fileEntry)) {
      const error = !fileEntry ? 'File is required' : 'Invalid file format - expected a File';
      Logger.error('File validation failed', {
        error,
        fileEntryType: fileEntry ? typeof fileEntry : 'undefined',
        hasRequiredProps: fileEntry ? isFileLike(fileEntry) : false
      });
      
      // Update session status
      await updateSession(supabase, sessionId, {
        status: 'failed',
        errors: [{
          record: '',
          errors: [{ message: error, type: 'error' }]
        }]
      });
      
      return NextResponse.json(
        { error, message: `Upload failed with error: ${error}` },
        { status: 400, headers }
      );
    }

    // At this point, TypeScript knows fileEntry is a File-like object
    const file = fileEntry;

    // Read file content as text
    const fileContent = await file.text();
    
    // Parse CSV
    const { data: records, errors: parseErrors } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      transform: (value) => cleanCsvValue(value),
    });

    if (parseErrors.length > 0) {
      Logger.error('CSV parsing failed', { parseErrors });
      
      await updateSession(supabase, sessionId, {
        status: 'failed',
        errors: parseErrors.map(err => ({
          record: '',
          errors: [{ message: err.message, type: 'error' }]
        }))
      });
      
      return NextResponse.json(
        { error: 'Failed to parse CSV file', parseErrors },
        { status: 400, headers }
      );
    }

    // Start processing records in the background
    processRecords(records, organization, sessionId, supabase);

    return NextResponse.json(
      { message: 'Upload started successfully', sessionId },
      { status: 200, headers }
    );

  } catch (error) {
    Logger.error('Upload failed', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: 'Upload failed', message: error instanceof Error ? error.message : 'Unknown error' },
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