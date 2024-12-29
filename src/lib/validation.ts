import { DetaineeGender, DetaineeStatus } from './database.types';

interface ValidationResult {
  errors: string[];
  isValid: boolean;
}

// Map Arabic gender terms to enum values
const genderMap: Record<string, DetaineeGender> = {
  'ذكر': 'male',
  'رجل': 'male',
  'انثى': 'female',
  'أنثى': 'female',
  'امرأة': 'female',
  'مرأة': 'female',
  'غير معروف': 'unknown'
};

// Map Arabic status terms to enum values
const statusMap: Record<string, DetaineeStatus> = {
  'معتقل': 'in_custody',
  'مفقود': 'missing',
  'محرر': 'released',
  'متوفى': 'deceased',
  'غير معروف': 'unknown'
};

export function validateRecord(record: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!record.full_name?.trim()) {
    errors.push('الاسم الكامل مطلوب');
  }

  if (!record.source_organization?.trim()) {
    errors.push('اسم المنظمة مطلوب');
  }

  // Date validation
  if (record.date_of_detention) {
    const date = new Date(record.date_of_detention);
    if (isNaN(date.getTime())) {
      errors.push('تاريخ الاعتقال غير صالح');
    }
  }

  // Age validation
  if (record.age_at_detention !== null && record.age_at_detention !== undefined) {
    const age = parseInt(record.age_at_detention);
    if (isNaN(age) || age < 0 || age > 120) {
      errors.push('العمر عند الاعتقال غير صالح');
    }
  }

  // Gender validation
  if (record.gender && !['male', 'female', 'unknown'].includes(record.gender)) {
    errors.push('الجنس غير صالح');
  }

  // Status validation
  if (record.status && !['in_custody', 'missing', 'released', 'deceased', 'unknown'].includes(record.status)) {
    errors.push('الحالة غير صالحة');
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
  const normalizedGender = gender?.trim().toLowerCase();
  return genderMap[normalizedGender] || 'unknown';
}

export function validateStatus(status: string): DetaineeStatus {
  const normalizedStatus = status?.trim();
  return statusMap[normalizedStatus] || 'unknown';
}
