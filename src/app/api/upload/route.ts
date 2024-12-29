import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateRecord, validateGender, validateStatus, normalizeNameForDb, cleanupText, parseDate } from '@/lib/validation';
import { Database, DetaineeStatus, DetaineeGender } from '@/lib/database.types';
import Logger, { LogContext } from "@/lib/logger";

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
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : 'https://syrianrevolution.eu',
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

    // Validate file type
    const validMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',  // Excel CSV files
      'application/csv',
      'application/x-csv',
      'text/x-csv',
      'text/comma-separated-values'
    ];

    if (!validMimeTypes.includes(file.type)) {
      Logger.error('Invalid file type', { type: file.type });
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    try {
      const fileName = `${sessionId}_${file.name}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Force the content type to text/csv for Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('csv-uploads')
        .upload(fileName, fileBuffer, {
          contentType: 'text/csv',  // Always use text/csv for Supabase storage
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        Logger.error('Failed to upload file to storage', { 
          error: uploadError,
          fileName,
          sessionId 
        });
        
        await updateSession(supabase, sessionId, {
          status: 'failed',
          errors: [{
            record: '',
            errors: [{ 
              message: 'Failed to upload file to storage: ' + uploadError.message,
              type: 'error'
            }]
          }]
        });
        
        return NextResponse.json(
          { error: 'Failed to upload file to storage', details: uploadError.message },
          { status: 500, headers }
        );
      }

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('csv-uploads')
        .getPublicUrl(fileName);

      // Update session with file URL
      await updateSession(supabase, sessionId, {
        file_url: publicUrl
      });

      Logger.debug('File uploaded to storage', { 
        fileName,
        publicUrl,
        sessionId
      });
    } catch (error) {
      Logger.error('Unexpected error uploading to storage', {
        error,
        sessionId
      });
      
      await updateSession(supabase, sessionId, {
        status: 'failed',
        errors: [{
          record: '',
          errors: [{ 
            message: 'Unexpected error uploading file: ' + (error instanceof Error ? error.message : 'Unknown error'),
            type: 'error'
          }]
        }]
      });
      
      return NextResponse.json(
        { error: 'Unexpected error uploading file' },
        { status: 500, headers }
      );
    }

    // Read file content as text
    const fileContent = await file.text();
    
    // Parse CSV
    const { data: records, errors: parseErrors } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const headerMap: { [key: string]: string } = {
          'الاسم الكامل': 'full_name',
          'الجنس': 'gender',
          'العمر عند الاعتقال': 'age_at_detention',
          'تاريخ الاعتقال': 'detention_date',
          'مكان آخر مشاهدة': 'last_seen_location',
          'الحالة': 'status',
          'معلومات الاتصال': 'contact_info',
          'ملاحظات': 'notes'
        };
        const normalizedHeader = header.trim();
        return headerMap[normalizedHeader] || normalizedHeader;
      },
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

    // Transform records to match database schema
    const transformedRecords = records.map((record: any) => ({
      full_name: record.full_name,
      gender: record.gender,
      age_at_detention: record.age_at_detention,
      detention_date: record.detention_date,
      last_seen_location: record.last_seen_location,
      status: record.status,
      contact_info: record.contact_info,
      notes: record.notes
    }));

    // Start processing records in the background
    processRecords(transformedRecords, organization, sessionId, supabase);

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

  // Arabic field name mapping
  const FIELD_MAPPING: Record<string, string> = {
    'الاسم الكامل': 'full_name',
    'الجنس': 'gender',
    'العمر عند الاعتقال': 'age_at_detention',
    'تاريخ الاعتقال': 'detention_date',
    'مكان آخر مشاهدة': 'last_seen_location',
    'الحالة': 'status',
    'معلومات الاتصال': 'contact_info',
    'ملاحظات': 'notes'
  };

  // Arabic status mapping
  const STATUS_MAPPING: Record<string, DetaineeStatus> = {
    'معتقل': 'in_custody',
    'مفقود': 'missing',
    'متوفى': 'deceased',
    'مطلق سراح': 'released',
    'غير معروف': 'unknown'
  };

  // Arabic gender mapping
  const GENDER_MAPPING: Record<string, DetaineeGender> = {
    'ذكر': 'male',
    'أنثى': 'female',
    'غير معروف': 'unknown'
  };

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
          // Map Arabic field names to English
          full_name: normalizeNameForDb(record[FIELD_MAPPING['الاسم الكامل']]),
          source_organization: organization,
          upload_session_id: sessionId,

          // Map gender and status to English enums
          gender: GENDER_MAPPING[record[FIELD_MAPPING['الجنس']]] || 'unknown',
          status: STATUS_MAPPING[record[FIELD_MAPPING['الحالة']]] || 'unknown',
          original_name: record[FIELD_MAPPING['الاسم الكامل']],

          // Format date properly
          date_of_detention: record[FIELD_MAPPING['تاريخ الاعتقال']] ? 
            parseDate(record[FIELD_MAPPING['تاريخ الاعتقال']]) : null,
          last_update_date: new Date().toISOString(),

          // Optional text fields
          last_seen_location: cleanupText(record[FIELD_MAPPING['مكان آخر مشاهدة']]) || '',
          contact_info: cleanupText(record[FIELD_MAPPING['معلومات الاتصال']]) || '',
          additional_notes: cleanupText(record[FIELD_MAPPING['ملاحظات']]) || '',

          // Optional numeric fields
          age_at_detention: record[FIELD_MAPPING['العمر عند الاعتقال']] ? 
            parseInt(record[FIELD_MAPPING['العمر عند الاعتقال']]) : null
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