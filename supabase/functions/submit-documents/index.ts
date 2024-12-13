import { serve } from "std/http/server"
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../../../src/lib/types/database.types'
import { handleCorsRequest } from '../_shared/handle-cors.ts'

interface DocumentSubmission {
  detainee_id: string
  document_type: 'id' | 'photo' | 'report' | 'other'
  file_path: string
  description_ar?: string
  description_en?: string
  submitter_email: string
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
      const submission = await req.json() as DocumentSubmission

      // Validate required fields
      if (!submission.detainee_id || !submission.document_type || !submission.file_path || !submission.submitter_email) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields',
            details: 'detainee_id, document_type, file_path, and submitter_email are required'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Verify detainee exists
      const { data: detainee, error: detaineeError } = await supabaseClient
        .from('detainees')
        .select('id')
        .eq('id', submission.detainee_id)
        .single()

      if (detaineeError || !detainee) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid detainee_id',
            details: 'The specified detainee does not exist'
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

      // Insert the document
      const { data: document, error: insertError } = await supabaseClient
        .from('documents')
        .insert({
          detainee_id: submission.detainee_id,
          document_type: submission.document_type,
          file_path: submission.file_path,
          description_ar: submission.description_ar,
          description_en: submission.description_en,
          submitter_email: submission.submitter_email,
          verified: false
        })
        .select()
        .single()

      if (insertError) throw insertError

      return new Response(
        JSON.stringify({ 
          success: true,
          data: document,
          message: 'Document submitted successfully'
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
