"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, FileSpreadsheet, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { useReCaptcha } from "@/hooks/use-recaptcha"

interface CSVFile extends File {
  preview?: string
}

export function CSVUploadForm() {
  const [file, setFile] = useState<CSVFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const { toast } = useToast()
  const { verifyRecaptcha } = useReCaptcha()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0]
    
    if (!uploadedFile) {
      setError("Please upload a file")
      return
    }

    if (!uploadedFile.name.endsWith('.csv')) {
      setError("Please upload a CSV file")
      return
    }

    setError(null)
    setFile(Object.assign(uploadedFile, {
      preview: URL.createObjectURL(uploadedFile)
    }))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  })

  const removeFile = () => {
    setFile(null)
    setError(null)
    setUploadProgress(0)
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      // Verify reCAPTCHA
      const token = await verifyRecaptcha("upload_csv")
      if (!token) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Please try uploading the file again.",
        })
        return
      }

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // TODO: Send file to backend with reCAPTCHA token
      console.log("File uploaded:", file)
      console.log("reCAPTCHA token:", token)
      
      // Show success message
      toast({
        title: "File Uploaded",
        description: "Your CSV file has been uploaded successfully.",
      })

      // Reset after successful upload
      removeFile()
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload file. Please try again.")
      setUploadProgress(0)
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was a problem uploading your file. Please try again.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
          ${error ? 'border-destructive' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop the CSV file here</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Drag and drop a CSV file here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                (Only .csv files are accepted)
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            className="w-full"
            disabled={uploadProgress > 0 && uploadProgress < 100}
          >
            Upload CSV
          </Button>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">CSV Format Guidelines</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your CSV file should include the following columns:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Full Name</li>
          <li>Date of Detention (YYYY-MM-DD)</li>
          <li>Place of Detention</li>
          <li>Detaining Authority</li>
          <li>Current Status (detained/released/unknown)</li>
          <li>Additional Information (optional)</li>
          <li>Submitter Name</li>
          <li>Submitter Relation</li>
          <li>Submitter Contact Email</li>
        </ul>
      </div>
    </div>
  )
}
