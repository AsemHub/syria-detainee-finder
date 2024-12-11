"use client"

import { CSVUploadForm } from "@/components/forms/csv-upload-form"

export default function BulkUploadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bulk Upload Detainee Information</h1>
          <p className="text-muted-foreground">
            Upload multiple detainee records at once using a CSV file. Please ensure your CSV file follows the required format.
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-sm">
          <CSVUploadForm />
        </div>
      </div>
    </div>
  )
}
