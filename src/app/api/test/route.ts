import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import fetch from 'cross-fetch'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Testing Supabase connection...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    console.log('URL:', supabaseUrl)
    
    // First try a direct fetch to the Supabase URL
    try {
      console.log('Testing direct fetch...')
      const response = await fetch(supabaseUrl + '/rest/v1/health')
      console.log('Direct fetch status:', response.status)
      const data = await response.text()
      console.log('Direct fetch response:', data)
    } catch (error) {
      console.error('Direct fetch failed:', error)
    }

    // Then try the Supabase client
    console.log('Testing Supabase client...')
    const start = Date.now()
    const { data, error } = await supabaseServer
      .from('detainees')
      .select('id')
      .limit(1)

    const duration = Date.now() - start

    if (error) {
      console.error('Supabase query failed:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        duration
      })
    }

    return NextResponse.json({ 
      success: true, 
      data,
      duration
    })
  } catch (error) {
    console.error('Test failed with error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : typeof error
    })
  }
}
