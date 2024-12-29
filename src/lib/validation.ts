import { DetaineeGender, DetaineeStatus } from './database.types';

interface ValidationResult {
  errors: string[];
  isValid: boolean;
}

// Helper function to normalize Arabic text
function normalizeArabicText(text: string): string {
  if (!text) return '';
  
  const normalized = text.trim()
    .normalize('NFKC') // Normalize to composed form
    .replace(/[\u0623\u0625\u0622]/g, 'ا') // Normalize alef variations, but keep initial alef
    .replace(/[\u0629]/g, 'ة') // Normalize taa marbouta
    .replace(/[\u064A\u0649]/g, 'ي') // Normalize yaa
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .toLowerCase(); // Make case-insensitive

  return normalized;
}

// Helper function to parse dates flexibly
export function parseDate(dateStr: string): string | null {
  if (!dateStr?.trim()) return null;

  try {
    // First try to parse as ISO format (YYYY-MM-DD)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [_, year, month, day] = isoMatch;
      // Validate components
      const y = parseInt(year);
      const m = parseInt(month);
      const d = parseInt(day);
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // Remove any non-date characters
    dateStr = dateStr.trim().replace(/[^\d-/\.]/g, '');

    // Try different date formats
    let parts: string[] = [];
    
    if (dateStr.includes('-')) {
      parts = dateStr.split('-');
    } else if (dateStr.includes('/')) {
      parts = dateStr.split('/');
    } else if (dateStr.includes('.')) {
      parts = dateStr.split('.');
    } else {
      return null;
    }

    // Ensure we have exactly 3 parts
    if (parts.length !== 3) return null;

    // Clean and pad the parts
    parts = parts.map(p => p.trim().padStart(2, '0'));

    // If first part is 4 digits, assume YYYY-MM-DD
    if (parts[0].length === 4) {
      const [year, month, day] = parts;
      const y = parseInt(year);
      const m = parseInt(month);
      const d = parseInt(day);
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // Otherwise assume DD-MM-YYYY
    const [day, month, year] = parts;
    let y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);

    // If year is 2 digits, assume 20xx
    if (year.length === 2) {
      y = 2000 + y;
    }

    // Validate all components
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
}

// Map Arabic gender terms to enum values
const GENDER_VALUES = [
  // Male variations
  'ذكر',
  'رجل',
  'ذ',
  'م',
  'ولد',
  'صبي',
  'شاب',
  'male',
  // Female variations
  'انثى',
  'أنثى',
  'انثي',
  'أنثي',
  'امرأة',
  'مرأة',
  'بنت',
  'فتاة',
  'ا',
  'ف',
  'female',
  // Unknown variations
  'غير معروف',
  'مجهول',
  'غير محدد',
  'لا يوجد',
  '-',
  '؟',
  'غ.م',
  'unknown'
];

// Map Arabic status terms to enum values
const STATUS_VALUES = [
  // In custody variations
  'معتقل',
  'سجين',
  'محتجز',
  'قيد الاعتقال',
  'رهن الاعتقال',
  'موقوف',
  'in_custody',
  
  // Missing variations
  'مفقود',
  'مختفي',
  'مختفي قسريا',
  'اختفاء قسري',
  'غائب',
  'لا يعرف مكانه',
  'missing',
  
  // Released variations
  'محرر',
  'مطلق سراح',
  'حر',
  'تم الافراج',
  'افراج',
  'خروج',
  'released',
  
  // Deceased variations
  'متوفى',
  'متوفي',
  'توفى',
  'توفي',
  'ميت',
  'استشهد',
  'شهيد',
  'قتل',
  'قضى',
  'قضي',
  'deceased',
  
  // Unknown variations
  'غير معروف',
  'مجهول',
  'غير محدد',
  'لا يوجد معلومات',
  'غير واضح',
  '-',
  '؟',
  'غ.م',
  'unknown'
];

export function validateRecord(record: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!record.full_name?.trim()) {
    errors.push('الاسم الكامل مطلوب');
  }

  if (!record.source_organization?.trim()) {
    errors.push('اسم المنظمة مطلوب');
  }

  // Location and contact validation
  if (!record.last_seen_location?.trim()) {
    errors.push('مكان آخر مشاهدة مطلوب');
  }

  if (!record.contact_info?.trim()) {
    errors.push('معلومات الاتصال مطلوبة');
  }

  // Date validation - now required
  const dateStr = record.date_of_detention;
  if (!dateStr) {
    errors.push('تاريخ الاعتقال مطلوب');
  } else if (typeof dateStr === 'string') {
    // Only try to parse if it's not already parsed
    const parsedDate = parseDate(dateStr);
    if (!parsedDate) {
      errors.push('تاريخ الاعتقال غير صالح');
    } else {
      record.date_of_detention = parsedDate;
    }
  }

  // Age validation - now required and more strict
  const age = record.age_at_detention;
  if (age === undefined || age === null || age === '') {
    errors.push('العمر عند الاعتقال مطلوب');
  } else if (!validateAge(age)) {
    errors.push('العمر عند الاعتقال غير صالح');
  }

  // Gender validation - now required
  const gender = record.gender?.trim();
  if (!gender) {
    errors.push('الجنس مطلوب');
  } else {
    record.gender = validateGender(gender);
    if (record.gender === 'unknown') {
      errors.push('الجنس غير صالح');
    }
  }

  // Status validation - now required
  const status = record.status?.trim();
  if (!status) {
    errors.push('الحالة مطلوبة');
  } else {
    record.status = validateStatus(status);
    if (record.status === 'unknown') {
      errors.push('الحالة غير صالحة');
    }
  }

  return {
    errors,
    isValid: errors.length === 0
  };
}

export function normalizeNameForDb(name: string): string {
  return name?.trim() || '';
}

export function cleanupText(text: string | null): string | null {
  return text?.trim() || null;
}

export function validateGender(gender: string): DetaineeGender {
  if (!gender?.trim()) return 'unknown';
  
  const normalizedInput = normalizeArabicText(gender.trim().toLowerCase());

  // Special case handling for single-letter abbreviations
  if (/^[ذمف]$/.test(normalizedInput)) {
    if (normalizedInput === 'ذ' || normalizedInput === 'م') return 'male';
    if (normalizedInput === 'ف') return 'female';
  }

  // Check for male terms
  const maleTerms = ['ذكر', 'رجل', 'ولد', 'صبي', 'شاب', 'male', 'م', 'ذ'];
  for (const term of maleTerms) {
    const normalizedTerm = normalizeArabicText(term);
    if (normalizedTerm === normalizedInput || 
        normalizedInput.includes(normalizedTerm) || 
        normalizedTerm.includes(normalizedInput)) {
      return 'male';
    }
  }

  // Check for female terms
  const femaleTerms = ['انثى', 'أنثى', 'امرأة', 'مرأة', 'بنت', 'فتاة', 'female', 'ف', 'انثي'];
  for (const term of femaleTerms) {
    const normalizedTerm = normalizeArabicText(term);
    if (normalizedTerm === normalizedInput || 
        normalizedInput.includes(normalizedTerm) || 
        normalizedTerm.includes(normalizedInput)) {
      return 'female';
    }
  }

  return 'unknown';
}

export function validateStatus(status: string): DetaineeStatus {
  if (!status?.trim()) return 'unknown';
  
  const normalizedInput = normalizeArabicText(status.trim().toLowerCase());
  
  // Map of status values to their standard form with more precise patterns
  const statusMap = {
    'deceased': [
      'متوفي', 'متوفى', 'متوف', 'توفي', 'توفى', 'توف', 'ميت', 'شهيد', 
      'قتل', 'قضى', 'قضي', 'استشهد', 'وفاة', 'متوفاة'
    ],
    'in_custody': [
      'معتقل', 'معتق', 'سجين', 'محتجز', 'موقوف', 'قيد الاعتقال', 
      'رهن الاعتقال', 'اعتقال', 'في المعتقل', 'في السجن'
    ],
    'missing': [
      'مفقود', 'مختفي', 'مختفى', 'مختف', 'اختفاء', 'اختفاء قسري', 
      'مختفي قسريا', 'غائب', 'مفقودة', 'مختفية'
    ],
    'released': [
      'محرر', 'افراج', 'افرج', 'حر', 'حرية', 'خروج', 'خرج', 
      'اطلاق سراح', 'تحرر', 'مطلق سراح', 'محررة'
    ],
    'unknown': [
      'غير معروف', 'مجهول', 'غير محدد', 'لا يوجد', 'غ.م', 
      'unknown', '-', '؟', 'غير معروفة'
    ]
  };

  // Helper function to check if input matches any pattern
  const matchesPattern = (input: string, pattern: string): boolean => {
    const normalizedPattern = normalizeArabicText(pattern);
    // For short patterns (3 chars or less), require exact match
    if (normalizedPattern.length <= 3) {
      return normalizedPattern === input;
    }
    // For longer patterns, allow partial matches
    return input.includes(normalizedPattern) || normalizedPattern.includes(input);
  };

  // First try exact match
  for (const [standardStatus, patterns] of Object.entries(statusMap)) {
    if (patterns.some(pattern => normalizeArabicText(pattern) === normalizedInput)) {
      return standardStatus as DetaineeStatus;
    }
  }

  // Then try partial matches with the helper function
  for (const [standardStatus, patterns] of Object.entries(statusMap)) {
    if (patterns.some(pattern => matchesPattern(normalizedInput, pattern))) {
      return standardStatus as DetaineeStatus;
    }
  }

  // Log unmatched status for debugging
  console.log(`Unmatched status: ${status} (normalized: ${normalizedInput})`);
  
  return 'unknown';
}

export function validateAge(age: string | number | null | undefined): boolean {
  if (age === null || age === undefined || age === '') return true;
  
  const parsedAge = typeof age === 'string' ? parseInt(age) : age;
  return !isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 120;
}
