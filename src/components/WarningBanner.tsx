"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function WarningBanner() {
  return (
    <Alert variant="destructive" className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
      <AlertTriangle className="h-5 w-5 text-red-500" />
      <AlertTitle className="text-red-500 mb-2 text-lg">تحذير هام</AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-300 space-y-2">
        <p className="font-bold">هذه المنصة مجانية تماماً ولا تتطلب أي مقابل مادي</p>
        <ul className="list-disc list-inside space-y-1">
          <li>لا تدفع أي مبلغ مقابل الحصول على معلومات</li>
          <li>لا تثق بأي شخص يطلب منك المال مقابل معلومات</li>
          <li>جميع الخدمات على هذه المنصة مجانية بالكامل</li>
          <li>أبلغ عن أي محاولة ابتزاز أو طلب مال</li>
        </ul>
        <p className="mt-4 text-sm">
          نحن نعمل على حماية حقوق الضحايا وعائلاتهم. إذا تعرضت لأي محاولة ابتزاز أو طلب مالي،
          يرجى الإبلاغ عنها فوراً.
        </p>
      </AlertDescription>
    </Alert>
  );
}
