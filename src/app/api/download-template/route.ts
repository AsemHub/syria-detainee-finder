import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create CSV content with UTF-8 BOM
    const BOM = '\ufeff';
    const headers = 'full_name,last_seen_location,contact_info,date_of_detention,detention_facility,physical_description,age_at_detention,gender,status,additional_notes';
    const arabicHeaders = 'الاسم الكامل (مطلوب),آخر مكان شوهد فيه (مطلوب),معلومات الاتصال (مطلوب),تاريخ الاعتقال (YYYY-MM-DD),مكان الاعتقال,الوصف الجسدي,العمر (0-120),الجنس (ذكر/أنثى/غير معروف),الحالة (معتقل/مفقود/محرر/متوفى/غير معروف),ملاحظات إضافية';
    
    // Combine with BOM
    const csvContent = BOM + headers + '\n' + arabicHeaders;

    // Create response with proper headers
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8-sig',
        'Content-Disposition': 'attachment; filename="template.csv"',
      },
    });
  } catch (error) {
    console.error('Error serving template:', error);
    return new NextResponse('Error serving template', { status: 500 });
  }
}
