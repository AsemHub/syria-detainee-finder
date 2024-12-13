import { serve } from "std/http/server"
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../../../src/lib/types/database.types'
import { handleCorsRequest } from '../_shared/handle-cors.ts'

interface SearchFilter {
  status?: 'detained' | 'released' | 'deceased' | 'unknown'
  gender?: 'male' | 'female' | 'other'
  nationality?: string
  verified?: boolean
  detentionStartDate?: string
  detentionEndDate?: string
  lastSeenStartDate?: string
  lastSeenEndDate?: string
  limit?: number
  offset?: number
}

interface SearchRequest {
  query?: string
  filter?: SearchFilter
  language?: 'ar' | 'en'
}

// Create a Supabase client with the Auth context of the function
const supabaseClient = createClient<Database>(
  // Supabase API URL - env var exported by default.
  Deno.env.get('SUPABASE_URL') ?? '',
  // Supabase API SERVICE ROLE KEY - env var exported by default.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req: Request) => {
  return await handleCorsRequest(req, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      const { query, filter, language = 'ar' } = await req.json() as SearchRequest

      // Normalize Arabic query if present and language is Arabic
      let normalizedQuery = query
      if (language === 'ar' && query) {
        const { data: normalized } = await supabaseClient.rpc('normalize_arabic', {
          input: query
        })
        normalizedQuery = normalized
      }

      // Start building the search query
      let searchQuery = supabaseClient
        .from('detainees')
        .select(`
          *,
          documents!inner (
            id,
            document_type,
            file_path,
            description_ar,
            description_en
          )
        `)

      // Apply text search if query is present
      if (normalizedQuery) {
        if (language === 'ar') {
          searchQuery = searchQuery.or(`
            full_name_ar_normalized.ilike.%${normalizedQuery}%,
            place_of_birth_ar_normalized.ilike.%${normalizedQuery}%,
            detention_location_ar_normalized.ilike.%${normalizedQuery}%,
            last_seen_location_ar_normalized.ilike.%${normalizedQuery}%
          `)
        } else {
          searchQuery = searchQuery.or(`
            full_name_en.ilike.%${query}%,
            place_of_birth_en.ilike.%${query}%,
            detention_location_en.ilike.%${query}%,
            last_seen_location_en.ilike.%${query}%
          `)
        }
      }

      // Apply filters
      if (filter) {
        if (filter.status) {
          searchQuery = searchQuery.eq('status', filter.status)
        }
        if (filter.gender) {
          searchQuery = searchQuery.eq('gender', filter.gender)
        }
        if (filter.nationality) {
          searchQuery = searchQuery.ilike('nationality', `%${filter.nationality}%`)
        }
        if (typeof filter.verified === 'boolean') {
          searchQuery = searchQuery.eq('verified', filter.verified)
        }
        if (filter.detentionStartDate) {
          searchQuery = searchQuery.gte('detention_date', filter.detentionStartDate)
        }
        if (filter.detentionEndDate) {
          searchQuery = searchQuery.lte('detention_date', filter.detentionEndDate)
        }
        if (filter.lastSeenStartDate) {
          searchQuery = searchQuery.gte('last_seen_date', filter.lastSeenStartDate)
        }
        if (filter.lastSeenEndDate) {
          searchQuery = searchQuery.lte('last_seen_date', filter.lastSeenEndDate)
        }
      }

      // Apply pagination
      const limit = filter?.limit ?? 10
      const offset = filter?.offset ?? 0
      searchQuery = searchQuery
        .limit(limit)
        .offset(offset)
        .order('created_at', { ascending: false })

      // Execute the query
      const { data, error, count } = await searchQuery

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          data, 
          count,
          pagination: {
            limit,
            offset,
            hasMore: (count ?? 0) > offset + limit
          }
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
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
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }
  })
})
