import { SubmitForm } from "@/components/SubmitForm"

export default function SubmitPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl" dir="rtl">
      <h1 className="text-3xl font-bold mb-4">تقديم معلومات عن معتقل</h1>
      <p className="text-muted-foreground mb-8">
        استخدم هذا النموذج لتقديم معلومات عن شخص معتقل. يرجى تقديم أكبر قدر ممكن من التفاصيل
        لمساعدة الآخرين في العثور على أحبائهم.
      </p>
      <SubmitForm />
    </div>
  )
}
