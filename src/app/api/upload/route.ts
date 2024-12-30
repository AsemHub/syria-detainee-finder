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
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  Logger.info('Starting file upload process');
  
  try {
    // Add CORS headers to the response
    const headers = { ...corsHeaders };

    // Log request details
    Logger.debug('Upload request received', {
      method: req.method,
      contentType: req.headers.get('content-type'),
      url: req.url
    });

    const formData = await req.formData();
    Logger.info('Form data received');

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

    Logger.info('File and organization data extracted', {
      fileName: file.name,
      fileSize: file.size,
      organization
    });

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
    Logger.info('File content read successfully', { 
      sessionId,
      contentLength: fileContent.length 
    });
    
    // Parse CSV
    const { data: records, errors: parseErrors } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        Logger.debug('Transforming header', { header });
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
        const mappedHeader = headerMap[normalizedHeader] || normalizedHeader;
        Logger.debug('Header mapped', { 
          original: header,
          normalized: normalizedHeader,
          mapped: mappedHeader 
        });
        return mappedHeader;
      },
      transform: (value) => {
        const cleaned = cleanCsvValue(value);
        Logger.debug('Transformed value', { 
          original: value,
          cleaned 
        });
        return cleaned;
      },
    });

    if (parseErrors.length > 0) {
      Logger.error('CSV parsing failed', { 
        parseErrors,
        sessionId 
      });
      
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

    // Start processing records asynchronously but ensure the session is created
    try {
      Logger.info('Starting background processing', { 
        sessionId,
        recordCount: transformedRecords.length 
      });

      // Ensure processing starts by awaiting the first step
      await updateSession(supabase, sessionId, {
        status: 'processing',
        total_records: transformedRecords.length
      });

      // Start processing in background
      processRecords(transformedRecords, organization, sessionId, supabaseAdmin)
        .catch(error => {
          Logger.error('Error in background processing', { 
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack
            } : error,
            sessionId 
          });
          return updateSession(supabase, sessionId, {
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
        });

      Logger.info('Background processing initiated', { sessionId });
      
      return NextResponse.json(
        { message: 'Upload started successfully', sessionId },
        { status: 200, headers }
      );

    } catch (error) {
      Logger.error('Failed to start processing', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error,
        sessionId
      });
      
      await updateSession(supabase, sessionId, {
        status: 'failed',
        error_message: 'Failed to start processing'
      });

      return NextResponse.json(
        { error: 'Failed to start processing' },
        { status: 500, headers }
      );
    }

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
          
          // Store invalid record for reference with better error handling
          try {
            Logger.debug('Attempting to insert invalid record', {
              sessionId,
              organization,
              fileName: record[FIELD_MAPPING['الاسم الكامل']] || `Row ${processedRecords}`,
              errors: validation.errors
            });

            // Use service role client for inserting invalid records
            const { data: insertedRecord, error: invalidRecordError } = await supabaseAdmin
              .from('invalid_records')
              .insert({
                session_id: sessionId,
                organization: organization,
                file_name: record[FIELD_MAPPING['الاسم الكامل']] || `Row ${processedRecords}`,
                invalid_records: validation.errors,
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (invalidRecordError) {
              Logger.error('Failed to insert invalid record', {
                error: invalidRecordError.message,
                code: invalidRecordError.code,
                details: invalidRecordError.details,
                hint: invalidRecordError.hint,
                record: cleanedRecord.full_name || `Row ${processedRecords}`,
                sessionId
              });
            } else {
              Logger.debug('Invalid record stored successfully', {
                recordId: insertedRecord?.id,
                record: cleanedRecord.full_name || `Row ${processedRecords}`,
                errors: validation.errors
              });
            }

            // Also update the upload session with the error using raw SQL
            const { error: sessionError } = await supabaseAdmin.rpc('update_session_errors', {
              p_session_id: sessionId,
              p_record_name: record[FIELD_MAPPING['الاسم الكامل']] || `Row ${processedRecords}`,
              p_errors: validation.errors
            });

            if (sessionError) {
              Logger.error('Failed to update session with error', {
                error: sessionError.message,
                sessionId
              });
            }
          } catch (invalidInsertError) {
            Logger.error('Error storing invalid record', {
              error: invalidInsertError instanceof Error ? {
                message: invalidInsertError.message,
                stack: invalidInsertError.stack
              } : invalidInsertError,
              record: cleanedRecord.full_name || `Row ${processedRecords}`,
              sessionId
            });
          }
          
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