"use client"

import { useState } from "react"
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
      (file) => file instanceof File && file.size <= 10 * 1024 * 1024,
      "File size must be less than 10MB"
    )
})

type UploadFormData = z.infer<typeof uploadSchema>

export function UploadForm() {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState<{
    processed: number
    total: number
    skipped: number
  } | null>(null)

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
      
      if (data.status === 'completed') {
        setUploadStatus('completed')
        setProgress(100)
        setStats({
          processed: data.processedRecords,
          total: data.totalRecords,
          skipped: data.skippedDuplicates
        })
        setMessage(`Upload complete! ${data.processedRecords} records processed, ${data.skippedDuplicates} duplicates skipped.`)
      } else if (data.status === 'failed') {
        setUploadStatus('failed')
        setMessage(`Upload failed: ${data.error || 'Unknown error'}`)
      } else {
        setUploadStatus('processing')
        setProgress(data.progress)
        setStats({
          processed: data.processedRecords,
          total: data.totalRecords,
          skipped: data.skippedDuplicates
        })
        setMessage(`Processing records...`)
        // Continue polling if still processing
        setTimeout(() => pollUploadProgress(sessionId), 200)
      }
    } catch (error) {
      console.error('Error polling upload status:', error)
      setUploadStatus('failed')
      setMessage('Failed to check upload status')
    }
  }

  const onSubmit = async (data: UploadFormData) => {
    setUploadStatus('uploading')
    setProgress(0)
    setMessage('Starting upload...')
    setStats(null)

    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('organization', data.organization)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const { sessionId } = await response.json()
      setMessage('Upload started, processing records...')
      pollUploadProgress(sessionId)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                Upload a CSV file containing detainee records. File must be less than 10MB.
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
                  <div className="mt-2 text-sm">
                    <div>Total Records: {stats.total}</div>
                    <div>Processed: {stats.processed}</div>
                    <div>Duplicates Skipped: {stats.skipped}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
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
  )
}
