import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import Logger from "@/lib/logger"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try a simple query to check connection
    Logger.info('Testing Supabase connection', { 
      url: process.env.NEXT_PUBLIC_SUPABASE_URL 
    });

    const { data, error } = await supabaseServer
      .from('detainees')
      .select('id')
      .limit(1)

    if (error) {
      Logger.error('Supabase connection error', {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      });

      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      }, { status: 500 })
    }

    Logger.info('Health check successful', {
      recordCount: data?.length ?? 0
    });

    return NextResponse.json({
      status: 'ok',
      message: 'Service is healthy',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    Logger.error('Health check failed', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });

    return NextResponse.json({
      status: 'error',
      message: 'Service check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
