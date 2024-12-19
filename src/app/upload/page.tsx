import { UploadForm } from "@/components/UploadForm"

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Bulk Upload</h1>
      <p className="text-muted-foreground mb-8">
        Upload multiple detainee records via CSV file. The system will validate the data and check for duplicates
        before adding new records.
      </p>
      <UploadForm />
    </div>
  )
}
