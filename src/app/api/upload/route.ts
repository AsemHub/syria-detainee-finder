import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { validateRecord, validateGender, validateStatus, normalizeNameForDb, cleanupText } from '@/lib/validation';
import { Database } from '@/lib/database.types';
import Logger from "@/lib/logger";

// Helper function to sanitize file name for storage
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace any non-alphanumeric chars (except . and -) with _
    .toLowerCase();
}

export async function POST(req: Request) {
  let sessionId: string | null = null;

  try {
    Logger.info('Starting file upload process...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const organization = formData.get('organization') as string;

    Logger.debug('Received file:', file?.name, 'Organization:', organization, 'Type:', file?.type);

    if (!file || !organization) {
      Logger.error('Missing required fields:', { file: !!file, organization: !!organization });
      return NextResponse.json({ error: 'File and organization are required' }, { status: 400 });
    }

    // Verify file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      Logger.error('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    Logger.info('Creating upload session...');
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
        errors: [] as { message: string, row?: number }[],
        processing_details: {},
        error_message: null
      })
      .select()
      .single();

    if (sessionError || !session) {
      Logger.error('Error creating upload session:', sessionError);
      return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
    }

    sessionId = session.id;
    Logger.info('Upload session created:', sessionId);

    // Sanitize organization name and file name for storage
    const sanitizedOrg = sanitizeFileName(organization);
    const timestamp = new Date().getTime();
    const sanitizedFileName = sanitizeFileName(file.name);
    const storageFileName = `${sanitizedOrg}/${timestamp}_${sanitizedFileName}`;

    // Get file buffer for upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    Logger.info('Uploading file to storage:', storageFileName);
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
      Logger.error('Error uploading file:', uploadError);
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: 'Failed to upload file to storage: ' + uploadError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: uploadError.message 
      }, { status: 500 });
    }

    Logger.info('File uploaded successfully, getting public URL...');
    // Get file URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('csv-uploads')
      .getPublicUrl(storageFileName);

    // Update session with file URL
    await supabase
      .from('upload_sessions')
      .update({
        file_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Start processing the file
    Logger.info('Starting CSV processing...');
    const fileText = await file.text();
    
    // Parse CSV to validate format
    const results = Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (!results.data || results.errors.length > 0) {
      // Update session status to failed
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: results.errors[0]?.message || 'Failed to parse CSV'
        })
        .eq('id', sessionId);

      return NextResponse.json({ 
        error: 'Failed to parse CSV', 
        details: results.errors[0].message 
      }, { status: 400 });
    }

    // Ensure sessionId is a string before proceeding
    if (!sessionId) {
      throw new Error('Session ID is required for processing records');
    }

    // Start background processing
    processRecords(results.data, sessionId, organization, supabase).catch(Logger.error);

    // Return success response with session ID
    return NextResponse.json({ 
      message: 'File upload started successfully',
      sessionId: sessionId
    }, { status: 200 });

  } catch (error) {
    Logger.error('Upload error:', error);
    
    // If we have a session ID, update it with the error
    if (sessionId) {
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error occurred',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
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
  Logger.info('Processing records in background:', records.length);
  
  let processedRecords = 0;
  let validRecordsCount = 0;
  let invalidRecordsCount = 0;
  let duplicateRecordsCount = 0;
  const uploadErrors: any[] = [];

  try {
    // Update session with total records
    await supabase
      .from('upload_sessions')
      .update({
        status: 'processing',
        total_records: records.length,
        processed_records: 0,
        valid_records: 0,
        invalid_records: 0,
        duplicate_records: 0,
        processing_details: {
          current_name: '',
          current_index: 0,
          total: records.length
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Process records in batches
    const batchSize = 10;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      Logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(records.length / batchSize)}`);

      for (const record of batch) {
        try {
          const currentName = record.full_name || '';
          Logger.debug(`Processing record: ${currentName} (${processedRecords + 1}/${records.length})`);

          // Update processing status
          await supabase
            .from('upload_sessions')
            .update({
              processed_records: processedRecords + 1,
              valid_records: validRecordsCount,
              invalid_records: invalidRecordsCount,
              duplicate_records: duplicateRecordsCount,
              processing_details: {
                current_name: currentName,
                current_index: processedRecords,
                total: records.length
              },
              errors: uploadErrors,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

          // Normalize and validate record
          const normalizedName = normalizeNameForDb(currentName);
          
          // Skip empty names
          if (!normalizedName) {
            invalidRecordsCount++;
            uploadErrors.push({
              record: currentName,
              error: 'الاسم الكامل مطلوب',
              type: 'validation'
            });
            processedRecords++;
            continue;
          }

          // Check for duplicates
          const { data: existingRecords, error: duplicateError } = await supabase
            .from('detainees')
            .select('id, full_name, original_name')
            .eq('organization', organization)
            .or(`full_name.eq.${normalizedName},original_name.eq.${currentName}`)
            .single();

          if (duplicateError && duplicateError.code !== 'PGRST116') {
            throw duplicateError;
          }

          if (existingRecords) {
            duplicateRecordsCount++;
            uploadErrors.push({
              record: currentName,
              error: `سجل مكرر: يوجد سجل مماثل باسم ${existingRecords.original_name}`,
              type: 'duplicate'
            });
            processedRecords++;
            continue;
          }

          // Validate record
          const validation = validateRecord(record);
          if (!validation.isValid) {
            invalidRecordsCount++;
            uploadErrors.push(...validation.errors.map(error => ({
              record: currentName,
              error,
              type: 'validation'
            })));
            processedRecords++;
            continue;
          }

          // Insert valid record
          const { error: insertError } = await supabase
            .from('detainees')
            .insert([{
              full_name: normalizedName,
              original_name: cleanupText(currentName),
              gender: validateGender(record.gender),
              status: validateStatus(record.status),
              date_of_detention: record.date_of_detention ? new Date(record.date_of_detention).toISOString().split('T')[0] : null,
              age_at_detention: record.age_at_detention ? parseInt(record.age_at_detention) : null,
              last_seen_location: cleanupText(record.last_seen_location),
              detention_facility: cleanupText(record.detention_facility),
              contact_info: cleanupText(record.contact_info),
              physical_description: cleanupText(record.physical_description),
              additional_notes: cleanupText(record.additional_notes),
              organization: cleanupText(organization),
              upload_session_id: sessionId
            }]);

          if (insertError) {
            if (insertError.code === '23505') {
              duplicateRecordsCount++;
              uploadErrors.push({
                record: currentName,
                error: 'سجل مكرر: تم العثور على سجل مماثل في قاعدة البيانات',
                type: 'duplicate'
              });
            } else {
              invalidRecordsCount++;
              uploadErrors.push({
                record: currentName,
                error: `خطأ في إدخال السجل: ${insertError.message}`,
                type: 'processing'
              });
            }
          } else {
            validRecordsCount++;
          }
          processedRecords++;

        } catch (error) {
          Logger.error('Error processing record:', error);
          invalidRecordsCount++;
          uploadErrors.push({
            record: record.full_name || '',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            type: 'processing'
          });
          processedRecords++;
        }
      }
    }

    // Update final status
    await supabase
      .from('upload_sessions')
      .update({
        status: 'completed',
        processed_records: processedRecords,
        valid_records: validRecordsCount,
        invalid_records: invalidRecordsCount,
        duplicate_records: duplicateRecordsCount,
        errors: uploadErrors,
        processing_details: {
          current_name: 'Completed',
          current_index: processedRecords,
          total: records.length
        },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    Logger.info('Background processing completed successfully');
  } catch (error) {
    Logger.error('Background processing failed:', error);
    
    // Update session with error status
    await supabase
      .from('upload_sessions')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred',
        errors: uploadErrors,
        processing_details: {
          current_name: 'Failed',
          current_index: processedRecords,
          total: records.length
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }
}