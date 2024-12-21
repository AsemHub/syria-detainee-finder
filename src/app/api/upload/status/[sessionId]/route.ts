import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    // Get upload session status
    const { data: session, error: sessionError } = await supabaseServer
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('Error fetching session:', sessionError)
      return NextResponse.json(
        { error: "Failed to fetch upload status", details: sessionError },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: "Upload session not found" },
        { status: 404 }
      )
    }

    // Calculate progress percentage
    const progress = session.total_records > 0
      ? Math.round((session.processed_records / session.total_records) * 100)
      : 0

    return NextResponse.json({
      id: session.id,
      status: session.status,
      fileName: session.file_name,
      totalRecords: session.total_records,
      processedRecords: session.processed_records,
      skippedDuplicates: session.skipped_duplicates,
      progress,
      error: session.error_message,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      processingDetails: session.processing_details
    })

  } catch (error) {
    console.error('Error polling upload status:', error)
    return NextResponse.json(
      { error: "Failed to fetch upload status", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
