import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import Logger from '@/lib/logger';
import { normalizeArabicText } from '@/lib/arabic-utils';
import { validateGender, validateStatus } from '@/lib/validation';
import { Database } from '@/lib/database.types';
import dayjs from 'dayjs';

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
  // Arabic field names with underscores
  الاسم_الكامل?: string;
  تاريخ_الاعتقال?: string;
  آخر_مكان?: string;
  معلومات_الاتصال?: string;
  مكان_الاحتجاز?: string;
  الوصف_الجسدي?: string;
  العمر?: string;
  الجنس?: string;
  الحالة?: string;
  ملاحظات?: string;
  المنظمة?: string;
  
  // Arabic field names with spaces
  'الاسم الكامل'?: string;
  'تاريخ الاعتقال'?: string;
  'مكان آخر مشاهدة'?: string;
  'معلومات الاتصال'?: string;
  'مكان الاحتجاز'?: string;
  'الوصف الجسدي'?: string;
  'العمر عند الاعتقال'?: string;
  'ملاحظات اضافية'?: string;
  'المنظمة المسجلة'?: string;
  
  // English field names
  full_name?: string;
  date_of_detention?: string;
  last_seen_location?: string;
  contact_info?: string;
  detention_facility?: string;
  physical_description?: string;
  age_at_detention?: string;
  gender?: string;
  status?: string;
  additional_notes?: string;
  organization?: string;
  
  // Allow any string key for dynamic access
  [key: string]: string | undefined;
}

// Helper function to normalize record fields
function normalizeRecord(record: CsvRecord): Record<string, string> {
  const normalized: Record<string, string> = {};
  
  // Map English/Arabic fields to normalized names
  const fieldMappings = {
    full_name: record.full_name || record.الاسم_الكامل || record['الاسم الكامل'] || '',
    date_of_detention: record.date_of_detention || record.تاريخ_الاعتقال || record['تاريخ الاعتقال'] || '',
    last_seen_location: record.last_seen_location || record['مكان آخر مشاهدة'] || record.آخر_مكان || '',
    contact_info: record.contact_info || record.معلومات_الاتصال || record['معلومات الاتصال'] || '',
    detention_facility: record.detention_facility || record.مكان_الاحتجاز || record['مكان الاحتجاز'] || '',
    physical_description: record.physical_description || record.الوصف_الجسدي || record['الوصف الجسدي'] || '',
    age_at_detention: record.age_at_detention || record['العمر عند الاعتقال'] || record.العمر || '',
    gender: record.gender || record.الجنس || '',
    status: record.status || record.الحالة || '',
    additional_notes: record.additional_notes || record.ملاحظات || record['ملاحظات اضافية'] || '',
    organization: record.organization || record.المنظمة || record['المنظمة المسجلة'] || ''
  };

  // Clean and normalize each field
  for (const [key, value] of Object.entries(fieldMappings)) {
    // Handle special cases for age and dates
    if (key === 'age_at_detention' && value) {
      // Try to extract numeric value from age field
      const numericAge = value.replace(/[^\d]/g, '');
      normalized[key] = numericAge || '';
    } else if (key === 'date_of_detention' && value) {
      // Try to parse date in various formats
      const dateFormats = ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD'];
      let parsedDate = null;
      for (const format of dateFormats) {
        const date = dayjs(value, format);
        if (date.isValid()) {
          parsedDate = date.format('YYYY-MM-DD');
          break;
        }
      }
      normalized[key] = parsedDate || value;
    } else {
      // Normal text field normalization
      normalized[key] = normalizeArabicText(String(value || '').trim());
    }
  }

  return normalized;
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
      throw new Error('Session not found');
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
        current_record: 'بدء التحقق من صحة البيانات...'
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
          const mappedRecord = normalizeRecord(record);

          // Validate required fields
          const requiredFields = ['full_name', 'date_of_detention', 'gender', 'age_at_detention', 'last_seen_location', 'status'];
          for (const field of requiredFields) {
            const value = mappedRecord[field];
            if (!value || value.trim() === '') {
              recordErrors.push({ type: 'missing_required', message: field });
            }
          }

          // Validate data types and formats
          if (mappedRecord.age_at_detention) {
            const age = Number(mappedRecord.age_at_detention);
            if (isNaN(age) || age < 0 || age > 120) {
              recordErrors.push({ type: 'invalid_age', message: mappedRecord.age_at_detention });
            }
          }

          // Validate date format
          if (mappedRecord.date_of_detention) {
            const date = dayjs(mappedRecord.date_of_detention);
            if (!date.isValid()) {
              recordErrors.push({ type: 'invalid_date', message: mappedRecord.date_of_detention });
            }
          }

          // Use the validation functions from validation.ts
          if (mappedRecord.gender) {
            try {
              validateGender(mappedRecord.gender);
            } catch (error) {
              recordErrors.push({ type: 'invalid_gender', message: mappedRecord.gender });
            }
          }

          if (mappedRecord.status) {
            try {
              validateStatus(mappedRecord.status);
            } catch (error) {
              recordErrors.push({ type: 'invalid_status', message: mappedRecord.status });
            }
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
            .eq('full_name', mappedRecord.full_name)
            .eq('date_of_detention', mappedRecord.date_of_detention);

          if (existingRecords && existingRecords.length > 0) {
            duplicateRecords++;
            errors.push({
              record: mappedRecord.full_name || `Record ${recordIndex + 1}`,
              errors: [{ type: 'duplicate', message: 'Record already exists' }]
            });
            continue;
          }

          // Map record to database schema
          const now = new Date().toISOString();
          const detaineeRecord = {
            full_name: mappedRecord.full_name,
            original_name: mappedRecord.full_name, // Store original name
            date_of_detention: mappedRecord.date_of_detention,
            last_seen_location: mappedRecord.last_seen_location,
            detention_facility: mappedRecord.detention_facility,
            physical_description: mappedRecord.physical_description,
            age_at_detention: Number(mappedRecord.age_at_detention),
            gender: validateGender(mappedRecord.gender),
            status: validateStatus(mappedRecord.status),
            contact_info: mappedRecord.contact_info,
            additional_notes: mappedRecord.additional_notes,
            source_organization: mappedRecord.organization || session.organization || 'منظمه العداله',
            created_at: now,
            last_update_date: now
          };

          // Additional validation based on database constraints
          if (!detaineeRecord.full_name || detaineeRecord.full_name.trim().length === 0) {
            recordErrors.push({ type: 'invalid_name', message: 'Full name cannot be empty' });
          }

          if (!detaineeRecord.source_organization || detaineeRecord.source_organization.trim().length === 0) {
            recordErrors.push({ type: 'invalid_organization', message: 'Source organization cannot be empty' });
          }

          const age = Number(detaineeRecord.age_at_detention);
          if (isNaN(age) || age < 0 || age > 120) {
            recordErrors.push({ type: 'invalid_age', message: 'Age must be between 0 and 120' });
          }

          if (detaineeRecord.date_of_detention) {
            const detentionDate = new Date(detaineeRecord.date_of_detention);
            const today = new Date();
            if (detentionDate > today) {
              recordErrors.push({ type: 'invalid_date', message: 'Detention date cannot be in the future' });
            }
          }

          if (recordErrors.length > 0) {
            invalidRecords++;
            errors.push({
              record: detaineeRecord.full_name || `Record ${recordIndex + 1}`,
              errors: recordErrors
            });
            continue;
          }

          // Insert valid record
          Logger.info('Attempting to insert record', { detaineeRecord });
          const { data: insertedData, error: insertError } = await supabase
            .from('detainees')
            .insert(detaineeRecord);
          
          if (insertError) {
            Logger.error('Failed to insert record', { error: insertError, record: detaineeRecord });
            invalidRecords++;
            errors.push({
              record: detaineeRecord.full_name || `Record ${recordIndex + 1}`,
              errors: [{ type: 'insertion_error', message: insertError.message }]
            });
            continue;
          }
          
          Logger.info('Successfully inserted record', { insertedData });
          validRecords++;

        } catch (error) {
          Logger.error('Error processing record', { error });
          invalidRecords++;
          errors.push({
            record: record.full_name || record.الاسم_الكامل || `Record ${recordIndex + 1}`,
            errors: [{ type: 'processing_error', message: error instanceof Error ? error.message : 'Unknown error' }]
          });
        }

        // Update progress
        processedRecords++;
        await supabase
          .from('upload_sessions')
          .update({
            processed_records: processedRecords,
            valid_records: validRecords,
            invalid_records: invalidRecords,
            duplicate_records: duplicateRecords,
            current_record: `جاري معالجة السجل ${processedRecords} من ${records.length}`,
            errors: errors.length > 0 ? errors : null
          })
          .eq('id', sessionId);
      }
    }

    // Update final status
    await supabase
      .from('upload_sessions')
      .update({
        status: 'completed',
        processed_records: processedRecords,
        valid_records: validRecords,
        invalid_records: invalidRecords,
        duplicate_records: duplicateRecords,
        current_record: `تمت معالجة ${processedRecords} سجلات`,
        errors: errors.length > 0 ? errors : null,
        processing_details: {
          ...session.processing_details,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    Logger.error('Error processing CSV', { error });

    if (sessionId) {
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', sessionId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
