import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Papa from "papaparse"
import { Database, DetaineeGender, DetaineeStatus } from "@/lib/database.types"
import fetch from 'cross-fetch'

// Helper function to validate date
function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Helper function to normalize text for comparison
function normalizeText(text: string | null | undefined, isArabic: boolean = false): string {
  if (!text) return '';
  // Remove extra spaces and normalize
  const normalized = text.trim().normalize('NFKC');
  // Only apply toLowerCase for non-Arabic text
  return isArabic ? normalized : normalized.toLowerCase();
}

// Helper function to check if text is Arabic
function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

// Helper function to validate status
function validateStatus(status: string | null | undefined): DetaineeStatus | null {
  if (!status) return null;
  
  const isArabic = isArabicText(status);
  const normalizedStatus = normalizeText(status, isArabic);
  
  // First try direct match
  if (normalizedStatus in STATUS_MAP) {
    return STATUS_MAP[normalizedStatus];
  }
  
  // For English status, also try with underscores replaced by spaces
  if (!isArabic) {
    const alternateStatus = normalizedStatus.replace(/_/g, ' ');
    if (alternateStatus in STATUS_MAP) {
      return STATUS_MAP[alternateStatus];
    }
  }
  
  return null;
}

// Gender mapping between Arabic and English
const GENDER_MAP: Record<string, DetaineeGender> = {
  'ذكر': 'male',
  'أنثى': 'female',
  'male': 'male',
  'female': 'female',
  'm': 'male',
  'f': 'female'
};

// Helper function to validate gender
function validateGender(gender: string | null | undefined): DetaineeGender | null {
  if (!gender) return null;
  
  const isArabic = isArabicText(gender);
  const normalizedGender = normalizeText(gender, isArabic);
  
  // Try direct match
  if (normalizedGender in GENDER_MAP) {
    return GENDER_MAP[normalizedGender];
  }
  
  // For English gender, also try with underscores replaced by spaces
  if (!isArabic) {
    const alternateGender = normalizedGender.replace(/_/g, ' ');
    if (alternateGender in GENDER_MAP) {
      return GENDER_MAP[alternateGender];
    }
  }
  
  return null;
}

// Status mapping between Arabic and English
const STATUS_MAP: Record<string, DetaineeStatus> = {
  // In custody variations
  'معتقل': 'in_custody',
  'قيد الاعتقال': 'in_custody',
  'في المعتقل': 'in_custody',
  
  // Missing variations
  'مفقود': 'missing',
  'غير معروف المصير': 'missing',
  
  // Released variations
  'محرر': 'released',
  'مفرج عنه': 'released',
  'تم الافراج': 'released',
  'مطلق سراح': 'released',
  
  // Deceased variations
  'متوفى': 'deceased',
  'متوفي': 'deceased',
  'توفي': 'deceased',
  'ميت': 'deceased',
  
  // Unknown variations
  'غير معروف': 'unknown',
  
  // English values (these will be converted to lowercase during comparison)
  'in_custody': 'in_custody',
  'missing': 'missing',
  'released': 'released',
  'deceased': 'deceased',
  'unknown': 'unknown'
};

// Column definitions for CSV upload
// Required columns must be present in the CSV file
// Optional columns can be omitted
const COLUMN_DEFINITIONS = {
  // Required columns
  required: {
    'full_name': {
      alternatives: ['full_name', 'الاسم الكامل', 'الاسم'],
      description: 'الاسم الكامل للمعتقل'
    },
    'last_seen_location': {
      alternatives: ['last_seen_location', 'مكان آخر مشاهدة', 'المكان', 'آخر مكان'],
      description: 'آخر مكان شوهد فيه'
    },
    'contact_info': {
      alternatives: ['contact_info', 'معلومات الاتصال', 'الاتصال'],
      description: 'معلومات الاتصال'
    }
  },
  // Optional columns
  optional: {
    'date_of_detention': {
      alternatives: ['date_of_detention', 'تاريخ الاعتقال', 'التاريخ'],
      description: 'تاريخ الاعتقال (YYYY-MM-DD)'
    },
    'detention_facility': {
      alternatives: ['detention_facility', 'مكان الاحتجاز', 'السجن', 'المعتقل'],
      description: 'مكان الاحتجاز'
    },
    'physical_description': {
      alternatives: ['physical_description', 'الوصف الجسدي', 'الوصف'],
      description: 'الوصف الجسدي'
    },
    'age_at_detention': {
      alternatives: ['age_at_detention', 'العمر عند الاعتقال', 'العمر'],
      description: 'العمر عند الاعتقال (رقم)'
    },
    'gender': {
      alternatives: ['gender', 'الجنس'],
      description: 'الجنس (ذكر/أنثى/غير محدد)'
    },
    'status': {
      alternatives: ['status', 'الحالة', 'الوضع'],
      description: 'الحالة (معتقل/مفقود/محرر/متوفى/غير معروف)'
    },
    'additional_notes': {
      alternatives: ['additional_notes', 'ملاحظات إضافية', 'ملاحظات'],
      description: 'ملاحظات إضافية'
    },
    'organization': {
      alternatives: ['organization', 'المنظمة', 'الجهة'],
      description: 'المنظمة المقدمة للمعلومات'
    }
  }
};

// Helper function to validate column names
function validateColumns(headers: string[]): { 
  isValid: boolean; 
  missingColumns: Array<{
    name: string;
    description: string;
    alternatives: string[];
  }>;
} {
  const missingColumns: Array<{
    name: string;
    description: string;
    alternatives: string[];
  }> = [];
  
  // Check each required column
  for (const [colName, colDef] of Object.entries(COLUMN_DEFINITIONS.required)) {
    const hasColumn = colDef.alternatives.some(alt => headers.includes(alt));
    if (!hasColumn) {
      missingColumns.push({
        name: colName,
        description: colDef.description,
        alternatives: colDef.alternatives
      });
    }
  }
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
}

// Helper function to validate record
function validateRecord(record: any): { 
  isValid: boolean; 
  error?: string; 
  errorType?: string;
  errorField?: string;
  details?: string;
} {
  const errors: string[] = [];
  
  // Required fields
  if (!record.full_name?.trim()) {
    errors.push('Full name is required');
  }
  if (!record.last_seen_location?.trim()) {
    errors.push('Last seen location is required');
  }
  if (!record.contact_info?.trim()) {
    errors.push('Contact information is required');
  }

  // Optional fields validation
  if (record.date_of_detention) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record.date_of_detention)) {
      errors.push('Date must be in YYYY-MM-DD format');
    } else {
      const date = new Date(record.date_of_detention);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date');
      }
    }
  }

  if (record.age_at_detention) {
    const age = parseInt(record.age_at_detention);
    if (isNaN(age) || age < 0 || age > 150 || !Number.isInteger(age)) {
      errors.push('Age must be a whole number between 0 and 150');
    }
  }

  if (record.gender) {
    const normalizedGender = record.gender.toLowerCase().trim();
    if (!['male', 'female', 'ذكر', 'أنثى'].includes(normalizedGender)) {
      errors.push('Invalid gender value. Must be one of: male/ذكر or female/أنثى');
    }
  }

  if (record.status) {
    const normalizedStatus = record.status.toLowerCase().trim();
    if (!['in_custody', 'missing', 'released', 'deceased', 'unknown',
          'معتقل', 'مفقود', 'محرر', 'متوفى', 'غير معروف'].includes(normalizedStatus)) {
      errors.push('Invalid status value. Must be one of: in_custody/معتقل, missing/مفقود, released/محرر, deceased/متوفى, unknown/غير معروف');
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors.join(', '),
    details: errors.length > 0 ? errors : undefined
  };
}

// Helper function to normalize gender
function normalizeGender(gender: string): 'male' | 'female' | 'other' | 'unknown' {
  const genderMap: { [key: string]: 'male' | 'female' | 'other' | 'unknown' } = {
    'ذكر': 'male',
    'أنثى': 'female',
    'غير محدد': 'unknown'
  };
  return genderMap[gender] || 'unknown';
}

// Helper function to normalize status
function normalizeStatus(status: string): 'in_custody' | 'missing' | 'released' | 'deceased' | 'unknown' {
  const statusMap: { [key: string]: 'in_custody' | 'missing' | 'released' | 'deceased' | 'unknown' } = {
    'معتقل': 'in_custody',
    'مفقود': 'missing',
    'محرر': 'released',
    'متوفى': 'deceased',
    'غير معروف': 'unknown'
  };
  return statusMap[status] || 'unknown';
}

// Helper function to normalize date
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Try parsing DD-MM-YYYY format
  const ddmmyyyy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [_, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Already in YYYY-MM-DD format
  const yyyymmdd = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (yyyymmdd) {
    return dateStr;
  }
  
  return null;
}

// Helper function to update upload status
async function updateUploadStatus(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  status: {
    status: 'processing' | 'completed' | 'failed';
    totalRecords: number;
    processedRecords: number;
    validRecords: number;
    invalidRecords: number;
    duplicateRecords: number;
    errors: Array<{ record: string; error: string; details?: string }>;
    currentRecord?: string;
    processingDetails?: {
      invalid_dates: number;
      missing_required: {
        full_name: number;
        last_seen_location: number;
        contact_info: number;
      };
      invalid_data: {
        age: number;
        gender: number;
        status: number;
      };
    };
  }
) {
  try {
    const { error } = await supabase
      .from('upload_sessions')
      .update({
        status: status.status,
        total_records: status.totalRecords,
        processed_records: status.processedRecords,
        valid_records: status.validRecords,
        invalid_records: status.invalidRecords,
        duplicate_records: status.duplicateRecords,
        errors: status.errors,
        current_record: status.currentRecord,
        processing_details: status.processingDetails,
        last_update: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) {
      console.error('Error updating upload status:', error)
    }
  } catch (error) {
    console.error('Error in updateUploadStatus:', error)
  }
}

// Helper function to check for duplicates within the same file
function isDuplicateInFile(record: any, processedRecords: any[]): boolean {
  return processedRecords.some(
    (existingRecord) =>
      existingRecord.full_name === record.full_name &&
      existingRecord.date_of_detention === record.date_of_detention
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const organization = formData.get('organization') as string

    if (!file || !organization) {
      return NextResponse.json(
        { error: 'File and organization are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: fetch,
          headers: { 'x-my-custom-header': 'my-app-name' }
        }
      }
    )

    // Create upload session first
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        file_name: file.name,
        organization,
        status: 'processing',
        total_records: 0,
        processed_records: 0,
        valid_records: 0,
        invalid_records: 0,
        duplicate_records: 0,
        errors: [],
        created_at: new Date().toISOString(),
        last_update: new Date().toISOString(),
        processing_details: {
          invalid_dates: 0,
          missing_required: {
            full_name: 0,
            last_seen_location: 0,
            contact_info: 0
          },
          invalid_data: {
            age: 0,
            gender: 0,
            status: 0
          }
        }
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating upload session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create upload session' },
        { status: 500 }
      )
    }

    const sessionId = session.id

    try {
      // Upload file to Supabase Storage
      const timestamp = new Date().getTime()
      const fileName = `${timestamp}_${file.name}`
      
      // Read file content and create buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('csv-uploads')
        .upload(fileName, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'text/csv'
        })

      if (uploadError) {
        throw uploadError
      }

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase
        .storage
        .from('csv-uploads')
        .getPublicUrl(fileName)

      // Update session with file URL
      await supabase
        .from('upload_sessions')
        .update({
          file_url: publicUrl,
          file_size: buffer.length,
          mime_type: 'text/csv'
        })
        .eq('id', sessionId)

    } catch (uploadError) {
      console.error('Error uploading file:', uploadError)
      // Continue processing even if file upload fails
    }

    // Process file in background
    const text = await file.text()
    const { data, meta: { fields } } = Papa.parse(text, { header: true })

    // Validate columns first
    const columnValidation = validateColumns(fields || [])
    if (!columnValidation.isValid) {
      await updateUploadStatus(supabase, sessionId, {
        status: 'failed',
        totalRecords: 0,
        processedRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        duplicateRecords: 0,
        errors: columnValidation.missingColumns.map(col => ({
          record: 'Column Validation',
          error: `Missing required column: ${col.name}`,
          details: `Description: ${col.description}. Alternatives: ${col.alternatives.join(', ')}`
        }))
      })
      return NextResponse.json({ error: 'Invalid columns', details: columnValidation.missingColumns }, { status: 400 })
    }

    // Initialize processing
    const totalRecords = data.length
    const processingDetails = {
      invalid_dates: 0,
      missing_required: {
        full_name: 0,
        last_seen_location: 0,
        contact_info: 0
      },
      invalid_data: {
        age: 0,
        gender: 0,
        status: 0
      }
    }

    // Start processing in background
    ;(async () => {
      try {
        let processedRecords = 0
        let validRecords = 0
        let invalidRecords = 0
        let duplicateRecords = 0
        const errors: Array<{ record: string; error: string; details?: string }> = []
        const processedSet = new Set()

        for (const record of data) {
          // Update current record being processed
          await updateUploadStatus(supabase, sessionId, {
            status: 'processing',
            totalRecords,
            processedRecords,
            validRecords,
            invalidRecords,
            duplicateRecords,
            errors,
            currentRecord: record.full_name,
            processingDetails
          })

          // Validate record
          const validation = validateRecord(record)
          if (!validation.isValid) {
            invalidRecords++
            errors.push({
              record: record.full_name || 'Unknown',
              error: validation.error || 'Invalid record',
              details: validation.details
            })

            // Update specific error counters
            if (validation.errorType === 'missing_required') {
              processingDetails.missing_required[validation.errorField as keyof typeof processingDetails.missing_required]++
            } else if (validation.errorType === 'invalid_data') {
              processingDetails.invalid_data[validation.errorField as keyof typeof processingDetails.invalid_data]++
            } else if (validation.errorType === 'invalid_date') {
              processingDetails.invalid_dates++
            }

            processedRecords++
            continue
          }

          // Check for duplicates within the file
          if (isDuplicateInFile(record, Array.from(processedSet))) {
            duplicateRecords++
            errors.push({
              record: record.full_name,
              error: 'Duplicate record',
              details: 'This record appears multiple times in the file'
            })
            processedRecords++
            continue
          }

          try {
            // Insert record
            const { error: insertError } = await supabase
              .from('detainees')
              .insert({
                full_name: record.full_name,
                last_seen_location: record.last_seen_location,
                date_of_detention: normalizeDate(record.date_of_detention),
                detention_facility: record.detention_facility,
                physical_description: record.physical_description,
                age_at_detention: record.age_at_detention ? parseInt(record.age_at_detention) : null,
                gender: validateGender(record.gender),
                status: validateStatus(record.status),
                additional_notes: record.additional_notes,
                contact_info: record.contact_info,
                organization
              })

            if (insertError) {
              if (insertError.code === '23505') { // Unique violation
                duplicateRecords++
                errors.push({
                  record: record.full_name,
                  error: 'Duplicate record',
                  details: 'This record already exists in the database'
                })
              } else {
                invalidRecords++
                errors.push({
                  record: record.full_name,
                  error: 'Failed to insert record',
                  details: insertError.message
                })
              }
            } else {
              validRecords++
              processedSet.add(record)
            }
          } catch (error) {
            console.error('Error inserting record:', error)
            invalidRecords++
            errors.push({
              record: record.full_name,
              error: 'Failed to process record',
              details: error instanceof Error ? error.message : 'Unknown error'
            })
          }

          processedRecords++
        }

        // Final update
        await updateUploadStatus(supabase, sessionId, {
          status: 'completed',
          totalRecords,
          processedRecords,
          validRecords,
          invalidRecords,
          duplicateRecords,
          errors,
          processingDetails
        })
      } catch (error) {
        console.error('Error processing file:', error)
        await updateUploadStatus(supabase, sessionId, {
          status: 'failed',
          totalRecords,
          processedRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          duplicateRecords: 0,
          errors: [{
            record: 'System Error',
            error: 'Failed to process file',
            details: error instanceof Error ? error.message : 'Unknown error'
          }],
          processingDetails
        })
      }
    })()

    // Return session ID immediately
    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}
