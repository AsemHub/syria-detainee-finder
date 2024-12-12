import { serve } from "std/http/server"
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors'
import { Database } from '../../../src/lib/types/database.types'
import { handleCorsRequest } from '../_shared/handle-cors'

interface SearchFilter {
  status?: string
  gender?: string
  nationality?: string
  verified?: boolean
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

interface SearchRequest {
  query?: string
  filter?: SearchFilter
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
      return {
        status: 405,
        error: 'Method not allowed',
      }
    }

    try {
      const { query, filter } = await req.json() as SearchRequest

      // Normalize Arabic query if present
      const { data: normalizedQuery } = await supabaseClient.rpc('normalize_arabic', {
        input: query || ''
      })

      // Start building the search query
      let searchQuery = supabaseClient
        .from('detainees')
        .select(`
          *,
          documents (
            id,
            document_type,
            file_name,
            verified
          )
        `)

      // Apply full-text search if query is present
      if (query) {
        searchQuery = searchQuery.or(`
          full_name_ar_normalized.ilike.%${normalizedQuery}%,
          full_name_en.ilike.%${query}%,
          place_of_birth_ar_normalized.ilike.%${normalizedQuery}%,
          place_of_birth_en.ilike.%${query}%,
          detention_location_ar_normalized.ilike.%${normalizedQuery}%,
          detention_location_en.ilike.%${query}%,
          last_seen_location_ar_normalized.ilike.%${normalizedQuery}%,
          last_seen_location_en.ilike.%${query}%
        `)
      }

      // Apply filters
      if (filter) {
        const {
          status,
          gender,
          nationality,
          verified,
          startDate,
          endDate,
        } = filter

        if (status) {
          searchQuery = searchQuery.eq('status', status)
        }
        if (gender) {
          searchQuery = searchQuery.eq('gender', gender)
        }
        if (nationality) {
          searchQuery = searchQuery.eq('nationality', nationality)
        }
        if (verified !== undefined) {
          searchQuery = searchQuery.eq('verified', verified)
        }
        if (startDate) {
          searchQuery = searchQuery.gte('detention_date', startDate)
        }
        if (endDate) {
          searchQuery = searchQuery.lte('detention_date', endDate)
        }

        // Apply pagination and ordering
        if (filter?.limit !== undefined) {
          searchQuery = searchQuery.range(
            filter.offset || 0,
            (filter.offset || 0) + filter.limit - 1
          )
        }
        searchQuery = searchQuery.order('created_at', { ascending: false })
      }

      const { data: detainees, error: searchError } = await searchQuery

      if (searchError) {
        throw new Error(searchError.message)
      }

      return {
        status: 200,
        data: detainees,
      }
    } catch (error) {
      return {
        status: 400,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }
    }
  })
})
