import { SubmitForm } from "@/components/SubmitForm"

export default function SubmitPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl" dir="rtl">
      <div className="space-y-4 text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">تقديم معلومات عن معتقلين أو أشخاص مفقودين</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          استخدم هذا النموذج لتقديم معلومات عن شخص معتقل أو مفقود. يرجى تقديم أكبر قدر ممكن من التفاصيل
          لمساعدة الآخرين في العثور على أحبائهم.
        </p>
      </div>
      <SubmitForm />
    </div>
  )
}
