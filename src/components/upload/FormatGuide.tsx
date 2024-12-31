"use client"

import { Button } from "../ui/button"

interface FormatGuideProps {
  showFormatGuide: boolean;
  onToggle: () => void;
}

const formatGuide = {
  'الاسم_الكامل | full_name': 'الاسم الكامل للمعتقل (مطلوب، حروف عربية فقط)',
  'تاريخ_الاعتقال | date_of_detention': 'تاريخ الاعتقال (YYYY-MM-DD) (بين 1900 والتاريخ الحالي)',
  'آخر_مكان | last_seen_location': 'آخر مكان شوهد فيه (نص عربي)',
  'معلومات_الاتصال | contact_info': 'معلومات الاتصال',
  'مكان_الاحتجاز | detention_facility': 'مكان الاحتجاز (نص عربي)',
  'الوصف_الجسدي | physical_description': 'الوصف الجسدي (نص عربي)',
  'العمر | age_at_detention': 'العمر عند الاعتقال (رقم صحيح موجب، أقل من 120)',
  'الجنس | gender': 'الجنس (القيم المقبولة: ذكر، أنثى، غير معروف)',
  'الحالة | status': 'الحالة (القيم المقبولة: معتقل، مفقود، مطلق سراح، متوفى، غير معروف)',
  'ملاحظات | additional_notes': 'ملاحظات إضافية (نص عربي)',
  'المنظمة | organization': 'المنظمة المقدمة للمعلومات (مطلوب)'
};

const requiredFields = [
  'الاسم_الكامل',
  'المنظمة'
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
              {Object.keys(formatGuide).map(key => key.split(' | ')[0]).join(',')}
            </div>
            <div className="space-y-2">
              {Object.entries(formatGuide).map(([key, description]) => {
                const arabicKey = key.split(' | ')[0];
                return (
                  <div key={key} className="text-sm">
                    <span className="font-semibold text-primary">{arabicKey}:</span> {description}
                    {requiredFields.includes(arabicKey) && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            <p>ملاحظات مهمة:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>الحقول المميزة بـ <span className="text-destructive">*</span> مطلوبة</li>
              <li>يمكن استخدام أسماء الحقول باللغة العربية أو الإنجليزية</li>
              <li>يمكنك تنزيل <a href="/api/download-template" className="text-primary hover:underline" download="template.csv">قالب CSV</a> للرجوع إليه</li>
              <li>جميع محتويات الحقول يجب أن تكون باللغة العربية</li>
              <li>القيم المحددة مسبقاً (مثل الجنس والحالة) يجب أن تكون مطابقة تماماً للقيم المذكورة</li>
              <li>تأكد من استخدام التنسيق الصحيح للتواريخ (YYYY-MM-DD)</li>
              <li>العمر يجب أن يكون رقماً صحيحاً موجباً وأقل من 120</li>
              <li>تجنب إدخال معلومات شخصية حساسة في حقل الملاحظات</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
