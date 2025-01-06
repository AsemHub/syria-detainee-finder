export const getErrorMessage = (error: { message: string; type: string }) => {
  switch (error.type) {
    case 'duplicate':
      return 'هذا السجل مكرر في قاعدة البيانات';
    case 'invalid_date':
      return 'تاريخ غير صالح - يجب أن يكون التاريخ بالصيغة التالية: YYYY-MM-DD (مثال: 2020-01-31)';
    case 'missing_required':
      if (error.message.includes('full_name')) {
        return 'حقل الاسم الكامل مطلوب';
      } else if (error.message.includes('date_of_detention')) {
        return 'حقل تاريخ الاعتقال مطلوب';
      } else if (error.message.includes('gender')) {
        return 'حقل الجنس مطلوب';
      } else if (error.message.includes('age_at_detention')) {
        return 'حقل العمر عند الاعتقال مطلوب';
      } else if (error.message.includes('last_seen_location')) {
        return 'حقل مكان آخر مشاهدة مطلوب';
      } else if (error.message.includes('status')) {
        return 'حقل الحالة مطلوب';
      } else if (error.message.includes('contact_info')) {
        return 'حقل معلومات الاتصال مطلوب';
      }
      return `الحقول التالية مطلوبة: ${error.message}`;
    case 'invalid_age':
      return 'العمر يجب أن يكون رقماً صحيحاً بين 0 و 120';
    case 'invalid_gender':
      return 'الجنس يجب أن يكون أحد الخيارات التالية: ذكر، أنثى، غير محدد';
    case 'invalid_status':
      return 'الحالة يجب أن تكون أحد الخيارات التالية: معتقل، مفقود، مطلق سراح، متوفى، غير معروف';
    case 'invalid_data':
      return error.message;
    default:
      return error.message;
  }
};

export const getErrorTypeTitle = (type: string) => {
  switch (type) {
    case 'duplicate':
      return 'سجلات مكررة';
    case 'invalid_date':
      return 'تواريخ غير صالحة';
    case 'missing_required':
      return 'حقول مطلوبة مفقودة';
    case 'invalid_age':
      return 'عمر غير صالح';
    case 'invalid_gender':
      return 'جنس غير صالح';
    case 'invalid_status':
      return 'حالة غير صالحة';
    case 'invalid_data':
      return 'بيانات غير صالحة';
    default:
      return 'أخطاء أخرى';
  }
};
