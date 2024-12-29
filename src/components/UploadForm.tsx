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
import { CheckCircle2, AlertCircle, Loader2, XCircle, Download } from "lucide-react"
import classNames from 'classnames'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Papa from 'papaparse';
import { supabaseClient } from '@/lib/supabase.client'
import { DocumentationIcon } from "./ui/icons";
import Logger from "@/lib/logger"
import { InfoIcon } from "./ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const formSchema = z.object({
  organization: z.string().min(1, {
    message: "الرجاء إدخال اسم المنظمة"
  }),
})

type FormData = z.infer<typeof formSchema>

type UploadStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

type ErrorMessage = {
  message: string;
  type: string;
}

type UploadError = {
  record: string;
  errors: ErrorMessage[];
}

type ProcessingDetails = {
  current_name?: string;
  current_index?: number;
  total?: number;
}

type UploadSession = {
  id: string;
  status: Exclude<UploadStatus, 'idle'>;
  total_records: number;
  processed_records: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  skipped_duplicates: number;
  errors: UploadError[];
  error_message?: string;
  processing_details: ProcessingDetails;
  current_record?: string;
}

type UploadResponse = {
  sessionId: string;
  totalRecords: number;
  processedRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  skippedDuplicates: number;
  errors: UploadError[];
}

type ProcessingStats = {
  total: number;
  processed: number;
  duplicates: number;
  invalid_dates: number;
  missing_required: {
    full_name: number;
    last_seen_location: number;
    contact_info: number;
  }
  invalid_data: {
    age: number;
    gender: number;
    status: number;
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

const getErrorTypeTitle = (type: string) => {
  switch (type) {
    case 'duplicate':
      return 'سجلات مكررة';
    case 'invalid_date':
      return 'تواريخ غير صالحة';
    case 'missing_required':
      return 'حقول مطلوبة مفقودة';
    case 'invalid_data':
      return 'بيانات غير صالحة';
    default:
      return 'أخطاء أخرى';
  };
};

const getErrorMessage = (error: ErrorMessage) => {
  switch (error.type) {
    case 'duplicate':
      return 'هذا السجل مكرر في قاعدة البيانات';
    case 'invalid_date':
      return 'تاريخ غير صالح - يجب أن يكون بتنسيق YYYY-MM-DD';
    case 'missing_required':
      return 'حقول مطلوبة مفقودة';
    case 'invalid_data':
      if (error.message.includes('age')) {
        return 'العمر يجب أن يكون رقماً صحيحاً';
      } else if (error.message.includes('gender')) {
        return 'الجنس يجب أن يكون أحد الخيارات: ذكر/أنثى/غير محدد';
      } else if (error.message.includes('status')) {
        return 'الحالة يجب أن تكون أحد الخيارات: معتقل/مفقود/محرر/متوفى/غير معروف';
      }
      return error.message;
    default:
      return error.message;
  };
};

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
  const [isUploading, setIsUploading] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [fileKey, setFileKey] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use the client-side Supabase instance
  const supabase = supabaseClient

  useEffect(() => {
    if (!sessionId) return;

    const setupSubscription = () => {
      Logger.debug('Setting up real-time subscription for session', { sessionId });

      const channel = supabase
        .channel(`upload_session_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'upload_sessions',
            filter: `id=eq.${sessionId}`
          },
          (payload) => {
            const data = payload.new as UploadSession;
            Logger.debug('Session update', { sessionId, data });

            // Update stats
            setStats({
              total: data.total_records || 0,
              valid: data.valid_records || 0,
              invalid: data.invalid_records || 0,
              duplicates: data.duplicate_records || 0
            });

            // Update current record if available
            if (data.current_record) {
              setCurrentRecord(data.current_record);
            }

            // Update progress
            if (data.total_records && data.processed_records) {
              const progress = Math.round((data.processed_records / data.total_records) * 100);
              setProcessingProgress(progress);
            }

            // Update errors array from session
            if (data.errors && Array.isArray(data.errors)) {
              setErrors(data.errors);
            }

            // Update status based on session state
            if (data.status === 'completed') {
              Logger.debug('Upload completed', { sessionId });
              setStatus('completed');
              setIsUploading(false);
            } else if (data.status === 'failed') {
              Logger.debug('Upload failed', { sessionId, errorMessage: data.error_message });
              setStatus('failed');
              setIsUploading(false);
              if (data.error_message) {
                setErrors(prev => {
                  const newError: UploadError = {
                    record: '',
                    errors: [{
                      message: data.error_message || 'Unknown error',
                      type: 'error'
                    }]
                  };
                  return prev.some(e => e.errors.some(err => err.message === newError.errors[0].message))
                    ? prev 
                    : [...prev, newError];
                });
              }
            } else if (data.status === 'processing') {
              setStatus('processing');
            }
          }
        )
        .subscribe((status) => {
          Logger.debug('Subscription status', { sessionId, status });

          if (status === 'SUBSCRIBED') {
            Logger.debug('Successfully subscribed to changes', { sessionId });
          } else if (status === 'CLOSED') {
            Logger.debug('Subscription closed', { sessionId });
          } else if (status === 'CHANNEL_ERROR') {
            Logger.error('Channel error', { sessionId });
          }
        });

      return () => {
        Logger.debug('Cleaning up subscription', { sessionId });
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupSubscription();

    // Cleanup subscription on unmount or when sessionId changes
    return () => {
      Logger.debug('Running cleanup', { sessionId });
      cleanup();
    };
  }, [sessionId]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    setStatus('pending');
    setErrors([]);
    setStats({
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0
    });
    setProcessingProgress(0);
    setCurrentRecord(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organization', data.organization);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Upload failed');
      }

      // Set the session ID to enable real-time updates
      setSessionId(responseData.sessionId);
      setStatus('processing');

      // Subscribe to session updates
      Logger.debug('Setting up real-time subscription', { 
        sessionId: responseData.sessionId,
        organization: data.organization 
      });

      const subscription = supabase
        .channel('upload_session_' + responseData.sessionId)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'upload_sessions',
            filter: `id=eq.${responseData.sessionId}`
          },
          (payload) => {
            Logger.debug('Session update received', { 
              sessionId: responseData.sessionId,
              status: payload.new.status,
              payload: payload.new 
            });
            
            const session = payload.new as UploadSession;

            // Update UI based on session status
            if (session.status === 'completed') {
              Logger.debug('Upload completed', { sessionId: responseData.sessionId });
              setStatus('completed');
              setIsUploading(false);
              setStats({
                total: session.total_records,
                valid: session.valid_records,
                invalid: session.invalid_records,
                duplicates: session.duplicate_records
              });
              setErrors(session.errors || []);
              subscription.unsubscribe();
            } else if (session.status === 'failed') {
              Logger.debug('Upload failed', { sessionId: responseData.sessionId, errorMessage: session.error_message });
              setStatus('failed');
              setIsUploading(false);
              setErrors(session.errors || [{
                record: '',
                errors: [{
                  message: session.error_message || 'Unknown error',
                  type: 'error'
                }]
              }]);
              subscription.unsubscribe();
            } else if (session.status === 'processing' && session.processing_details) {
              const { current_index = 0, total = 0 } = session.processing_details;
              setProcessingProgress(total > 0 ? Math.round((current_index / total) * 100) : 0);
              setCurrentRecord(session.processing_details.current_name || null);
              setStats({
                total: session.total_records,
                valid: session.valid_records,
                invalid: session.invalid_records,
                duplicates: session.duplicate_records
              });
            }
          }
        )
        .subscribe();

      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };

    } catch (error) {
      Logger.error('Upload error', { error });
      setStatus('failed');
      setErrors([{ 
        record: '', 
        errors: [{
          message: error instanceof Error ? error.message : 'Upload failed', 
          type: 'error' 
        }]
      }]);
      setIsUploading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setHasFile(true);
    } else {
      setSelectedFile(null);
      setHasFile(false);
    }
  }

  const resetForm = useCallback(() => {
    setStatus('idle');
    setUploadProgress(0);
    setProcessingProgress(0);
    setStats({
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0
    });
    setStatsDetails(initialStats);
    setErrors([]);
    setHasFile(false);
    setCurrentRecord(null);
    setSessionId(null);
    setIsUploading(false);
    setShowErrors(false);
    form.reset();
    setFileKey(prev => prev + 1);
  }, [form]);

  const downloadErrorsReport = () => {
    // Create CSV content with UTF-8 BOM and proper encoding
    const BOM = '\ufeff';
    const rows = [
      ['السجل', 'نوع الخطأ', 'تفاصيل الخطأ'],
      ...errors.map(error => 
        error.errors.map(err => [
          error.record || '',
          getErrorTypeTitle(err.type || 'other'),
          getErrorMessage(err)
        ])
      ).flat()
    ];

    // Convert rows to CSV with proper escaping
    const csvContent = BOM + rows.map(row => 
      row.map(cell => 
        `"${(cell || '').replace(/"/g, '""')}"`
      ).join(',')
    ).join('\n');

    // Create blob with explicit UTF-8 encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8-sig' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `errors_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const errorCount = errors.length;
  const showErrorActions = errorCount > 0 || stats.invalid > 0 || stats.duplicates > 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <DocumentationIcon className="w-8 h-8 text-foreground" />
          <h2 className="text-2xl font-bold">رفع ملف CSV</h2>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFormatGuide(!showFormatGuide)}
        >
          {showFormatGuide ? "إخفاء دليل حقول الملف" : "إظهار دليل حقول الملف"}
        </Button>
      </div>

      {showFormatGuide && (
        <div className="bg-muted p-4 rounded-lg space-y-4">
        <h3 className="font-semibold">حقول الملف المطلوبة</h3>
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
          ملاحظة: يمكنك تنزيل <a href="/api/download-template" className="text-primary hover:underline" download="template.csv">قالب CSV</a> للرجوع إليه. يجب أن تكون أسماء الحقول باللغة الإنجليزية فقط.
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم المنظمة</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  أدخل اسم المنظمة التي تنتمي إليها
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* File Input outside of form controller */}
          <div className="space-y-2">
            <FormLabel>ملف CSV</FormLabel>
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                key={fileKey}
                className="cursor-pointer"
              />
            </div>
            <FormDescription className="text-xs">
              اختر ملف CSV يحتوي على معلومات المعتقلين
            </FormDescription>
          </div>

          <Button 
            type="submit" 
            disabled={!hasFile || status === 'pending' || status === 'processing' || isUploading}
            className="w-full"
          >
            {status === 'pending' ? (
              <div className="flex items-center justify-center">
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                <span>جاري رفع الملف...</span>
              </div>
            ) : status === 'processing' ? (
              <div className="flex items-center justify-center">
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                <span>جاري المعالجة...</span>
              </div>
            ) : (
              <span>رفع الملف</span>
            )}
          </Button>
        </form>
      </Form>

      {/* Processing Status Section */}
      {status === 'processing' && (
        <div className="space-y-4 mt-4">
          {/* Progress Information */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center mb-4">
              <Loader2 className="ml-2 h-5 w-5 animate-spin" />
              <span className="font-semibold">
                {currentRecord ? `جاري معالجة: ${currentRecord}` : 'جاري معالجة الملف...'}
              </span>
            </div>

            {/* Progress Bar */}
            <Progress value={processingProgress} className="mb-4" />
            
            {/* Live Statistics */}
            <CardContent>
              <div className="space-y-4">
                {/* Stats Grid - Mobile First */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-sm text-muted-foreground">اجمالي السجلات:</div>
                    <div className="text-2xl font-bold mt-1">{stats.total}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <div className="text-sm text-muted-foreground">السجلات الصالحة:</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {stats.valid}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm text-muted-foreground flex items-center gap-1 cursor-help">
                            <span>السجلات غير الصالحة:</span>
                            <InfoIcon className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          align="start" 
                          className="bg-popover text-popover-foreground"
                        >
                          <p className="text-sm text-right">سجلات تحتوي على خطأ واحد أو أكثر</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {stats.invalid}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-sm text-muted-foreground">السجلات المكررة:</div>
                    <div className="text-2xl font-bold mt-1">{stats.duplicates}</div>
                  </div>
                </div>

                {/* Error Details Section */}
                {errors && errors.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => setShowErrors(!showErrors)}
                            className="w-full text-right"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>عرض تفاصيل الأخطاء ({errors.length})</span>
                              <InfoIcon className="h-4 w-4" />
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          align="center" 
                          className="bg-popover text-popover-foreground"
                        >
                          <p className="text-sm text-right">
                            تم العثور على {errors.length} خطأ في {stats.invalid} سجل
                            <br />
                            بعض السجلات قد تحتوي على أكثر من خطأ
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {showErrors && (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowErrors(false)}
                            className="w-full sm:w-auto"
                          >
                            إخفاء التفاصيل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadErrorsReport}
                            className="w-full sm:w-auto"
                          >
                            <Download className="h-4 w-4 ml-2" />
                            تحميل تقرير الأخطاء
                          </Button>
                        </div>

                        {/* Error List */}
                        <div className="rounded-lg border bg-card">
                          <div className="divide-y">
                            {errors.map((error, index) => (
                              <div
                                key={index}
                                className="p-3 text-sm hover:bg-muted/50 transition-colors"
                              >
                                <div className="font-medium text-foreground">
                                  {error.record || 'سجل غير معروف'}
                                </div>
                                {error.errors.map((err, i) => (
                                  <div key={i} className="mt-1 text-muted-foreground">
                                    {err.message}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        </div>
      )}

      {/* Completed Status Section */}
      {status === 'completed' && (
        <div className="bg-card p-6 rounded-lg border border-border mt-4">
          <div className="flex items-center text-success mb-4">
            <CheckCircle2 className="ml-2 h-5 w-5" />
            <span className="font-semibold text-foreground">تم رفع الملف بنجاح</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground">اجمالي السجلات:</div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="text-sm text-muted-foreground">السجلات الصالحة:</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {stats.valid}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 cursor-help">
                      <span>السجلات غير الصالحة:</span>
                      <InfoIcon className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    align="start" 
                    className="bg-popover text-popover-foreground"
                  >
                    <p className="text-sm text-right">سجلات تحتوي على خطأ واحد أو أكثر</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {stats.invalid}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground">السجلات المكررة:</div>
              <div className="text-2xl font-bold mt-1">{stats.duplicates}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setStatus('idle');
                form.reset();
                setSelectedFile(null);
                setErrors([]);
                setStats({
                  total: 0,
                  valid: 0,
                  invalid: 0,
                  duplicates: 0,
                });
                setHasFile(false);
                setFileKey(prev => prev + 1);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="w-full sm:w-auto"
            >
              رفع ملف آخر
            </Button>
            {errors.length > 0 && (
              <Button
                variant="outline"
                onClick={downloadErrorsReport}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل تقرير الأخطاء
              </Button>
            )}
          </div>

          {/* Error Details */}
          {errors.length > 0 && (
            <div className="mt-6">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setShowErrors(!showErrors)}
                      className="w-full text-right"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>عرض تفاصيل الأخطاء ({errors.length})</span>
                        <InfoIcon className="h-4 w-4" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    align="center" 
                    className="bg-popover text-popover-foreground"
                  >
                    <p className="text-sm text-right">
                      تم العثور على {errors.length} خطأ في {stats.invalid} سجل
                      <br />
                      بعض السجلات قد تحتوي على أكثر من خطأ
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {showErrors && (
                <div className="space-y-3 mt-3">
                  <div className="rounded-lg border bg-card">
                    <div className="divide-y">
                      {errors.map((error, index) => (
                        <div
                          key={index}
                          className="p-3 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium text-foreground">
                            {error.record || 'سجل غير معروف'}
                          </div>
                          {error.errors.map((err, i) => (
                            <div key={i} className="mt-1 text-muted-foreground">
                              {err.message}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}