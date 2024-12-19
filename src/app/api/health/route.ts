import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try a simple query to check connection
    console.log('Testing Supabase connection to:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    const { data, error } = await supabaseServer
      .from('detainees')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Supabase connection error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Database connection failed',
          error: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dbConnected: true,
      recordCount: data
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
