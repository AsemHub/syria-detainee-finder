import { UploadForm } from "@/components/UploadForm"

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl" dir="rtl">
      <h1 className="text-3xl font-bold mb-4">رفع ملف بيانات</h1>
      <p className="text-muted-foreground mb-8">
        قم برفع سجلات متعددة للمعتقلين عبر ملف CSV. سيقوم النظام بالتحقق من صحة البيانات والبحث عن التكرارات
        قبل إضافة السجلات الجديدة.
      </p>
      <UploadForm />
    </div>
  )
}