import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create CSV content with UTF-8 BOM and only English headers
    const BOM = '\ufeff';
    const headers = 'full_name,last_seen_location,contact_info,date_of_detention,detention_facility,physical_description,age_at_detention,gender,status,additional_notes';
    
    // Combine with BOM
    const csvContent = BOM + headers;

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
