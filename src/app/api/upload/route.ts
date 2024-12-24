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
      description: 'الحالة (معتقل/مفقود/متوفى/غير معروف)'
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

// Validation constants
const VALIDATION_RULES = {
  MAX_AGE: 120,
  MIN_AGE: 0,
  VALID_STATUSES: ['معتقل', 'مفقود', 'متوفى'],
  DATE_FORMAT: 'YYYY-MM-DD'
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
  
  // Normalize the headers
  const normalizedHeaders = headers.map(header => normalizeText(header, isArabicText(header)));
  console.log('Normalized headers:', normalizedHeaders);
  
  // Check each required column
  for (const [colName, colDef] of Object.entries(COLUMN_DEFINITIONS.required)) {
    // Normalize alternatives
    const normalizedAlternatives = colDef.alternatives.map(alt => 
      normalizeText(alt, isArabicText(alt))
    );
    console.log(`Checking column ${colName}:`, { normalizedAlternatives });
    
    const hasColumn = normalizedAlternatives.some(alt => 
      normalizedHeaders.some(header => header === alt)
    );
    
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
} {
  // Check required fields
  const requiredFields = ['full_name', 'last_seen_location', 'contact_info'];
  for (const field of requiredFields) {
    const value = getFieldValue(record, getArabicAlternatives(field));
    if (!value) {
      return {
        isValid: false,
        error: `الحقل ${getArabicAlternatives(field)[0]} مطلوب`,
        errorType: 'missing_required',
        errorField: field
      };
    }
  }

  // Validate age
  const age = getFieldValue(record, ['age', 'العمر']);
  if (age) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) {
      return {
        isValid: false,
        error: 'يجب أن يكون العمر رقماً',
        errorType: 'invalid_age'
      };
    }
    if (ageNum < VALIDATION_RULES.MIN_AGE || ageNum > VALIDATION_RULES.MAX_AGE) {
      return {
        isValid: false,
        error: `يجب أن يكون العمر بين ${VALIDATION_RULES.MIN_AGE} و ${VALIDATION_RULES.MAX_AGE}`,
        errorType: 'invalid_age'
      };
    }
  }

  // Validate status
  const status = getFieldValue(record, ['status', 'الحالة']);
  if (status && !VALIDATION_RULES.VALID_STATUSES.includes(status)) {
    return {
      isValid: false,
      error: `يجب أن تكون الحالة إحدى القيم التالية: ${VALIDATION_RULES.VALID_STATUSES.join('، ')}`,
      errorType: 'invalid_status'
    };
  }

  // Validate date format
  const date = getFieldValue(record, ['date_of_detention', 'تاريخ الاعتقال']);
  if (date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return {
        isValid: false,
        error: `يجب أن يكون التاريخ بصيغة ${VALIDATION_RULES.DATE_FORMAT}`,
        errorType: 'invalid_date'
      };
    }
  }

  return { isValid: true };
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
    skippedDuplicates: number;
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
        skipped_duplicates: status.skippedDuplicates,
        errors: status.errors,
        current_record: status.currentRecord,
        processing_details: status.processingDetails,
        updated_at: new Date().toISOString()
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
  const name = getFieldValue(record, ['full_name', 'الاسم الكامل', 'الاسم']) || 'سجل غير معروف';
  const location = getFieldValue(record, ['last_seen_location', 'مكان آخر مشاهدة', 'المكان', 'آخر مكان']);
  const date = getFieldValue(record, ['date_of_detention', 'تاريخ الاعتقال', 'التاريخ']);
  
  return processedRecords.some(existingRecord => {
    const existingName = getFieldValue(existingRecord, ['full_name', 'الاسم الكامل', 'الاسم']);
    const existingLocation = getFieldValue(existingRecord, ['last_seen_location', 'مكان آخر مشاهدة', 'المكان', 'آخر مكان']);
    const existingDate = getFieldValue(existingRecord, ['date_of_detention', 'تاريخ الاعتقال', 'التاريخ']);
    
    return name === existingName && 
           location === existingLocation && 
           date === existingDate;
  });
}

// Helper function to get field value considering all possible column names
function getFieldValue(record: any, fieldAlternatives: string[]) {
  for (const alt of fieldAlternatives) {
    const value = record[alt];
    if (value !== undefined && value !== null && value.toString().trim() !== '') {
      return value.toString().trim();
    }
  }
  return null;
}

// Helper function to get Arabic alternatives for a field
function getArabicAlternatives(field: string): string[] {
  switch (field) {
    case 'full_name':
      return ['الاسم الكامل', 'الاسم'];
    case 'last_seen_location':
      return ['مكان آخر مشاهدة', 'المكان', 'آخر مكان'];
    case 'contact_info':
      return ['معلومات الاتصال', 'الاتصال'];
    case 'date_of_detention':
      return ['تاريخ الاعتقال', 'التاريخ'];
    case 'detention_facility':
      return ['مكان الاحتجاز', 'السجن', 'المعتقل'];
    case 'physical_description':
      return ['الوصف الجسدي', 'الوصف'];
    case 'age_at_detention':
      return ['العمر عند الاعتقال', 'العمر'];
    case 'gender':
      return ['الجنس'];
    case 'status':
      return ['الحالة', 'الوضع'];
    case 'additional_notes':
      return ['ملاحظات إضافية', 'ملاحظات'];
    default:
      return [];
  }
}

// Error message translations
const errorMessages = {
  duplicate_record: {
    en: 'Duplicate record',
    ar: 'سجل مكرر'
  },
  duplicate_in_file: {
    en: 'This record appears multiple times in the file',
    ar: 'هذا السجل موجود عدة مرات في الملف'
  },
  duplicate_in_database: {
    en: 'This record already exists in the database',
    ar: 'هذا السجل موجود مسبقاً في قاعدة البيانات'
  },
  missing_required: {
    en: 'Missing required field',
    ar: 'حقل مطلوب مفقود'
  },
  invalid_date: {
    en: 'Invalid date format',
    ar: 'صيغة التاريخ غير صحيحة'
  },
  date_format: {
    en: 'Date must be in YYYY-MM-DD format',
    ar: 'يجب أن يكون التاريخ بصيغة YYYY-MM-DD'
  },
  invalid_age: {
    en: 'Invalid age format',
    ar: 'صيغة العمر غير صحيحة'
  },
  age_format: {
    en: 'Age must be a number',
    ar: 'يجب أن يكون العمر رقماً'
  },
  invalid_status: {
    en: 'Invalid status',
    ar: 'حالة غير صحيحة'
  },
  status_format: {
    en: 'Status must be one of: detained, missing, deceased',
    ar: 'يجب أن تكون الحالة إحدى القيم التالية: معتقل، مفقود، متوفى'
  },
  field_names: {
    full_name: {
      en: 'full name',
      ar: 'الاسم الكامل'
    },
    last_seen_location: {
      en: 'last seen location',
      ar: 'مكان آخر مشاهدة'
    },
    contact_info: {
      en: 'contact information',
      ar: 'معلومات الاتصال'
    },
    age: {
      en: 'age',
      ar: 'العمر'
    },
    status: {
      en: 'status',
      ar: 'الحالة'
    }
  }
};

function getLocalizedError(key: string, field?: string): { error: string; details: string } {
  switch (key) {
    case 'missing_required':
      return {
        error: `${errorMessages.missing_required.ar}: ${field ? errorMessages.field_names[field as keyof typeof errorMessages.field_names]?.ar || field : ''}`,
        details: `الحقل ${field ? errorMessages.field_names[field as keyof typeof errorMessages.field_names]?.ar || field : ''} مطلوب`
      };
    case 'invalid_date':
      return {
        error: errorMessages.invalid_date.ar,
        details: errorMessages.date_format.ar
      };
    case 'invalid_age':
      return {
        error: errorMessages.invalid_age.ar,
        details: errorMessages.age_format.ar
      };
    case 'invalid_status':
      return {
        error: errorMessages.invalid_status.ar,
        details: errorMessages.status_format.ar
      };
    case 'duplicate_in_file':
      return {
        error: errorMessages.duplicate_record.ar,
        details: errorMessages.duplicate_in_file.ar
      };
    case 'duplicate_in_database':
      return {
        error: errorMessages.duplicate_record.ar,
        details: errorMessages.duplicate_in_database.ar
      };
    default:
      return {
        error: 'خطأ في البيانات',
        details: key
      };
  }
}

export async function POST(request: Request) {
  console.log('Upload endpoint called')
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const organization = formData.get('organization') as string

    console.log('Received file:', { 
      name: file?.name, 
      size: file?.size,
      organization 
    })

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

    console.log('Creating upload session')
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
        skipped_duplicates: 0,
        errors: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    console.log('Upload session created:', { sessionId })

    // Start background processing
    console.log('Starting background processing')
    processFileInBackground(file, sessionId, organization, supabase).catch(error => {
      console.error('Background processing error:', error)
    })

    // Return session ID immediately
    return NextResponse.json({ 
      sessionId: sessionId,
      message: 'Upload started successfully'
    })

  } catch (error) {
    console.error('Upload endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Separate function for background processing
async function processFileInBackground(
  file: File, 
  sessionId: string, 
  organization: string,
  supabase: ReturnType<typeof createClient>
) {
  console.log('Background processing started for session:', sessionId)
  try {
    // First upload the file to Supabase storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    // Transliterate Arabic organization name to English and remove special characters
    const safeOrgName = organization
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_') // Replace special chars with underscore
      .replace(/[\u0600-\u06FF]/g, '') // Remove Arabic characters
      .trim()
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    const fileName = `${safeOrgName || 'org'}_${timestamp}_${file.name}`
    
    // Read file content once
    const text = await file.text()
    console.log('File text read successfully')
    
    // Create a Buffer from the text content
    const buffer = Buffer.from(text)
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('csv-uploads')
      .upload(fileName, buffer, {
        contentType: 'text/csv',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError)
      await updateUploadStatus(supabase, sessionId, {
        status: 'failed',
        totalRecords: 0,
        processedRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        duplicateRecords: 0,
        skippedDuplicates: 0,
        errors: [{
          record: 'File Upload',
          error: 'Failed to upload file to storage',
          details: uploadError.message
        }]
      })
      return
    }

    console.log('File uploaded to storage:', uploadData)
    
    // Parse the CSV content we already read
    const { data, meta: { fields } } = Papa.parse(text, { header: true })
    console.log('CSV parsed successfully', { 
      totalRecords: data.length, 
      fields,
      firstRecord: data[0] 
    })

    // Validate columns first
    const columnValidation = validateColumns(fields || [])
    console.log('Column validation result:', columnValidation)
    
    if (!columnValidation.isValid) {
      console.log('Column validation failed')
      await updateUploadStatus(supabase, sessionId, {
        status: 'failed',
        totalRecords: 0,
        processedRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        duplicateRecords: 0,
        skippedDuplicates: 0,
        errors: columnValidation.missingColumns.map(col => ({
          record: 'Column Validation',
          error: `Missing required column: ${col.name}`,
          details: `Description: ${col.description}. Alternatives: ${col.alternatives.join(', ')}`
        })),
        processingDetails: {
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
      return
    }

    // Initialize processing
    const totalRecords = data.length
    console.log('Starting record processing', { totalRecords })
    
    let processedRecords = 0
    let validRecords = 0
    let invalidRecords = 0
    let duplicateRecords = 0
    let skippedDuplicates = 0
    const errors: Array<{ record: string; error: string; details?: string }> = []
    const processedSet = new Set()
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
    for (const record of data) {
      const fullName = getFieldValue(record, ['full_name', 'الاسم الكامل', 'الاسم']) || 'سجل غير معروف';
      console.log('Processing record:', { 
        name: fullName, 
        processed: processedRecords + 1,
        total: totalRecords 
      });

      // Update current record being processed
      await updateUploadStatus(supabase, sessionId, {
        status: 'processing',
        totalRecords,
        processedRecords,
        validRecords,
        invalidRecords,
        duplicateRecords,
        skippedDuplicates,
        errors,
        currentRecord: fullName,
        processingDetails
      });

      // Validate record
      const validationResult = validateRecord(record);
      if (!validationResult.isValid) {
        console.log('Record validation failed:', { 
          name: fullName, 
          error: validationResult.error,
          errorType: validationResult.errorType,
          field: validationResult.errorField
        });
        errors.push({
          record: fullName,
          error: validationResult.error || 'خطأ غير معروف',
          details: validationResult.errorType
        });
        invalidRecords++;
        processedRecords++;
        continue;
      }

      // Check for duplicates
      const recordKey = `${fullName}|${getFieldValue(record, ['last_seen_location', 'مكان آخر مشاهدة'])}|${getFieldValue(record, ['date_of_detention', 'تاريخ الاعتقال'])}`;
      if (processedSet.has(recordKey)) {
        console.log('Duplicate record found:', { name: fullName, key: recordKey });
        errors.push({
          record: fullName,
          error: 'هذا السجل موجود عدة مرات في الملف',
          details: 'duplicate'
        });
        duplicateRecords++;
        skippedDuplicates++; // Increment skipped duplicates counter
        processedRecords++;
        continue;
      }
      processedSet.add(recordKey);

      try {
        console.log('Inserting record:', { name: fullName });
        // Insert record
        const { error: insertError } = await supabase
          .from('detainees')
          .insert({
            full_name: getFieldValue(record, ['full_name', 'الاسم الكامل', 'الاسم']),
            last_seen_location: getFieldValue(record, ['last_seen_location', 'مكان آخر مشاهدة', 'المكان', 'آخر مكان']),
            date_of_detention: normalizeDate(getFieldValue(record, ['date_of_detention', 'تاريخ الاعتقال', 'التاريخ'])),
            detention_facility: getFieldValue(record, ['detention_facility', 'مكان الاحتجاز', 'السجن', 'المعتقل']),
            physical_description: getFieldValue(record, ['physical_description', 'الوصف الجسدي', 'الوصف']),
            age_at_detention: getFieldValue(record, ['age_at_detention', 'العمر عند الاعتقال', 'العمر']) ? 
              parseInt(getFieldValue(record, ['age_at_detention', 'العمر عند الاعتقال', 'العمر'])!) : null,
            gender: validateGender(getFieldValue(record, ['gender', 'الجنس'])),
            status: validateStatus(getFieldValue(record, ['status', 'الحالة', 'الوضع'])),
            additional_notes: getFieldValue(record, ['additional_notes', 'ملاحظات إضافية', 'ملاحظات']),
            contact_info: getFieldValue(record, ['contact_info', 'معلومات الاتصال', 'الاتصال']),
            organization
          });

        if (insertError) {
          console.log('Insert error:', { 
            name: fullName, 
            error: insertError.message,
            code: insertError.code 
          });
          if (insertError.code === '23505') { // Unique violation
            duplicateRecords++;
            const localizedError = getLocalizedError('duplicate_in_database');
            errors.push({
              record: fullName,
              error: localizedError.error,
              details: localizedError.details
            });
          } else {
            invalidRecords++;
            errors.push({
              record: fullName,
              error: 'خطأ في إدخال السجل',
              details: insertError.message
            });
          }
        } else {
          console.log('Record inserted successfully:', { name: fullName });
          validRecords++;
          processedSet.add(record);
        }
      } catch (error) {
        console.error('Error inserting record:', {
          name: fullName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        invalidRecords++;
        errors.push({
          record: fullName,
          error: 'Failed to process record',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      processedRecords++;
      console.log('Progress:', {
        processed: processedRecords,
        total: totalRecords,
        valid: validRecords,
        invalid: invalidRecords,
        duplicates: duplicateRecords
      });
    }

    console.log('Processing completed', {
      total: totalRecords,
      processed: processedRecords,
      valid: validRecords,
      invalid: invalidRecords,
      duplicates: duplicateRecords
    });

    // Final update
    await updateUploadStatus(supabase, sessionId, {
      status: 'completed',
      totalRecords,
      processedRecords,
      validRecords,
      invalidRecords,
      duplicateRecords,
      skippedDuplicates,
      errors,
      processingDetails
    })
  } catch (error) {
    console.error('Error in background processing:', error)
    await updateUploadStatus(supabase, sessionId, {
      status: 'failed',
      totalRecords: 0,
      processedRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      skippedDuplicates: 0,
      errors: [{
        record: 'System Error',
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }],
      processingDetails: {
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
  }
}
