import { serve } from "std/http/server"
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors'
import { Database } from '../../../src/lib/types/database.types'
import { handleCorsRequest } from '../_shared/handle-cors'

interface DetaineeSubmission {
  full_name_ar: string
  full_name_en?: string
  date_of_birth?: string
  place_of_birth_ar?: string
  place_of_birth_en?: string
  gender?: 'male' | 'female' | 'other'
  nationality?: string
  detention_date?: string
  detention_location_ar?: string
  detention_location_en?: string
  last_seen_date?: string
  last_seen_location_ar?: string
  last_seen_location_en?: string
  status?: 'detained' | 'released' | 'deceased' | 'unknown'
  additional_info_ar?: string
  additional_info_en?: string
  submitter_email: string
  submitter_name: string
  submitter_phone?: string
}

// Create a Supabase client
const supabaseClient = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req: Request) => {
  return await handleCorsRequest(req, async () => {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      const submission = await req.json() as DetaineeSubmission

      // Validate required fields
      if (!submission.full_name_ar || !submission.submitter_email || !submission.submitter_name) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields',
            details: 'full_name_ar, submitter_email, and submitter_name are required'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get client IP and user agent for audit log
      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      const userAgent = req.headers.get('user-agent')

      // Insert the detainee
      const { data: detainee, error: insertError } = await supabaseClient
        .from('detainees')
        .insert({
          ...submission,
          verified: false
        })
        .select()
        .single()

      if (insertError) throw insertError

      return new Response(
        JSON.stringify({ 
          success: true,
          data: detainee,
          message: 'Detainee information submitted successfully'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('Error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  })
})
