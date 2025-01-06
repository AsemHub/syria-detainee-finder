import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { DetaineeGender, DetaineeStatus } from './database.types';
import { normalizeArabicText } from './arabic-utils';

// Add custom parse format plugin
dayjs.extend(customParseFormat);

interface ValidationResult {
  errors: string[];
  isValid: boolean;
}

// Text normalization utilities
export function normalizeNameForDb(name: string): string {
  // Use the comprehensive normalizeArabicText function
  return normalizeArabicText(name).toLowerCase();
}

export function cleanupText(text: string): string {
  return normalizeArabicText(text);
}

// Date parsing utilities
export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try parsing different date formats
  const formats = [
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'DD/MM/YYYY',
    'YYYY/MM/DD'
  ];

  for (const format of formats) {
    const date = dayjs(dateStr, format);
    if (date.isValid()) {
      return date.format('YYYY-MM-DD');
    }
  }

  // Try parsing Arabic date format
  const arabicMonths: { [key: string]: number } = {
    'يناير': 1, 'كانون الثاني': 1,
    'فبراير': 2, 'شباط': 2,
    'مارس': 3, 'آذار': 3,
    'أبريل': 4, 'نيسان': 4,
    'مايو': 5, 'أيار': 5,
    'يونيو': 6, 'حزيران': 6,
    'يوليو': 7, 'تموز': 7,
    'أغسطس': 8, 'آب': 8,
    'سبتمبر': 9, 'أيلول': 9,
    'أكتوبر': 10, 'تشرين الأول': 10,
    'نوفمبر': 11, 'تشرين الثاني': 11,
    'ديسمبر': 12, 'كانون الأول': 12
  };

  // Match Arabic date format (e.g., "15 شباط 2012")
  const arabicDateRegex = /(\d{1,2})\s+([\u0600-\u06FF\s]+)\s+(\d{4})/;
  const match = dateStr.match(arabicDateRegex);
  
  if (match) {
    const [_, day, monthStr, year] = match;
    const month = arabicMonths[monthStr.trim()];
    
    if (month) {
      const date = dayjs(`${year}-${month}-${day}`, 'YYYY-M-D');
      if (date.isValid()) {
        return date.format('YYYY-MM-DD');
      }
    }
  }

  return null;
}

// Constants matching database constraints
export const VALID_GENDERS = ['ذكر', 'أنثى', 'غير معروف'] as const;
export const VALID_STATUSES = ['معتقل', 'مفقود', 'مطلق سراح', 'متوفى', 'غير معروف'] as const;

// Gender mapping
const GENDER_MAPPING: Record<string, typeof VALID_GENDERS[number]> = {
  'male': 'ذكر',
  'female': 'أنثى',
  'unknown': 'غير معروف',
  'ذكر': 'ذكر',
  'أنثى': 'أنثى',
  'غير معروف': 'غير معروف'
};

// Status mapping
const STATUS_MAPPING: Record<string, typeof VALID_STATUSES[number]> = {
  'detained': 'معتقل',
  'missing': 'مفقود',
  'released': 'مطلق سراح',
  'deceased': 'متوفى',
  'unknown': 'غير معروف',
  'معتقل': 'معتقل',
  'مفقود': 'مفقود',
  'مطلق سراح': 'مطلق سراح',
  'متوفى': 'متوفى',
  'غير معروف': 'غير معروف'
};

export type Gender = typeof VALID_GENDERS[number];
export type Status = typeof VALID_STATUSES[number];

export function validateGender(gender: string): Gender {
  if (!gender) return 'غير معروف';
  
  const normalizedGender = gender.toLowerCase().trim();
  const mappedGender = GENDER_MAPPING[normalizedGender];
  
  return mappedGender || 'غير معروف';
}

export function validateStatus(status: string): Status {
  if (!status) return 'غير معروف';
  
  const normalizedStatus = status.toLowerCase().trim();
  const mappedStatus = STATUS_MAPPING[normalizedStatus];
  
  return mappedStatus || 'غير معروف';
}

// Header mappings for validation
const HEADER_MAPPINGS: Record<string, string> = {
  // English to internal field names
  'full_name': 'full_name',
  'date_of_detention': 'date_of_detention',
  'last_seen_location': 'last_seen_location',
  'detention_facility': 'detention_facility',
  'physical_description': 'physical_description',
  'age_at_detention': 'age_at_detention',
  'gender': 'gender',
  'status': 'status',
  'contact_info': 'contact_info',
  'additional_notes': 'additional_notes',
  'organization': 'organization',
  
  // Arabic with underscores
  'الاسم_الكامل': 'full_name',
  'تاريخ_الاعتقال': 'date_of_detention',
  'آخر_مكان': 'last_seen_location',
  'مكان_الاحتجاز': 'detention_facility',
  'الوصف_الجسدي': 'physical_description',
  'العمر_عند_الاعتقال': 'age_at_detention',
  'العمر': 'age_at_detention',
  'الجنس_': 'gender',
  'الجنس': 'gender',
  'الحالة_': 'status',
  'الحالة': 'status',
  'معلومات_الاتصال': 'contact_info',
  'ملاحظات_اضافية': 'additional_notes',
  'ملاحظات': 'additional_notes',
  'المنظمة_': 'organization',
  'المنظمة': 'organization',
  
  // Arabic with spaces
  'الاسم الكامل': 'full_name',
  'تاريخ الاعتقال': 'date_of_detention',
  'آخر مكان': 'last_seen_location',
  'مكان الاحتجاز': 'detention_facility',
  'الوصف الجسدي': 'physical_description',
  'العمر عند الاعتقال': 'age_at_detention',
  'الجنس ': 'gender',
  'الحالة ': 'status',
  'معلومات الاتصال': 'contact_info',
  'ملاحظات اضافية': 'additional_notes',
  'المنظمة ': 'organization'
} as const;

// Field name mappings for error messages
const FIELD_NAMES_ARABIC: Record<string, string> = {
  'full_name': 'الاسم الكامل',
  'date_of_detention': 'تاريخ الاعتقال',
  'last_seen_location': 'آخر مكان',
  'detention_facility': 'مكان الاحتجاز',
  'physical_description': 'الوصف الجسدي',
  'age_at_detention': 'العمر عند الاعتقال',
  'gender': 'الجنس',
  'status': 'الحالة',
  'contact_info': 'معلومات الاتصال',
  'additional_notes': 'ملاحظات اضافية',
  'organization': 'المنظمة'
} as const;

// Required fields for validation
const REQUIRED_FIELDS = [
  'full_name',
  'date_of_detention',
  'last_seen_location',
  'gender',
  'status',
  'contact_info'
] as const;

// Helper function to check if a header is valid (in either language)
export function isValidHeader(header: string): boolean {
  return header in HEADER_MAPPINGS;
}

// Helper function to get the standardized header
export function getStandardizedHeader(header: string): string {
  const standardized = HEADER_MAPPINGS[header];
  if (!standardized) {
    throw new Error(`Invalid header: ${header}`);
  }
  return standardized;
}

// Update the validateHeaders function to be more flexible
export function validateHeaders(headers: string[]): { isValid: boolean; missingHeaders: string[] } {
  const standardizedHeaders = headers.map(header => {
    try {
      return getStandardizedHeader(header);
    } catch {
      return null;
    }
  });

  const missingHeaders = REQUIRED_FIELDS.filter(
    field => !standardizedHeaders.includes(field)
  );

  return {
    isValid: missingHeaders.length === 0,
    missingHeaders: missingHeaders.map(field => FIELD_NAMES_ARABIC[field] || field)
  };
}

// Record validation function
export function validateRecord(record: Record<string, string>): ValidationResult {
  const errors: string[] = [];

  // Required fields validation
  const requiredFields = ['full_name', 'last_seen_location', 'status', 'gender', 'contact_info'];
  for (const field of requiredFields) {
    if (!record[field] || record[field].trim() === '') {
      errors.push(`الحقل "${FIELD_NAMES_ARABIC[field]}" مطلوب`);
    }
  }

  // Name validation
  if (record.full_name) {
    if (record.full_name.length < 2) {
      errors.push('الاسم قصير جداً');
    } else if (record.full_name.length > 50) {
      errors.push('الاسم طويل جداً');
    }
  }

  // Contact info validation
  if (record.contact_info) {
    if (record.contact_info.length < 2) {
      errors.push('معلومات الاتصال قصيرة جداً');
    } else if (record.contact_info.length > 200) {
      errors.push('معلومات الاتصال طويلة جداً');
    }
  }

  // Location validation
  if (record.last_seen_location && record.last_seen_location.length > 200) {
    errors.push('الموقع طويل جداً');
  }

  // Age validation
  if (record.age_at_detention && !validateAge(record.age_at_detention)) {
    errors.push('العمر يجب أن يكون بين 0 و 120');
  }

  // Status validation
  if (record.status && !validateStatus(record.status)) {
    errors.push('الحالة غير صالحة');
  }

  // Gender validation
  if (record.gender && !validateGender(record.gender)) {
    errors.push('الجنس غير صالح');
  }

  // Optional field validations
  if (record.detention_facility && record.detention_facility.length > 200) {
    errors.push('اسم مكان الاعتقال طويل جداً');
  }

  if (record.physical_description && record.physical_description.length > 500) {
    errors.push('الوصف الجسدي طويل جداً');
  }

  if (record.additional_notes && record.additional_notes.length > 1000) {
    errors.push('الملاحظات الإضافية طويلة جداً');
  }

  return {
    errors,
    isValid: errors.length === 0
  };
}

export function validateAge(age: string | number | null | undefined): boolean {
  if (age === null || age === undefined || age === '') return true;
  
  const parsedAge = typeof age === 'string' ? parseInt(age) : age;
  return !isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 120;
}
