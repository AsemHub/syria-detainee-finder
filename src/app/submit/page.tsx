import { SubmitDetaineeForm } from "@/components/forms/submit-detainee-form";

export default function SubmitPage() {
  return (
    <main className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit Detainee Information</h1>
          <p className="text-muted-foreground">
            Use this form to submit information about a detained person. All information
            will be reviewed and verified before being made public.
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-sm">
          <SubmitDetaineeForm />
        </div>
      </div>
    </main>
  );
}
