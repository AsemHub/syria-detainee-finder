"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { UploadError } from "@/types/upload"
import { Button } from "../ui/button"
import { Download } from "lucide-react"

interface UploadErrorsProps {
  errors: UploadError[];
  onDownloadReport?: () => void;
}

const getErrorTypeTitle = (type: string) => {
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

const getErrorMessage = (error: { message: string; type: string }) => {
  switch (error.type) {
    case 'duplicate':
      return 'هذا السجل مكرر في قاعدة البيانات';
    case 'invalid_date':
      return 'تاريخ غير صالح - يجب أن يكون بتنسيق YYYY-MM-DD';
    case 'missing_required':
      if (error.message.includes('full_name')) {
        return 'الاسم الكامل مطلوب';
      } else if (error.message.includes('date_of_detention')) {
        return 'تاريخ الاعتقال مطلوب';
      }
      return 'حقول مطلوبة مفقودة';
    case 'invalid_age':
      return 'العمر يجب أن يكون رقماً صحيحاً';
    case 'invalid_gender':
      return 'الجنس يجب أن يكون أحد الخيارات: ذكر/أنثى/غير محدد';
    case 'invalid_status':
      return 'الحالة يجب أن تكون أحد الخيارات: معتقل/مفقود/محرر/متوفى/غير معروف';
    case 'invalid_data':
      return error.message;
    default:
      return error.message;
  }
};

export function UploadErrors({ errors, onDownloadReport }: UploadErrorsProps) {
  if (!errors.length) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">الأخطاء والمشاكل</CardTitle>
        {onDownloadReport && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onDownloadReport}
          >
            <Download className="h-4 w-4" />
            تحميل تقرير الأخطاء
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.map((error, index) => (
          <div key={index} className="space-y-2">
            <h4 className="font-medium">{error.record}</h4>
            <ul className="list-disc list-inside space-y-1">
              {error.errors.map((err, errIndex) => (
                <li key={errIndex} className="text-sm text-destructive">
                  {getErrorMessage(err)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
