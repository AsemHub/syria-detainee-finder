"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription className="mt-2 mb-4">
            {error.message || "حدث خطأ ما. يرجى المحاولة مرة أخرى."}
          </AlertDescription>
          <Button onClick={() => reset()} variant="outline" className="mt-2">
            حاول مرة أخرى
          </Button>
        </Alert>
      </div>
    </div>
  )
}
