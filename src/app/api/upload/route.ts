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
    processRecords(records, sessionId!, organization, supabase);

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
  sessionId: string,
  organization: string,
  supabase: SupabaseClient<Database>
) {
  const context: LogContext = {
    sessionId,
    organization
  };
  Logger.setContext(context);
  Logger.info('Starting background processing', { 
    recordCount: records.length
  });
  
  let processedRecords = 0;
  let validRecordsCount = 0;
  let invalidRecordsCount = 0;
  let duplicateRecordsCount = 0;
  let skippedDuplicatesCount = 0;
  const uploadErrors: { record: string; error: string; type: string }[] = [];

  try {
    // Process each record
    for (const record of records) {
      try {
        // Update processing details
        await supabase
          .from('upload_sessions')
          .update({
            processed_records: processedRecords,
            valid_records: validRecordsCount,
            invalid_records: invalidRecordsCount,
            duplicate_records: duplicateRecordsCount,
            skipped_duplicates: skippedDuplicatesCount,
            processing_details: {
              current_name: record.full_name,
              current_index: processedRecords,
              total: records.length
            }
          })
          .eq('id', sessionId);

        // Process record logic...
        processedRecords++;

      } catch (error) {
        Logger.error('Record processing error', { 
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error,
          record: record.full_name || `Row ${processedRecords + 2}`
        });

        invalidRecordsCount++;
        uploadErrors.push({
          record: record.full_name || `Row ${processedRecords + 2}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'processing_error'
        });
      }
    }

    // Final update
    await supabase
      .from('upload_sessions')
      .update({
        status: 'completed',
        processed_records: processedRecords,
        valid_records: validRecordsCount,
        invalid_records: invalidRecordsCount,
        duplicate_records: duplicateRecordsCount,
        skipped_duplicates: skippedDuplicatesCount,
        errors: uploadErrors
      })
      .eq('id', sessionId);

    Logger.info('Background processing completed', { 
      stats: {
        total: processedRecords,
        valid: validRecordsCount,
        invalid: invalidRecordsCount,
        duplicates: duplicateRecordsCount,
        skipped: skippedDuplicatesCount
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
        errors: uploadErrors
      })
      .eq('id', sessionId);
  }
}