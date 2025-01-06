"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { UploadError, ValidationError } from '@/lib/database.types'
import { Button } from "../ui/button"
import { Download } from "lucide-react"
import { getErrorMessage, getErrorTypeTitle } from '@/lib/error-messages';

interface UploadErrorsProps {
  errors: UploadError[];
  onDownloadReport?: () => void;
}

export function UploadErrors({ errors, onDownloadReport }: UploadErrorsProps) {
  if (!errors || !errors.length) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">الأخطاء والمشاكل</CardTitle>
        {onDownloadReport && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.preventDefault(); // Prevent form submission
              onDownloadReport();
            }}
          >
            <Download className="h-4 w-4" />
            تحميل تقرير الأخطاء
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.map((error, index) => (
          <div key={index} className="space-y-2">
            <h4 className="font-medium">
              {error.record ? `السجل: ${error.record}` : 'خطأ في الملف'}
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {Array.isArray(error.errors) ? error.errors.map((err: ValidationError, errIndex: number) => (
                <li key={errIndex} className="text-sm text-destructive">
                  {getErrorMessage(err)}
                </li>
              )) : (
                <li className="text-sm text-destructive">
                  {getErrorMessage({ type: 'invalid_data', message: error.errors })}
                </li>
              )}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
