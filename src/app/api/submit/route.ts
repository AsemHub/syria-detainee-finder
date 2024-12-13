import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Insert detainee data
    const { data: detainee, error: detaineeError } = await supabase
      .from('detainees')
      .insert({
        ...data.detaineeInfo,
        status: 'unknown',
        verified: false,
      })
      .select()
      .single()

    if (detaineeError) {
      throw detaineeError
    }

    // Insert submission data
    const { error: submissionError } = await supabase
      .from('submissions')
      .insert({
        detainee_id: detainee.id,
        ...data.submitterInfo,
      })

    if (submissionError) {
      throw submissionError
    }

    return NextResponse.json({ success: true, detainee })
  } catch (error: any) {
    console.error('Error processing submission:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing your submission' },
      { status: 500 }
    )
  }
}
