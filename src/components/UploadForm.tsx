"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
import { CheckCircle2, AlertCircle, Loader2, XCircle } from "lucide-react"
import classNames from 'classnames'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Papa from 'papaparse';
import { supabaseClient } from '@/lib/supabase.client'

const formSchema = z.object({
  organization: z.string().min(1, {
    message: "الرجاء إدخال اسم المنظمة"
  }),
  file: z.any()
})

type FormData = z.infer<typeof formSchema>

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

type UploadError = {
  record: string
  error: string
  details?: string
}

type UploadResponse = {
  sessionId: string
  totalRecords: number
  processedRecords: number
  validRecords: number
  invalidRecords: number
  duplicateRecords: number
  errors: UploadError[]
}

type ProcessingStats = {
  total: number
  processed: number
  duplicates: number
  invalid_dates: number
  missing_required: {
    full_name: number
    last_seen_location: number
    contact_info: number
  }
  invalid_data: {
    age: number
    gender: number
    status: number
  }
}

const initialStats: ProcessingStats = {
  total: 0,
  processed: 0,
  duplicates: 0,
  invalid_dates: 0,
  missing_required: {
    full_name: 0,
    last_seen_location: 0,
    contact_info: 0
  },
  invalid_data: {
    age: 0,
    gender: 0,
    status: 0
  }
}

const formatGuide = {
  full_name: "الاسم الكامل للمعتقل",
  last_seen_location: "آخر مكان شوهد فيه",
  contact_info: "معلومات الاتصال",
  date_of_detention: "تاريخ الاعتقال (YYYY-MM-DD)",
  detention_facility: "مكان الاحتجاز",
  physical_description: "الوصف الجسدي",
  age_at_detention: "العمر عند الاعتقال (رقم)",
  gender: "الجنس (ذكر/أنثى/غير محدد)",
  status: "الحالة (معتقل/مفقود/محرر/متوفى/غير معروف)",
  additional_notes: "ملاحظات إضافية",
  organization: "المنظمة المقدمة للمعلومات"
}

export function UploadForm() {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [errors, setErrors] = useState<UploadError[]>([])
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0
  })
  const [statsDetails, setStatsDetails] = useState<ProcessingStats>(initialStats)
  const [showFormatGuide, setShowFormatGuide] = useState(false)
  const [hasFile, setHasFile] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use the client-side Supabase instance
  const supabase = supabaseClient

  useEffect(() => {
    if (!sessionId) return

    // Subscribe to changes in the upload_sessions table
    const channel = supabase
      .channel(`upload_progress_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upload_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const data = payload.new

          // Update stats
          setStats({
            total: data.total_records,
            valid: data.valid_records,
            invalid: data.invalid_records,
            duplicates: data.duplicate_records + data.skipped_duplicates // Count both types of duplicates
          })

          // Update current record if available
          if (data.current_record) {
            setCurrentRecord(data.current_record)
          }

          // Update processing progress
          const progress = (data.processed_records / data.total_records) * 100
          setProcessingProgress(Math.round(progress))

          // Update processing details
          if (data.processing_details) {
            setStatsDetails({
              total: data.total_records,
              processed: data.processed_records,
              duplicates: data.skipped_duplicates,
              invalid_dates: data.processing_details.invalid_dates,
              missing_required: data.processing_details.missing_required,
              invalid_data: data.processing_details.invalid_data
            })
          }

          // Update errors if any
          if (data.errors && data.errors.length > 0) {
            setErrors(data.errors)
          }

          // Check completion status
          if (data.status === 'completed') {
            setStatus('completed')
          } else if (data.status === 'failed') {
            setStatus('failed')
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount or when sessionId changes
    return () => {
      channel.unsubscribe()
    }
  }, [sessionId])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization: "",
      file: undefined
    }
  })

  const handleSubmit = async (data: FormData) => {
    try {
      setStatus('uploading')
      setErrors([])
      
      // Parse the CSV first to get total count
      const file = data.file
      const text = await file.text()
      const result = Papa.parse(text, { header: true })
      const totalCount = result.data.length
      
      // Initialize the statistics immediately
      setStats({
        total: totalCount,
        valid: 0,
        invalid: 0,
        duplicates: 0
      })

      // Prepare form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('organization', data.organization)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const { sessionId } = await response.json()

      // Set session ID and switch to processing state
      setSessionId(sessionId)
      setStatus('processing')
      
    } catch (error) {
      console.error('Upload error:', error)
      setStatus('failed')
      setErrors([{ 
        record: 'System Error', 
        error: error instanceof Error ? error.message : 'Upload failed',
        details: 'Failed to process the upload'
      }])
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: any) => void) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(file)
      setHasFile(true)
    }
  }

  const resetForm = useCallback(() => {
    setStatus('idle')
    setUploadProgress(0)
    setProcessingProgress(0)
    setStats({
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0
    })
    setStatsDetails(initialStats)
    setErrors([])
    setHasFile(false)
    setCurrentRecord(null)
    form.reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [form])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">تحميل ملف CSV</h2>
        <Button
          variant="outline"
          onClick={() => setShowFormatGuide(!showFormatGuide)}
        >
          {showFormatGuide ? "إخفاء دليل الشكل" : "إظهار دليل الشكل"}
        </Button>
      </div>

      {showFormatGuide && (
        <div className="bg-muted p-4 rounded-lg space-y-4">
          <h3 className="font-semibold">شكل الملف المطلوب</h3>
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
            ملاحظة: يمكنك تحميل <Button variant="link" className="p-0 h-auto" onClick={() => window.open('/test_comprehensive_detainees_v2.csv')}>ملف CSV العينة</Button> للرجوع إليه.
          </div>
        </div>
      )}

      <div className="bg-accent/10 border-l-4 border-accent p-4 mb-4 rounded-sm">
        <p className="font-medium text-foreground">حدود التحميل:</p>
        <ul className="list-disc ml-5 mt-2 text-muted-foreground">
          <li>أقصى حجم للملف: 5 ميجابايت</li>
          <li>أقصى عدد من السجلات في الملف: 500</li>
          <li>للمجموعات الكبيرة من البيانات، يرجى تقسيم بياناتك إلى ملفات متعددة</li>
        </ul>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم المنظمة*</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل اسم المنظمة" {...field} />
                </FormControl>
                <FormDescription>
                  المنظمة أو الجهة التي تقدم هذه البيانات
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
                <FormLabel>ملف CSV*</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="text/csv,.csv"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        // Create a new File object with the correct MIME type
                        const csvFile = new File(
                          [file],
                          file.name,
                          { type: 'text/csv' }
                        )
                        onChange(csvFile)
                        setHasFile(true)
                      }
                    }}
                    className="rtl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            disabled={!hasFile || status === 'uploading' || status === 'processing'}
            className="w-full"
          >
            {status === 'uploading' ? (
              <div className="flex items-center justify-center">
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : status === 'processing' ? (
              <div className="flex items-center justify-center">
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                <span>جاري المعالجة...</span>
              </div>
            ) : (
              "تحميل الملف"
            )}
          </Button>
        </form>
      </Form>

      {/* Progress Section */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>
              {status === 'uploading' ? 'جاري تحميل الملف...' : 
                currentRecord ? `جاري معالجة: ${currentRecord}` : 'جاري المعالجة...'}
            </span>
            <span>{processingProgress}%</span>
          </div>
          <Progress value={processingProgress} className="w-full" />
        </div>
      )}

      {(status === 'processing' || status === 'completed') && (
        <div className="space-y-6 mt-6">
          {/* Upload statistics */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">السجلات الصالحة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">السجلات غير الصالحة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">السجلات المكررة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.duplicates}</div>
                </CardContent>
              </Card>
            </div>

            {/* Error breakdown */}
            <div className="space-y-4">
              {/* Summary statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statsDetails.invalid_dates > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">تواريخ غير صالحة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-red-600">{statsDetails.invalid_dates} سجل</div>
                    </CardContent>
                  </Card>
                )}

                {(statsDetails.missing_required.full_name > 0 || statsDetails.missing_required.last_seen_location > 0 || statsDetails.missing_required.contact_info > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">حقول مطلوبة مفقودة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {statsDetails.missing_required.full_name > 0 && (
                        <div className="flex justify-between">
                          <span>الاسم</span>
                          <span className="font-bold text-red-600">{statsDetails.missing_required.full_name}</span>
                        </div>
                      )}
                      {statsDetails.missing_required.last_seen_location > 0 && (
                        <div className="flex justify-between">
                          <span>آخر مكان شوهد فيه</span>
                          <span className="font-bold text-red-600">{statsDetails.missing_required.last_seen_location}</span>
                        </div>
                      )}
                      {statsDetails.missing_required.contact_info > 0 && (
                        <div className="flex justify-between">
                          <span>معلومات الاتصال</span>
                          <span className="font-bold text-red-600">{statsDetails.missing_required.contact_info}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {(statsDetails.invalid_data.age > 0 || statsDetails.invalid_data.gender > 0 || statsDetails.invalid_data.status > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">بيانات غير صالحة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {statsDetails.invalid_data.age > 0 && (
                        <div className="flex justify-between">
                          <span>العمر</span>
                          <span className="font-bold text-red-600">{statsDetails.invalid_data.age}</span>
                        </div>
                      )}
                      {statsDetails.invalid_data.gender > 0 && (
                        <div className="flex justify-between">
                          <span>الجنس</span>
                          <span className="font-bold text-red-600">{statsDetails.invalid_data.gender}</span>
                        </div>
                      )}
                      {statsDetails.invalid_data.status > 0 && (
                        <div className="flex justify-between">
                          <span>الحالة</span>
                          <span className="font-bold text-red-600">{statsDetails.invalid_data.status}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Detailed errors grouped by type */}
              {errors.length > 0 && (
                <div className="space-y-4">
                  {Object.entries(errors.reduce((acc, error) => {
                    const type = error.error || 'other';
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(error);
                    return acc;
                  }, {} as Record<string, typeof errors>)).map(([type, typeErrors]) => {
                    const title = type === 'missing_required' ? 'حقول مفقودة' :
                                 type === 'invalid_date' ? 'تواريخ غير صحيحة' :
                                 type === 'invalid_data' ? 'بيانات غير صحيحة' :
                                 type === 'duplicate' ? 'سجلات مكررة' : 'أخطاء أخرى';
                    
                    return (
                      <div key={type} className="bg-background/50 p-4 rounded-lg border">
                        <h4 className="font-semibold mb-3 text-foreground">{title}</h4>
                        <div className="space-y-2">
                          {typeErrors.map((error, index) => (
                            <div key={index} className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 p-3 rounded-lg">
                              <div className="font-semibold text-foreground">{error.record}</div>
                              <div className="text-sm text-destructive dark:text-destructive/90">{error.error}</div>
                              {error.details && <div className="text-xs text-destructive/90 dark:text-destructive/80 mt-1">{error.details}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(status === 'processing' || status === 'completed') && (
        <div className="flex justify-end">
          <Button
            onClick={resetForm}
            variant="secondary"
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            تحميل ملف آخر
          </Button>
        </div>
      )}

      {status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>فشل التحميل</AlertTitle>
          <AlertDescription>
            حدث خطأ أثناء تحميل الملف. يرجى المحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Display current record being processed */}
      {status === 'processing' && currentRecord && (
        <div className="text-sm text-gray-600 mt-2">
          <p className="font-semibold">جاري معالجة: {currentRecord}</p>
        </div>
      )}
      
      {/* Display errors in a scrollable list */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-lg max-h-60 overflow-y-auto">
          <h3 className="text-destructive font-semibold mb-2">أخطاء التحقق</h3>
          <ul className="space-y-2">
            {errors.map((error, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium text-foreground">{error.record || 'Unknown Record'}: </span>
                <span className="text-destructive dark:text-destructive/90">{error.error}</span>
                {error.details && <p className="text-xs text-destructive/90 dark:text-destructive/80 mt-1">{error.details}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
