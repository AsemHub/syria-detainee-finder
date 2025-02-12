"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "../ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { Input } from "../ui/input"
import Logger from "@/lib/logger"
import { DocumentationIcon } from "../ui/icons"
import { UploadSessionManager } from './UploadSession'
import { UploadProgress } from './UploadProgress'
import { UploadErrors } from './UploadErrors'
import { FileInput } from './FileInput'
import { FormatGuide } from './FormatGuide'
import { UploadLimits } from './UploadLimits'
import { UploadStatus, UploadError, ErrorType, ValidationError } from '@/lib/database.types'
import { Database } from "@/lib/database.types"
import { getErrorMessage } from '@/lib/error-messages';

const formSchema = z.object({
  organization: z.string().min(1, {
    message: "الرجاء إدخال اسم المنظمة"
  }),
})

type FormData = z.infer<typeof formSchema>

export function UploadForm() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0
  });
  const [currentRecord, setCurrentRecord] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);

  // Create session manager instance with callbacks
  const sessionManager = useMemo(() => new UploadSessionManager({
    onProgress: setProcessingProgress,
    onStatusChange: (newStatus: UploadStatus) => {
      setStatus(newStatus);
      if (newStatus === 'completed' || newStatus === 'failed') {
        setIsUploading(false);
      }
    },
    onError: setErrors,
    onStatsUpdate: setStats,
    onCurrentRecord: setCurrentRecord
  }), []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization: "",
    },
  });

  const resetForm = () => {
    setStatus('idle');
    setUploadProgress(0);
    setProcessingProgress(0);
    setErrors([]);
    setStats({
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0
    });
    setCurrentRecord(null);
    setSessionId(null);
    setIsUploading(false);
    setSelectedFile(null);
    form.reset();
  };

  const onSubmit = async (data: FormData) => {
    // Validate file selection
    if (!selectedFile) {
      setErrors([{
        record: '',
        errors: [{
          type: 'validation' as ErrorType,
          message: 'الرجاء اختيار ملف CSV'
        }] as ValidationError[]
      }]);
      return;
    }

    // Reset all state
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
      // Start upload and processing
      await sessionManager.startUpload(selectedFile, data.organization);
    } catch (error) {
      Logger.error('Failed to upload file', error);
      setErrors([{
        record: '',
        errors: [{
          type: 'invalid_data' as ErrorType,
          message: error instanceof Error ? error.message : 'فشل رفع الملف'
        }] as ValidationError[]
      }]);
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (sessionManager) {
        sessionManager.cleanup();
      }
    };
  }, [sessionManager]);

  const downloadErrorsReport = () => {
    // Create CSV content with UTF-8 BOM and proper encoding
    const BOM = '\ufeff';
    const rows = [
      ['السجل', 'نوع الخطأ', 'تفاصيل الخطأ'],
      ...errors.map(error => 
        Array.isArray(error.errors) ? error.errors.map(err => [
          error.record || '',
          err.type || 'other',
          getErrorMessage(err) // Use the existing Arabic error messages
        ]) : [[
          error.record || '',
          'error',
          getErrorMessage({ type: 'invalid_data', message: error.errors })
        ]]
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
    link.setAttribute('download', `تقرير_الأخطاء_${new Date().toISOString().slice(0, 19).replace(/:/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <DocumentationIcon className="w-8 h-8 text-foreground" />
          <h2 className="text-2xl font-bold">رفع ملف CSV</h2>
        </div>
      </div>

      <FormatGuide 
        showFormatGuide={showFormatGuide}
        onToggle={() => setShowFormatGuide(!showFormatGuide)}
      />

      <UploadLimits />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم المنظمة</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل اسم المنظمة" {...field} />
                </FormControl>
                <FormDescription>
                  اسم المنظمة التي قامت بتوثيق هذه السجلات
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FileInput
            selectedFile={selectedFile}
            isUploading={isUploading}
            onFileSelect={setSelectedFile}
            onError={setErrors}
            onChange={setSelectedFile}
          />

          <Button type="submit" disabled={!selectedFile || isUploading}>
            رفع السجلات
          </Button>

          <UploadProgress
            status={status}
            progress={processingProgress}
            stats={stats}
            currentRecord={currentRecord}
          />

          <UploadErrors
            errors={errors}
            onDownloadReport={errors.length > 0 ? downloadErrorsReport : undefined}
          />

          {status === 'completed' && (
            <div className="mt-6 text-center">
              <Button 
                onClick={resetForm}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                رفع ملف آخر
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
