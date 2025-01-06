import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import Logger from '@/lib/logger';
import { normalizeArabicText } from '@/lib/arabic-utils';
import { Database } from '@/lib/database.types';

// Configure as serverless function
export const runtime = 'edge';
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Process records in batches to avoid timeouts
const BATCH_SIZE = 50;

// Define interface for CSV record
interface CsvRecord {
  الاسم_الكامل: string;
  تاريخ_الاعتقال: string;
  آخر_مكان: string;
  معلومات_الاتصال: string;
  مكان_الاحتجاز: string;
  الوصف_الجسدي: string;
  العمر: string;
  الجنس: string;
  الحالة: string;
  ملاحظات: string;
  المنظمة?: string;
}

export async function POST(request: Request) {
  let sessionId: string | null = null;
  
  try {
    const body = await request.json();
    Logger.info('Received processing request', { body });

    const { sessionId: requestSessionId } = body;
    sessionId = requestSessionId;
    
    if (!sessionId) {
      throw new Error('Missing required parameter: sessionId');
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found or error: ${sessionError?.message}`);
    }

    const fileUrl = session.file_url;
    if (!fileUrl) {
      throw new Error('Session has no file URL');
    }

    // Update session status
    await supabase
      .from('upload_sessions')
      .update({
        status: 'processing',
        processing_details: {
          ...session.processing_details,
          started_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId);

    // Get file content
    const storagePathMatch = fileUrl.match(/\/csv-uploads\/(.+)$/);
    if (!storagePathMatch) {
      throw new Error('Invalid file URL format');
    }
    const storagePath = storagePathMatch[1];

    const { data: fileData, error: fetchError } = await supabase.storage
      .from('csv-uploads')
      .download(storagePath);

    if (fetchError) {
      throw new Error(`Failed to fetch file: ${fetchError.message}`);
    }

    const fileContent = await fileData.text();
    const { data: records, errors: parseErrors } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseErrors.length > 0) {
      throw new Error(`CSV parsing errors: ${JSON.stringify(parseErrors)}`);
    }

    // Update total records count
    await supabase
      .from('upload_sessions')
      .update({
        total_records: records.length,
        processed_records: 0,
        status: 'processing',
        current_record: 'Starting validation...'
      })
      .eq('id', sessionId);

    let validRecords = 0;
    let invalidRecords = 0;
    let duplicateRecords = 0;
    let processedRecords = 0;
    const errors: Array<{ record: string, errors: Array<{ type: string, message: string }> }> = [];

    // Process records in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      // Process records sequentially within each batch
      for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
        const record = batch[batchIndex] as CsvRecord;
        const recordIndex = i + batchIndex;
        const recordErrors: Array<{ type: string, message: string }> = [];

        try {
          // Map and validate record
          const mappedRecord = {
            full_name: record.الاسم_الكامل,
            date_of_detention: record.تاريخ_الاعتقال,
            last_seen_location: record.آخر_مكان,
            contact_info: record.معلومات_الاتصال,
            detention_facility: record.مكان_الاحتجاز,
            physical_description: record.الوصف_الجسدي,
            age_at_detention: record.العمر,
            gender: record.الجنس,
            status: record.الحالة,
            additional_notes: record.ملاحظات,
            source_organization: record.المنظمة || session.organization
          };

          // Validate required fields
          const requiredFields = ['full_name', 'date_of_detention', 'gender', 'age_at_detention', 'last_seen_location', 'status'];
          for (const field of requiredFields) {
            if (!mappedRecord[field as keyof typeof mappedRecord]) {
              recordErrors.push({ type: 'missing_required', message: field });
            }
          }

          // Validate data types and formats
          if (mappedRecord.age_at_detention && (isNaN(Number(mappedRecord.age_at_detention)) || Number(mappedRecord.age_at_detention) < 0 || Number(mappedRecord.age_at_detention) > 120)) {
            recordErrors.push({ type: 'invalid_age', message: String(mappedRecord.age_at_detention) });
          }

          const validGenders = ['ذكر', 'أنثى', 'غير معروف'];
          if (mappedRecord.gender && !validGenders.includes(mappedRecord.gender)) {
            recordErrors.push({ type: 'invalid_gender', message: mappedRecord.gender });
          }

          const validStatuses = ['معتقل', 'مفقود', 'مطلق سراح', 'متوفى', 'غير معروف'];
          if (mappedRecord.status && !validStatuses.includes(mappedRecord.status)) {
            recordErrors.push({ type: 'invalid_status', message: mappedRecord.status });
          }

          if (recordErrors.length > 0) {
            invalidRecords++;
            errors.push({
              record: mappedRecord.full_name || `Record ${recordIndex + 1}`,
              errors: recordErrors
            });
            continue;
          }

          // Check for duplicates
          const { data: existingRecords } = await supabase
            .from('detainees')
            .select('id')
            .eq('full_name', normalizeArabicText(mappedRecord.full_name))
            .eq('date_of_detention', mappedRecord.date_of_detention);

          if (existingRecords && existingRecords.length > 0) {
            duplicateRecords++;
            errors.push({
              record: mappedRecord.full_name,
              errors: [{ type: 'duplicate', message: 'سجل مكرر' }]
            });
            continue;
          }

          // Insert valid record
          const normalizedRecord = {
            full_name: normalizeArabicText(mappedRecord.full_name),
            date_of_detention: mappedRecord.date_of_detention,
            last_seen_location: normalizeArabicText(mappedRecord.last_seen_location),
            contact_info: mappedRecord.contact_info,
            detention_facility: normalizeArabicText(mappedRecord.detention_facility || ''),
            physical_description: normalizeArabicText(mappedRecord.physical_description || ''),
            age_at_detention: parseInt(mappedRecord.age_at_detention),
            gender: mappedRecord.gender,
            status: mappedRecord.status,
            additional_notes: normalizeArabicText(mappedRecord.additional_notes || ''),
            source_organization: normalizeArabicText(mappedRecord.source_organization)
          };

          await supabase.from('detainees').insert(normalizedRecord);
          validRecords++;

        } catch (error) {
          invalidRecords++;
          errors.push({
            record: record.الاسم_الكامل || `Record ${recordIndex + 1}`,
            errors: [{
              type: 'invalid_data',
              message: error instanceof Error ? error.message : 'خطأ في معالجة السجل'
            }]
          });
        }

        // Update progress after each record
        processedRecords++;
        await supabase
          .from('upload_sessions')
          .update({
            processed_records: processedRecords,
            valid_records: validRecords,
            invalid_records: invalidRecords,
            duplicate_records: duplicateRecords,
            current_record: `Processing record ${processedRecords}/${records.length}`
          })
          .eq('id', sessionId);
      }
    }

    // Final update
    await supabase
      .from('upload_sessions')
      .update({
        status: 'completed',
        processed_records: records.length,
        valid_records: validRecords,
        invalid_records: invalidRecords,
        duplicate_records: duplicateRecords,
        errors: errors,
        processing_details: {
          ...session.processing_details,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      stats: {
        total: records.length,
        valid: validRecords,
        invalid: invalidRecords,
        duplicates: duplicateRecords
      }
    });

  } catch (error) {
    Logger.error('Processing failed', { error });
    
    if (sessionId) {
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          errors: [{
            record: null,
            errors: [{
              type: 'processing_error',
              message: error instanceof Error ? error.message : 'Unknown error occurred'
            }]
          }]
        })
        .eq('id', sessionId);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
