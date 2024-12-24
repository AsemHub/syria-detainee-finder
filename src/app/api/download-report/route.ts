import { createServerSupabaseClient } from '@/lib/supabase.server'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

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
    .select('failed_records, organization')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    return new NextResponse('Failed to fetch session data', { status: 404 })
  }

  if (!session.failed_records || session.failed_records.length === 0) {
    return new NextResponse('No failed records found', { status: 404 })
  }

  // Prepare the CSV data
  const csvData = session.failed_records.map((item: any) => ({
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
    header: true,
    encoding: 'utf-8'
  })

  // Create the response with the CSV data
  const response = new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${encodeURIComponent(session.organization)}_failed_records_${new Date().toISOString().split('T')[0]}.csv`
    }
  })

  return response
}
