"use client"

import { Progress } from "../ui/progress"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { UploadStatus, UploadStats } from '@/lib/database.types'

interface UploadProgressProps {
  status: UploadStatus;
  progress: number;
  stats: UploadStats;
  currentRecord: string | null;
}

export function UploadProgress({ status, progress, stats, currentRecord }: UploadProgressProps) {
  return (
    <div className="space-y-4">
      {status !== 'idle' && (
        <>
          <Progress value={progress} className="w-full" />
          
          <Alert variant={status === 'failed' ? 'destructive' : 'default'}>
            <div className="flex items-center gap-2">
              {status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
              {status === 'failed' && <AlertCircle className="h-4 w-4" />}

              <AlertTitle>
                {status === 'pending' && 'جاري رفع الملف...'}
                {status === 'processing' && 'جاري معالجة السجلات...'}
                {status === 'completed' && 'تم رفع ومعالجة السجلات بنجاح'}
                {status === 'failed' && 'لم نتمكن من رفع أو معالجة السجلات'}
              </AlertTitle>
            </div>

            <AlertDescription className="mt-2">
              {(status === 'processing' || status === 'completed') && (
                <div className="text-sm space-y-1">
                  <p>إجمالي السجلات: {stats.total}</p>
                  <p>السجلات الصالحة: {stats.valid}</p>
                  <p>السجلات غير الصالحة: {stats.invalid}</p>
                  <p>السجلات المكررة: {stats.duplicates}</p>
                  {currentRecord && <p className="mt-2 text-sm text-muted-foreground">{currentRecord}</p>}
                </div>
              )}
              {status === 'failed' && (
                <div className="text-sm mt-2">
                  <p>يرجى مراجعة الأخطاء أدناه وتصحيح البيانات المطلوبة</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  )
}
