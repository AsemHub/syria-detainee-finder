import { SubmitForm } from "@/components/SubmitForm"

export default function SubmitPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Submit Detainee Information</h1>
      <p className="text-muted-foreground mb-8">
        Use this form to submit information about a detained person. Please provide as much detail as possible
        to help others find their loved ones.
      </p>
      <SubmitForm />
    </div>
  )
}
