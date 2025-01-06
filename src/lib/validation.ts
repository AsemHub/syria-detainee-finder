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

  // Try to extract date components from Arabic format
  const arabicDateRegex = /(\d{1,2})\s+([^\s\d]+)\s+(\d{4})/;
  const match = dateStr.match(arabicDateRegex);
  
  if (match) {
    const [, day, monthStr, year] = match;
    const month = arabicMonths[normalizeArabicText(monthStr)];
    
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
export const VALID_GENDERS = ['ذكر', 'أنثى', 'انثى', 'انثي', 'غير معروف', 'male', 'female', 'unknown'] as const;
export const VALID_STATUSES = ['معتقل', 'مفقود', 'مطلق سراح', 'متوفى', 'متوفي', 'غير معروف', 'detained', 'missing', 'released', 'deceased', 'unknown'] as const;

// Gender mapping for normalization
const GENDER_MAPPING: Record<string, DetaineeGender> = {
  'ذكر': 'ذكر',
  'أنثى': 'أنثى',
  'انثى': 'أنثى',
  'انثي': 'أنثى',
  'غير معروف': 'غير معروف',
  'male': 'ذكر',
  'female': 'أنثى',
  'unknown': 'غير معروف'
};

// Status mapping for normalization
const STATUS_MAPPING: Record<string, DetaineeStatus> = {
  'معتقل': 'معتقل',
  'مفقود': 'مفقود',
  'مطلق سراح': 'مطلق سراح',
  'متوفى': 'متوفى',
  'متوفي': 'متوفى',
  'غير معروف': 'غير معروف',
  'detained': 'معتقل',
  'missing': 'مفقود',
  'released': 'مطلق سراح',
  'deceased': 'متوفى',
  'unknown': 'غير معروف'
};

export function validateGender(gender: string): DetaineeGender {
  const normalizedGender = normalizeArabicText(gender.toLowerCase().trim());
  const mappedGender = GENDER_MAPPING[normalizedGender];
  
  if (!mappedGender) {
    throw new Error(`قيمة الجنس غير صالحة / Invalid gender: ${gender}. يجب أن تكون / Must be one of: ${Object.keys(GENDER_MAPPING).join(', ')}`);
  }
  
  return mappedGender;
}

export function validateStatus(status: string): DetaineeStatus {
  const normalizedStatus = normalizeArabicText(status.toLowerCase().trim());
  const mappedStatus = STATUS_MAPPING[normalizedStatus];
  
  if (!mappedStatus) {
    throw new Error(`قيمة الحالة غير صالحة / Invalid status: ${status}. يجب أن تكون / Must be one of: ${Object.keys(STATUS_MAPPING).join(', ')}`);
  }
  
  return mappedStatus;
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
  'مكان_الاحتجاز': 'detention_facility',
  'الوصف_الجسدي': 'physical_description',
  'العمر_عند_الاعتقال': 'age_at_detention',
  'الجنس': 'gender',
  'الحالة': 'status',
  'معلومات_الاتصال': 'contact_info',
  'المنظمة': 'organization',
  
  // Arabic without underscores
  'الاسم الكامل': 'full_name',
  'تاريخ الاعتقال': 'date_of_detention',
  'مكان آخر مشاهدة': 'last_seen_location',
  'مكان الاحتجاز': 'detention_facility',
  'الوصف الجسدي': 'physical_description',
  'العمر عند الاعتقال': 'age_at_detention',
  'معلومات الاتصال': 'contact_info',
  'ملاحظات اضافية': 'additional_notes',
  'المنظمة المسجلة': 'organization'
};

// Helper function to get the standardized header
export function getStandardizedHeader(header: string): string {
  // First normalize the Arabic text
  const normalizedHeader = normalizeArabicText(header.trim());
  return HEADER_MAPPINGS[normalizedHeader] || normalizedHeader;
}

// Helper function to check if a header is valid (in either language)
export function isValidHeader(header: string): boolean {
  return header in HEADER_MAPPINGS;
}

// Update the validateHeaders function to be more flexible
export function validateHeaders(headers: string[]): { isValid: boolean; missingHeaders: string[] } {
  const standardizedHeaders = headers.map(header => getStandardizedHeader(header));
  const requiredFields = ['full_name', 'date_of_detention', 'gender', 'age_at_detention', 'last_seen_location', 'status'];
  const missingHeaders = requiredFields.filter(field => !standardizedHeaders.includes(field));
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders
  };
}

// Record validation function
export function validateRecord(record: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const requiredFields = ['full_name', 'date_of_detention', 'gender', 'age_at_detention', 'last_seen_location', 'status'];
  
  // Check required fields
  for (const field of requiredFields) {
    const value = record[field];
    if (!value || value.trim() === '') {
      errors.push(field);
    }
  }

  // Validate date if present
  if (record.date_of_detention) {
    const parsedDate = parseDate(record.date_of_detention);
    if (!parsedDate) {
      errors.push('date_of_detention');
    }
  }

  // Validate age if present
  if (record.age_at_detention) {
    if (!validateAge(record.age_at_detention)) {
      errors.push('age_at_detention');
    }
  }

  // Validate gender if present
  if (record.gender) {
    const normalizedGender = normalizeArabicText(record.gender.trim());
    try {
      validateGender(normalizedGender);
    } catch {
      errors.push('gender');
    }
  }

  // Validate status if present
  if (record.status) {
    const normalizedStatus = normalizeArabicText(record.status.trim());
    try {
      validateStatus(normalizedStatus);
    } catch {
      errors.push('status');
    }
  }

  return {
    errors,
    isValid: errors.length === 0
  };
}

// Validate age
export function validateAge(age: string | number | null | undefined): boolean {
  if (!age) return false;
  const numericAge = typeof age === 'string' ? parseInt(age, 10) : age;
  return !isNaN(numericAge) && numericAge >= 0 && numericAge <= 120;
}
