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
export const VALID_STATUSES = ['معتقل', 'مفقود', 'مطلق سراح', 'متوفى', 'متوفي', 'مغيب قسراً', 'غير معروف', 'detained', 'missing', 'released', 'deceased', 'forcibly_disappeared', 'unknown'] as const;

// Mapping of various input formats to standardized values
export const GENDER_MAPPING: Record<string, DetaineeGender> = {
  'ذكر': 'ذكر',
  'انثى': 'أنثى',
  'انثي': 'أنثى',
  'أنثى': 'أنثى',
  'غير معروف': 'غير معروف',
  'male': 'ذكر',
  'female': 'أنثى',
  'unknown': 'غير معروف'
};

export const STATUS_MAPPING: Record<string, DetaineeStatus> = {
  'معتقل': 'معتقل',
  'مفقود': 'مفقود',
  'مطلق سراح': 'مطلق سراح',
  'متوفى': 'متوفى',
  'متوفي': 'متوفى',
  'مغيب قسرا': 'مغيب قسراً',
  'مغيب قسراً': 'مغيب قسراً',
  'غير معروف': 'غير معروف',
  'detained': 'معتقل',
  'missing': 'مفقود',
  'released': 'مطلق سراح',
  'deceased': 'متوفى',
  'forcibly_disappeared': 'مغيب قسراً',
  'unknown': 'غير معروف'
};

export function validateGender(gender: string): DetaineeGender {
  const normalizedGender = normalizeArabicText(gender.toLowerCase().trim());
  const mappedGender = GENDER_MAPPING[normalizedGender];
  
  if (!mappedGender) {
    throw new Error(`قيمة الجنس غير صالحة / Invalid gender: ${gender}. يجب أن تكون / Must be one of: ذكر، أنثى، غير معروف`);
  }
  
  return mappedGender;
}

export function validateStatus(status: string): DetaineeStatus {
  // Special handling for 'مغيب قسراً' since it contains a special character
  if (status.trim() === 'مغيب قسراً' || status.trim() === 'مغيب قسرا') {
    return 'مغيب قسراً';
  }

  const normalizedStatus = normalizeArabicText(status.toLowerCase().trim());
  const mappedStatus = STATUS_MAPPING[normalizedStatus];
  
  if (!mappedStatus) {
    throw new Error(`قيمة الحالة غير صالحة / Invalid status: ${status}. يجب أن تكون / Must be one of: معتقل، مفقود، مطلق سراح، متوفى، مغيب قسراً، غير معروف`);
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
  'تاريخ آخر مشاهدة': 'date_of_detention',
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
  const requiredFields = [
    'full_name',           // Name is required
    'date_of_detention',   // Date is required
    'gender',             // Gender is required
    'age_at_detention',   // Age is required
    'last_seen_location', // Location is required
    'status',            // Status is required
    'contact_info'       // Contact info is now required
  ];
  const missingHeaders = requiredFields.filter(field => !standardizedHeaders.includes(field));
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders
  };
}

// Convert Arabic numerals to Western numerals
export function convertArabicNumerals(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  return text.replace(/[٠١٢٣٤٥٦٧٨٩]/g, char => 
    String.fromCharCode(char.charCodeAt(0) - '٠'.charCodeAt(0) + '0'.charCodeAt(0))
  );
}

// Validate age with stricter checks
export function validateAge(age: string | number | null | undefined): boolean {
  if (!age) return false;
  
  // Convert Arabic numerals if the age is a string
  if (typeof age === 'string') {
    // First check if the string contains only digits
    if (!/^\d+$/.test(age)) {
      return false;
    }
    
    const convertedAge = convertArabicNumerals(age);
    if (!convertedAge) return false;
    
    const numericAge = parseInt(convertedAge, 10);
    return !isNaN(numericAge) && numericAge >= 0 && numericAge <= 120;
  }
  
  // Handle numeric age
  return age >= 0 && age <= 120;
}

// Record validation function
export function validateRecord(record: Record<string, string>): ValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!record.full_name?.trim()) {
    errors.push('حقل الاسم الكامل مطلوب');
  }

  if (!record.contact_info?.trim()) {
    errors.push('معلومات الاتصال مطلوبة');
  }

  // Validate name format
  if (record.full_name?.trim() && !/^[\u0600-\u06FF\s'-]+$/.test(record.full_name.trim())) {
    errors.push('الاسم يجب أن يحتوي على أحرف عربية فقط مع السماح بالمسافات والشرطة');
  }

  // Validate date format if provided
  if (record.date_of_detention?.trim()) {
    const parsedDate = parseDate(record.date_of_detention);
    if (!parsedDate) {
      errors.push('تاريخ آخر مشاهدة غير صالح');
    }
  }

  // Validate age if provided
  if (record.age_at_detention?.trim()) {
    if (!/^\d+$/.test(record.age_at_detention.trim())) {
      errors.push('العمر يجب أن يكون رقماً صحيحاً');
    } else if (!validateAge(record.age_at_detention)) {
      errors.push('العمر يجب أن يكون بين 0 و 120');
    }
  }

  // Validate status
  try {
    validateStatus(record.status);
  } catch {
    errors.push('الحالة يجب أن تكون أحد الخيارات التالية: معتقل، مفقود، مطلق سراح، متوفى، مغيب قسراً، غير معروف');
  }

  // Validate gender
  try {
    validateGender(record.gender);
  } catch {
    errors.push('الجنس يجب أن يكون أحد الخيارات التالية: ذكر، أنثى، غير معروف');
  }

  // Validate text field lengths
  if (record.physical_description?.length > 1000) {
    errors.push('الوصف الجسدي يجب أن يكون أقل من 1000 حرف');
  }

  if (record.additional_notes?.length > 1000) {
    errors.push('الملاحظات الإضافية يجب أن تكون أقل من 1000 حرف');
  }

  if (record.last_seen_location?.length > 200) {
    errors.push('الموقع يجب أن يكون أقل من 200 حرف');
  }

  if (record.detention_facility?.length > 200) {
    errors.push('مكان الاحتجاز يجب أن يكون أقل من 200 حرف');
  }

  return {
    errors,
    isValid: errors.length === 0
  };
}
