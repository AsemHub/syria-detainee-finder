import { DetaineeGender, DetaineeStatus } from './database.types';

interface ValidationResult {
  errors: string[];
  isValid: boolean;
}

export function validateRecord(record: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!record.full_name) {
    errors.push('الاسم الكامل مطلوب');
  }

  if (!record.last_seen_location) {
    errors.push('آخر مكان شوهد فيه مطلوب');
  }

  if (!record.contact_info) {
    errors.push('معلومات الاتصال مطلوبة');
  }

  // Validate date_of_detention if provided
  if (record.date_of_detention) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record.date_of_detention)) {
      errors.push('تاريخ الاعتقال غير صالح. يجب أن يكون بتنسيق YYYY-MM-DD');
    } else {
      const date = new Date(record.date_of_detention);
      if (isNaN(date.getTime())) {
        errors.push('تاريخ الاعتقال غير صالح');
      }
    }
  }

  // Validate age_at_detention if provided
  if (record.age_at_detention !== null && record.age_at_detention !== undefined) {
    const age = parseInt(record.age_at_detention);
    if (isNaN(age) || age < 0 || age > 120) {
      errors.push('العمر غير صالح. يجب أن يكون رقماً بين 0 و 120');
    }
  }

  // Validate gender if provided
  if (record.gender) {
    const validGenders = ['male', 'female', 'unknown', 'ذكر', 'انثى', 'أنثى', 'غير معروف'];
    if (!validGenders.includes(record.gender.toLowerCase().trim())) {
      errors.push('قيمة الجنس غير صالحة. يجب أن تكون ذكر، انثى، أو غير معروف');
    }
  }

  // Validate status if provided
  if (record.status) {
    const validStatuses = [
      'in_custody', 'missing', 'released', 'deceased', 'unknown',
      'معتقل', 'مفقود', 'محرر', 'متوفى', 'غير معروف',
      'سجين', 'محتجز', 'مختفي', 'مختفى', 'متوفي', 'ميت', 'شهيد'
    ];
    if (!validStatuses.includes(record.status.toLowerCase().trim())) {
      errors.push('قيمة الحالة غير صالحة. يجب أن تكون معتقل، مفقود، محرر، متوفى، أو غير معروف');
    }
  }

  return {
    errors,
    isValid: errors.length === 0
  };
}

export function normalizeNameForDb(name: string): string {
  if (!name) return '';
  
  return name
    .trim()
    .replace(/[\r\n]+/g, '') // Remove newlines
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[أإآا]/g, 'ا')          // Normalize Arabic alef
    .replace(/[ىئ]/g, 'ي')           // Normalize Arabic ya
    .replace(/[ة]/g, 'ه')            // Normalize Arabic ta marbuta
    .replace(/\s+/g, ' ')            // Replace multiple spaces with single space
    .toLowerCase();                   // Convert to lowercase
}

export function cleanupText(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
}

export function validateGender(gender: string): DetaineeGender {
  if (!gender) return 'unknown';
  
  const normalizedGender = gender.toLowerCase().trim();
  
  switch (normalizedGender) {
    case 'male':
    case 'ذكر':
    case 'رجل':
      return 'male';
    case 'female':
    case 'انثى':
    case 'أنثى':
    case 'امرأة':
      return 'female';
    default:
      return 'unknown';
  }
}

export function validateStatus(status: string): DetaineeStatus {
  if (!status) return 'unknown';
  
  const normalizedStatus = status.toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'in_custody':
    case 'معتقل':
    case 'سجين':
    case 'محتجز':
      return 'in_custody';
    case 'missing':
    case 'مفقود':
    case 'مختفي':
    case 'مختفى':
      return 'missing';
    case 'released':
    case 'محرر':
      return 'released';
    case 'deceased':
    case 'متوفى':
    case 'متوفي':
    case 'ميت':
    case 'شهيد':
      return 'deceased';
    case 'unknown':
    case 'غير معروف':
      return 'unknown';
    default:
      return 'unknown';
  }
}
