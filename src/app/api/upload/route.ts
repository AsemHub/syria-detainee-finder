import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { validateRecord, validateGender, validateStatus, normalizeNameForDb, cleanupText } from '@/lib/validation';
import { Database } from '@/lib/database.types';
import Logger, { LogContext } from "@/lib/logger";

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

export async function POST(req: Request) {
  let sessionId: string | undefined = undefined;

  try {
    Logger.info('Starting file upload process');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const organization = formData.get('organization') as string;

    const context: LogContext = {};
    if (organization) {
      context.organization = organization;
    }
    Logger.setContext(context);
    Logger.debug('Received file', { 
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size 
    });

    if (!file || !organization) {
      Logger.error('Missing required fields', { 
        hasFile: !!file, 
        hasOrganization: !!organization 
      });
      return NextResponse.json({ error: 'File and organization are required' }, { status: 400 });
    }

    // Verify file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      Logger.error('Invalid file type', { fileType: file.type });
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    Logger.info('Creating upload session');
    // Create upload session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        file_name: file.name,
        file_size: file.size,
        mime_type: 'text/csv',
        organization: organization,
        status: 'pending',
        total_records: 0,
        processed_records: 0,
        valid_records: 0,
        invalid_records: 0,
        duplicate_records: 0,
        skipped_duplicates: 0,
        errors: [] as { record: string, error: string, type: string }[],
        processing_details: {},
        error_message: null
      })
      .select()
      .single();

    if (sessionError || !session) {
      Logger.error('Error creating upload session', { error: sessionError });
      return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
    }

    sessionId = session.id;
    if (sessionId) {
      Logger.setContext({ sessionId });
    }
    Logger.info('Upload session created', { sessionId });

    // Sanitize organization name and file name for storage
    const sanitizedOrg = sanitizeFileName(organization);
    const timestamp = new Date().getTime();
    const sanitizedFileName = sanitizeFileName(file.name);
    const storageFileName = `${sanitizedOrg}/${timestamp}_${sanitizedFileName}`;

    // Get file buffer for upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    Logger.info('Uploading file to storage', { 
      fileName: storageFileName,
      size: fileBuffer.length 
    });

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('csv-uploads')
      .upload(storageFileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'text/csv'
      });

    if (uploadError) {
      Logger.error('Error uploading file', { 
        error: uploadError,
        sessionId 
      });

      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: uploadError.message
        })
        .eq('id', sessionId);

      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    Logger.info('File uploaded successfully', { 
      fileName: storageFileName,
      sessionId 
    });

    // Parse CSV file
    const csvContent = await file.text();
    const { data: records, errors: parseErrors } = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.toLowerCase().trim()
    });

    if (parseErrors?.length > 0) {
      Logger.error('CSV parsing errors', { 
        errors: parseErrors,
        sessionId 
      });

      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: 'Failed to parse CSV file',
          errors: parseErrors.map(error => ({
            record: `Row ${(error.row ?? 0) + 2}`,
            error: error.message,
            type: 'parse_error'
          }))
        })
        .eq('id', sessionId);

      return NextResponse.json({ error: 'Failed to parse CSV file' }, { status: 400 });
    }

    Logger.info('CSV parsed successfully', { 
      recordCount: records.length,
      sessionId 
    });

    // Update session with total records
    await supabase
      .from('upload_sessions')
      .update({
        total_records: records.length,
        status: 'processing'
      })
      .eq('id', sessionId);

    // Process records in the background
    processRecords(records, organization, sessionId!, supabase);

    return NextResponse.json({
      message: 'Upload started',
      sessionId,
      totalRecords: records.length
    }, { status: 200 });

  } catch (error) {
    const errorContext: LogContext = {};
    if (sessionId) {
      errorContext.sessionId = sessionId;
    }
    Logger.error('Upload error', { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error,
      ...errorContext
    });
    
    // If we have a session ID, update it with the error
    if (sessionId) {
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', sessionId);
    }

    return NextResponse.json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
          organization: organization,
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