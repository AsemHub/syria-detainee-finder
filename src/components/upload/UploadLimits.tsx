"use client"

export function UploadLimits() {
  return (
    <div className="bg-accent/10 border-l-4 border-accent p-4 mb-4 rounded-sm">
      <p className="font-medium text-foreground">حدود التحميل:</p>
      <ul className="list-disc ml-5 mt-2 text-muted-foreground">
        <li>أقصى حجم للملف: 5 ميجابايت</li>
        <li>أقصى عدد من السجلات في الملف: 500</li>
        <li>للمجموعات الكبيرة من البيانات، يرجى تقسيم بياناتك إلى ملفات متعددة</li>
      </ul>
    </div>
  );
}
