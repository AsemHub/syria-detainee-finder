"use client"

import { Button } from "../ui/button"

interface FormatGuideProps {
  showFormatGuide: boolean;
  onToggle: () => void;
}

const formatGuide = {
  'full_name': 'الاسم الكامل للمعتقل (مطلوب)',
  'date_of_detention': 'تاريخ الاعتقال (YYYY-MM-DD) (مطلوب)',
  'last_seen_location': 'آخر مكان شوهد فيه (مطلوب)',
  'contact_info': 'معلومات الاتصال (مطلوب)',
  'detention_facility': 'مكان الاحتجاز',
  'physical_description': 'الوصف الجسدي',
  'age_at_detention': 'العمر عند الاعتقال (رقم صحيح موجب)',
  'gender': 'الجنس (ذكر/أنثى/غير محدد) (مطلوب)',
  'status': 'الحالة (معتقل/مفقود/محرر/متوفى/غير معروف) (مطلوب)',
  'additional_notes': 'ملاحظات إضافية',
  'organization': 'المنظمة المقدمة للمعلومات'
};

const requiredFields = [
  'full_name', 
  'date_of_detention', 
  'last_seen_location', 
  'contact_info',
  'gender',
  'status'
];

export function FormatGuide({ showFormatGuide, onToggle }: FormatGuideProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onToggle}
        >
          {showFormatGuide ? "إخفاء دليل حقول الملف" : "إظهار دليل حقول الملف"}
        </Button>
      </div>

      {showFormatGuide && (
        <div className="bg-muted p-4 rounded-lg space-y-4">
          <h3 className="font-semibold">حقول الملف</h3>
          <div className="grid gap-2">
            <div className="text-sm font-mono bg-background p-2 rounded overflow-x-auto whitespace-nowrap">
              {Object.keys(formatGuide).join(',')}
            </div>
            <div className="space-y-2">
              {Object.entries(formatGuide).map(([key, description]) => (
                <div key={key} className="text-sm">
                  <span className="font-semibold text-primary">{key}:</span> {description}
                  {requiredFields.includes(key) && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            <p>ملاحظات:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>الحقول المميزة بـ <span className="text-destructive">*</span> مطلوبة</li>
              <li>يجب أن تكون أسماء الحقول باللغة الإنجليزية فقط</li>
              <li>يمكنك تنزيل <a href="/api/download-template" className="text-primary hover:underline" download="template.csv">قالب CSV</a> للرجوع إليه</li>
              <li>تأكد من استخدام التنسيق الصحيح للتواريخ (YYYY-MM-DD)</li>
              <li>العمر يجب أن يكون رقماً صحيحاً موجباً</li>
              <li>الجنس يجب أن يكون أحد الخيارات: ذكر/أنثى/غير محدد</li>
              <li>الحالة يجب أن تكون أحد الخيارات: معتقل/مفقود/محرر/متوفى/غير معروف</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
