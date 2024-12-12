import { SubmissionForm } from "@/components/forms/submission-form"
import { Card, CardContent } from "@/components/ui/card"

export default function SubmitPage() {
  return (
    <main className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-right">
          <h1 className="text-3xl font-bold mb-2">تقديم معلومات عن معتقل</h1>
          <p className="text-muted-foreground">
            استخدم هذا النموذج لتقديم معلومات عن شخص معتقل. سيتم مراجعة جميع المعلومات والتحقق منها قبل نشرها.
          </p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <SubmissionForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
