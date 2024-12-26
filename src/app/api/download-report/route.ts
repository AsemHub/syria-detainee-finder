import { createServerSupabaseClient } from '@/lib/supabase.server'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { Database } from '@/lib/database.types'

type UploadSession = Database['public']['Tables']['upload_sessions']['Row']

type ProcessingDetails = {
  failed_records: FailedRecord[]
}

interface FailedRecord {
  record: {
    'الاسم الكامل': string
    'مكان آخر مشاهدة': string
    'تاريخ الاعتقال': string
    'مكان الاحتجاز': string
    'الوصف الجسدي': string
    'العمر عند الاعتقال': string
    'الجنس': string
    'الحالة': string
    'ملاحظات إضافية': string
    'معلومات الاتصال': string
  }
  errorType: string
  error: string
  field: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return new NextResponse('Session ID is required', { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Get the failed records from the upload session
  const { data: session, error } = await supabase
    .from('upload_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    return new NextResponse('Failed to fetch session data', { status: 404 })
  }

  // Cast the processing_details to unknown first, then to our expected type
  const processingDetails = session.processing_details as unknown as ProcessingDetails
  const failedRecords = processingDetails?.failed_records || []

  if (!failedRecords || failedRecords.length === 0) {
    return new NextResponse('No failed records found', { status: 404 })
  }

  // Prepare the CSV data
  const csvData = failedRecords.map((item: FailedRecord) => ({
    'الاسم الكامل': item.record['الاسم الكامل'] || '',
    'مكان آخر مشاهدة': item.record['مكان آخر مشاهدة'] || '',
    'تاريخ الاعتقال': item.record['تاريخ الاعتقال'] || '',
    'مكان الاحتجاز': item.record['مكان الاحتجاز'] || '',
    'الوصف الجسدي': item.record['الوصف الجسدي'] || '',
    'العمر عند الاعتقال': item.record['العمر عند الاعتقال'] || '',
    'الجنس': item.record['الجنس'] || '',
    'الحالة': item.record['الحالة'] || '',
    'ملاحظات إضافية': item.record['ملاحظات إضافية'] || '',
    'معلومات الاتصال': item.record['معلومات الاتصال'] || '',
    'نوع الخطأ': item.errorType || '',
    'رسالة الخطأ': item.error || '',
    'الحقل المتأثر': item.field || ''
  }))

  // Add BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF'
  
  // Generate CSV with UTF-8 BOM
  const csv = BOM + Papa.unparse(csvData, {
    header: true
  })

  // Create the response with the CSV data
  const response = new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${encodeURIComponent(session.file_name)}_failed_records_${new Date().toISOString().split('T')[0]}.csv`
    }
  })

  return response
}
