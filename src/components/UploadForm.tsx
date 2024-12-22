"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "./ui/progress"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

const uploadSchema = z.object({
  organization: z.string().min(1, "Organization name is required"),
  file: z
    .custom<File>()
    .refine((file) => file instanceof File, "Please select a file")
    .refine(
      (file) => file instanceof File && (file.type === "text/csv" || file.type === "application/vnd.ms-excel"),
      "Only CSV files are allowed"
    )
    .refine(
      (file) => file instanceof File && file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB"
    )
})

type UploadFormData = z.infer<typeof uploadSchema>

export function UploadForm() {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    duplicates: 0,
    invalid_dates: 0,
    missing_required: {
      name: 0,
      location: 0
    },
    invalid_data: {
      age: 0,
      gender: 0,
      status: 0
    }
  })
  const [showFormatGuide, setShowFormatGuide] = useState(false)

  const formatGuide = {
    full_name: "Full name of the detainee",
    arrest_date: "Date of arrest (YYYY-MM-DD)",
    arrest_location: "Location where the person was last seen",
    prison_location: "Known detention facility (if any)",
    health_status: "Physical description or health condition",
    date_of_birth: "Date of birth (YYYY-MM-DD)",
    gender: "Gender (male/female/unknown)",
    legal_status: "Status (detained/released/deceased/missing/unknown)",
    notes: "Additional information"
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      organization: "",
    }
  })

  const pollUploadProgress = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/upload/status/${sessionId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Update stats regardless of status
      setStats({
        total: data.totalRecords || 0,
        processed: data.processedRecords || 0,
        duplicates: data.skippedDuplicates || 0,
        invalid_dates: data.processingDetails?.invalid_detention_date || 0,
        missing_required: {
          name: data.processingDetails?.missing_required_name || 0,
          location: data.processingDetails?.missing_required_location || 0
        },
        invalid_data: {
          age: data.processingDetails?.invalid_age || 0,
          gender: data.processingDetails?.invalid_gender || 0,
          status: data.processingDetails?.invalid_status || 0
        }
      })
      
      if (data.status === 'completed') {
        setUploadStatus('completed')
        setProgress(100)

        // Build completion message
        const messages = []
        if (data.processedRecords > 0) {
          messages.push(`${data.processedRecords} records processed successfully.`)
        }

        // Missing required fields
        const totalMissingRequired = 
          (data.processingDetails?.missing_required_name || 0) +
          (data.processingDetails?.missing_required_location || 0)

        if (totalMissingRequired > 0) {
          messages.push(`${totalMissingRequired} records have missing required fields.`)
        }

        // Invalid dates
        const totalInvalidDates = 
          (data.processingDetails?.invalid_detention_date || 0)

        if (totalInvalidDates > 0) {
          messages.push(`${totalInvalidDates} records have invalid dates.`)
        }

        // Invalid data
        const totalInvalidData = 
          (data.processingDetails?.invalid_age || 0) +
          (data.processingDetails?.invalid_gender || 0) +
          (data.processingDetails?.invalid_status || 0)

        if (totalInvalidData > 0) {
          messages.push(`${totalInvalidData} records have invalid data values.`)
        }

        // Duplicates
        if (data.skippedDuplicates > 0) {
          messages.push(`${data.skippedDuplicates} duplicate records skipped.`)
        }

        setMessage(messages.join(' '))
      } else if (data.status === 'failed') {
        setUploadStatus('failed')
        setMessage(`Upload failed: ${data.error || 'Unknown error'}`)
      } else {
        setUploadStatus('processing')
        setProgress(data.progress)
        setMessage(`Processing records...`)
        // Poll more frequently for better real-time updates
        setTimeout(() => pollUploadProgress(sessionId), 100)
      }
    } catch (error) {
      console.error('Error polling upload status:', error)
      setUploadStatus('failed')
      setMessage('Failed to check upload status')
    }
  }

  const handleSubmit = async (data: UploadFormData) => {
    try {
      setUploadStatus('uploading')
      setProgress(0)
      setMessage('Starting upload...')

      const formData = new FormData()
      formData.append('organization', data.organization)
      formData.append('file', data.file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Start polling for progress
      pollUploadProgress(result.sessionId)

    } catch (error) {
      setUploadStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Upload failed')
      // Clear the file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const resetForm = () => {
    setUploadStatus('idle')
    setProgress(0)
    setMessage('')
    setStats({
      total: 0,
      processed: 0,
      duplicates: 0,
      invalid_dates: 0,
      missing_required: {
        name: 0,
        location: 0
      },
      invalid_data: {
        age: 0,
        gender: 0,
        status: 0
      }
    })
    form.reset()
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Upload CSV File</h2>
        <Button
          variant="outline"
          onClick={() => setShowFormatGuide(!showFormatGuide)}
        >
          {showFormatGuide ? "Hide Format Guide" : "Show Format Guide"}
        </Button>
      </div>

      {showFormatGuide && (
        <div className="bg-muted p-4 rounded-lg space-y-4">
          <h3 className="font-semibold">Required CSV Format</h3>
          <div className="grid gap-2">
            <div className="text-sm font-mono bg-background p-2 rounded overflow-x-auto whitespace-nowrap">
              {Object.keys(formatGuide).join(',')}
            </div>
            <div className="space-y-2">
              {Object.entries(formatGuide).map(([key, description]) => (
                <div key={key} className="text-sm">
                  <span className="font-semibold text-primary">{key}:</span> {description}
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Note: Download our <Button variant="link" className="p-0 h-auto" onClick={() => window.open('/test_comprehensive_detainees_v2.csv')}>sample CSV file</Button> for reference.
          </div>
        </div>
      )}

      <div className="bg-accent/10 border-l-4 border-accent p-4 mb-4 rounded-sm">
        <p className="font-medium text-foreground">Upload Limits:</p>
        <ul className="list-disc ml-5 mt-2 text-muted-foreground">
          <li>Maximum file size: 5MB</li>
          <li>Maximum records per file: 500</li>
          <li>For larger datasets, please split your data into multiple files</li>
        </ul>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Name of the organization providing this data
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="file"
            render={({ field: { onChange, ...field } }) => (
              <FormItem>
                <FormLabel>CSV File</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        onChange(file)
                      }
                    }}
                    {...field}
                    value={undefined}
                  />
                </FormControl>
                <FormDescription>
                  Upload a CSV file containing detainee records. File must be less than 5MB.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {uploadStatus !== 'idle' && (
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              
              <Alert variant={
                uploadStatus === 'failed' ? 'destructive' :
                uploadStatus === 'completed' ? 'default' :
                'default'
              }>
                {uploadStatus === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {uploadStatus === 'processing' && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {uploadStatus === 'completed' && (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {uploadStatus === 'failed' && (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {uploadStatus === 'uploading' && 'Uploading...'}
                  {uploadStatus === 'processing' && 'Processing...'}
                  {uploadStatus === 'completed' && 'Upload Complete'}
                  {uploadStatus === 'failed' && 'Upload Failed'}
                </AlertTitle>
                <AlertDescription>
                  {message}
                  {stats && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold mb-2">Upload Summary</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm bg-white p-3 rounded-md border">
                        <div>Total Valid Records:</div>
                        <div className="font-medium">{stats.total}</div>
                        
                        <div>Successfully Processed:</div>
                        <div className="font-medium text-green-600">{stats.processed}</div>
                        
                        <div>Duplicate Records:</div>
                        <div className="font-medium text-yellow-600">{stats.duplicates}</div>
                        
                        <div>Invalid Dates:</div>
                        <div className="font-medium text-red-600">
                          {stats.invalid_dates}
                        </div>
                        
                        <div>Missing Required Fields:</div>
                        <div className="font-medium text-red-600">
                          {(stats.missing_required.name || 0) + (stats.missing_required.location || 0)}
                        </div>
                        
                        <div>Invalid Data Values:</div>
                        <div className="font-medium text-red-600">
                          {(stats.invalid_data.age || 0) + (stats.invalid_data.gender || 0) + (stats.invalid_data.status || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {uploadStatus === 'completed' && (
                <Button
                  type="button"
                  onClick={resetForm}
                >
                  Upload Another File
                </Button>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
          >
            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Upload CSV
          </Button>
        </form>
      </Form>
    </div>
  )
}
