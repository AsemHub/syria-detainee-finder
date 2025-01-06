import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { validateRecord, validateGender, validateStatus, normalizeNameForDb, cleanupText, parseDate, validateHeaders, getStandardizedHeader } from '@/lib/validation';
import { Database, DetaineeStatus, DetaineeGender } from '@/lib/database.types';
import Logger, { LogContext } from "@/lib/logger";
import { v4 as uuidv4 } from 'uuid';

// Configure as serverless function with increased memory and timeout
export const runtime = 'nodejs'; // Use Node.js runtime instead of Edge
export const maxDuration = 60; // Set maximum duration to 60 seconds
export const preferredRegion = 'fra1'; // Deploy to Frankfurt for EU users

// Initialize server-side Supabase client with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for API routes
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Initialize server-side Supabase client with service role key for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for API routes
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
  'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  'Access-Control-Allow-Credentials': 'true'
} as const;

// Helper function to create response with CORS headers
function createResponse(data: any, status: number) {
  return NextResponse.json(data, { 
    status,
    headers: corsHeaders
  });
}

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return createResponse({}, 200);
}

export async function POST(request: Request) {
  let supabase: SupabaseClient<Database>;
  let sessionId: string;

  try {
    Logger.info('Received upload request');
    const formData = await request.formData();
    const fileData = formData.get('file') as File;
    const organization = formData.get('organization') as string;
    sessionId = formData.get('sessionId') as string;

    Logger.debug('File details', { 
      name: fileData.name,
      type: fileData.type,
      size: fileData.size 
    });

    if (!fileData || !organization || !sessionId) {
      Logger.error(`Missing required fields`, { 
        hasFile: !!fileData, 
        hasOrg: !!organization, 
        hasSession: !!sessionId 
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    Logger.info(`Processing upload request`, { 
      fileSize: fileData.size,
      fileType: fileData.type,
      organization,
      sessionId 
    });

    // Initialize Supabase client
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Update session to processing state
    await updateSession(supabase, sessionId, {
      status: 'processing',
      mime_type: fileData.type,
      organization: organization,
      current_record: 'Starting file processing...',
      updated_at: new Date().toISOString()
    });

    try {
      // Sanitize organization name for use in file path
      const sanitizedOrgName = sanitizeFileName(organization);
      
      // Create file path for storage: organization/sessionId/filename.csv
      const filePath = `${sanitizedOrgName}/${sessionId}/${sanitizeFileName(fileData.name)}`;
      
      Logger.debug('Uploading file', { filePath });

      // Read the file content
      const fileContent = await fileData.text();
      
      // Type the parse result properly
      interface CsvRow {
        full_name: string;
        date_of_detention?: string;
        last_seen_location?: string;
        detention_facility?: string;
        physical_description?: string;
        age_at_detention?: string;
        gender?: DetaineeGender;
        status?: DetaineeStatus;
        contact_info?: string;
        additional_notes?: string;
        [key: string]: string | undefined;
      }

      const parseResult = Papa.parse<CsvRow>(fileContent, { 
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => getStandardizedHeader(header)
      });
      
      Logger.debug(`CSV parsing complete`, { 
        rowCount: parseResult.data.length,
        errorCount: parseResult.errors?.length || 0,
        fields: parseResult.meta.fields
      });

      if (parseResult.errors.length > 0) {
        Logger.error(`CSV parsing errors`, { errors: parseResult.errors });
        throw new Error(`Error parsing CSV file: ${parseResult.errors[0].message}`);
      }

      // Process records asynchronously with proper typing
      processRecords(parseResult.data as Record<string, string>[], organization, sessionId, supabaseAdmin)
        .catch(error => {
          Logger.error('Failed to process records', { error, sessionId });
        });

      return createResponse(
        { message: 'Upload started', sessionId },
        202
      );

    } catch (error) {
      Logger.error('Error in upload process', { 
        error,
        stack: error instanceof Error ? error.stack : undefined,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      return createResponse(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        500
      );
    }
  } catch (error) {
    Logger.error('Error in upload process', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : 'Unknown error'
    });

    return createResponse(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}

// Helper function to process CSV data
async function processRecords(
  records: Record<string, string>[],
  organization: string,
  sessionId: string,
  supabase: SupabaseClient
): Promise<void> {
  let processedRecords = 0;
  let validRecordsCount = 0;
  let invalidRecordsCount = 0;
  let duplicateRecordsCount = 0;
  const errors: Array<{ record: string; errors: Array<{ message: string; type: string }> }> = [];

  try {
    // Initial session update
    await updateSession(supabase, sessionId, {
      total_records: records.length,
      status: 'processing'
    });

    for (const record of records) {
      let currentRecord = record.full_name || `Row ${processedRecords + 1}`;
      processedRecords++;

      try {
        // Map record fields using the validation module's standardization function
        const mappedRecord: Record<string, string> = {};
        for (const [key, value] of Object.entries(record)) {
          const standardizedKey = getStandardizedHeader(key);
          mappedRecord[standardizedKey] = cleanCsvValue(value);
        }

        // Update session with current record
        await updateSession(supabase, sessionId, {
          current_record: currentRecord,
          processed_records: processedRecords,
          last_update: new Date().toISOString()
        });

        // Validate the record
        const validation = validateRecord(mappedRecord);
        if (!validation.isValid) {
          invalidRecordsCount++;
          errors.push({
            record: currentRecord,
            errors: validation.errors.map(error => ({
              message: error,
              type: 'validation'
            }))
          });
          continue;
        }

        // Check for duplicates using normalized name
        const { data: duplicateCheck, error: duplicateError } = await supabase
          .rpc('normalize_arabic_text', { input_text: mappedRecord.full_name })
          .single();

        if (duplicateError) {
          throw new Error(`Error normalizing name: ${duplicateError.message}`);
        }

        const normalizedName = duplicateCheck;
        
        const { data: existingRecords, error: searchError } = await supabase
          .from('detainees')
          .select('id, full_name')
          .eq('normalized_name', normalizedName)
          .limit(1);

        if (searchError) {
          throw new Error(`Error checking for duplicates: ${searchError.message}`);
        }

        if (existingRecords && existingRecords.length > 0) {
          duplicateRecordsCount++;
          errors.push({
            record: currentRecord,
            errors: [{
              message: 'سجل مكرر: يوجد شخص بنفس الاسم',
              type: 'duplicate'
            }]
          });
          continue;
        }

        // Insert the record into the database
        const { data: insertedDetainee, error: insertError } = await supabase
          .from('detainees')
          .insert({
            full_name: mappedRecord.full_name,
            original_name: mappedRecord.full_name,
            date_of_detention: parseDate(mappedRecord.date_of_detention),
            last_seen_location: mappedRecord.last_seen_location || '',
            detention_facility: mappedRecord.detention_facility || null,
            physical_description: mappedRecord.physical_description || null,
            age_at_detention: mappedRecord.age_at_detention ? parseInt(mappedRecord.age_at_detention) : null,
            gender: validateGender(mappedRecord.gender),
            status: validateStatus(mappedRecord.status),
            contact_info: mappedRecord.contact_info || '',
            additional_notes: mappedRecord.additional_notes || null,
            source_organization: organization,
            last_update_date: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.message.includes('unique constraint')) {
            duplicateRecordsCount++;
            errors.push({
              record: currentRecord,
              errors: [{
                message: 'سجل مكرر: يوجد شخص بنفس الاسم',
                type: 'duplicate'
              }]
            });
            continue;
          }
          throw new Error(`Error inserting record: ${insertError.message}`);
        }

        // Track the uploaded record
        if (insertedDetainee) {
          try {
            const { error: trackingError } = await supabase
              .from('csv_upload_records')
              .insert({
                session_id: sessionId,
                detainee_id: insertedDetainee.id,
                row_number: processedRecords,
                original_data: record
              });

            if (trackingError) {
              Logger.error('Error tracking uploaded record:', { trackingError });
            }
          } catch (trackingError) {
            Logger.error('Error tracking uploaded record:', { trackingError });
          }
        }

        validRecordsCount++;
      } catch (error) {
        invalidRecordsCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error processing record';
        
        // Store invalid record
        try {
          const { error: invalidRecordError } = await supabase
            .from('invalid_records')
            .insert({
              session_id: sessionId,
              record_data: record,
              errors: [{
                message: errorMessage,
                type: 'error'
              }]
            });

          if (invalidRecordError) {
            Logger.error('Error storing invalid record:', { invalidRecordError });
          }
        } catch (storeError) {
          Logger.error('Error storing invalid record:', { storeError });
        }

        errors.push({
          record: currentRecord,
          errors: [{
            message: errorMessage,
            type: 'error'
          }]
        });
      }
    }

    // Final session update
    await updateSession(supabase, sessionId, {
      status: 'completed',
      processed_records: processedRecords,
      valid_records: validRecordsCount,
      invalid_records: invalidRecordsCount,
      duplicate_records: duplicateRecordsCount,
      errors: errors,
      completed_at: new Date().toISOString()
    });

  } catch (error) {
    Logger.error('Error processing records', { error, sessionId });
    
    await updateSession(supabase, sessionId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error processing records',
      errors: [{
        record: '',
        errors: [{
          message: error instanceof Error ? error.message : 'Unknown error processing records',
          type: 'error'
        }]
      }]
    });
    
    throw error;
  }
}

// Types for session updates
interface SessionUpdate {
  file_name?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  organization?: string;
  total_records?: number;
  processed_records?: number;
  valid_records?: number;
  invalid_records?: number;
  duplicate_records?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  errors?: Array<{ record: string; errors: Array<{ message: string; type: string }> }>;
  current_record?: string;
  completed_at?: string;
  updated_at?: string;
  last_update?: string;
  processing_details?: Record<string, unknown>;
}

// Helper function to update session state
async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  updates: Partial<SessionUpdate>
): Promise<void> {
  try {
    // Always include timestamp for status changes
    const updatesWithTimestamp = {
      ...updates,
      ...(updates.status && { updated_at: new Date().toISOString() })
    };

    const { error: updateError } = await supabase
      .from('upload_sessions')
      .update(updatesWithTimestamp)
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    Logger.debug('Session updated', {
      sessionId,
      updates: updatesWithTimestamp,
      total: updates.total_records
    });

  } catch (error: unknown) {
    Logger.error('Session update error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
      updates
    });
    throw error;
  }
}