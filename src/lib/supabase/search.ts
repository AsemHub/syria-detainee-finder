import { supabase } from './client'
import type { Database } from './types'

type SearchOptions = {
  query: string
  limit?: number
  page?: number
  filters?: {
    status?: Database['public']['Tables']['detainees']['Row']['status']
    fromDate?: string
    toDate?: string
    location?: string
  }
}

export async function searchDetainees({
  query,
  limit = 10,
  page = 1,
  filters
}: SearchOptions) {
  try {
    let dbQuery = supabase
      .from('detainees')
      .select('*', { count: 'exact' })
      .textSearch('search_vector', query)

    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        dbQuery = dbQuery.eq('status', filters.status)
      }
      if (filters.fromDate) {
        dbQuery = dbQuery.gte('detention_date', filters.fromDate)
      }
      if (filters.toDate) {
        dbQuery = dbQuery.lte('detention_date', filters.toDate)
      }
      if (filters.location) {
        dbQuery = dbQuery.or(`detention_location_ar.ilike.%${filters.location}%,detention_location_en.ilike.%${filters.location}%`)
      }
    }

    // Apply pagination
    dbQuery = dbQuery.range((page - 1) * limit, page * limit - 1)

    const { data, error, count } = await dbQuery

    if (error) {
      throw error
    }

    return {
      data,
      count,
      page,
      totalPages: count ? Math.ceil(count / limit) : 0
    }
  } catch (error) {
    console.error('Error searching detainees:', error)
    throw error
  }
}

export async function searchByName(name: string, limit = 5) {
  try {
    const normalizedName = name.trim().toLowerCase()
    
    const { data, error } = await supabase
      .from('detainees')
      .select('*')
      .or(`full_name_ar_normalized.ilike.%${normalizedName}%,full_name_en.ilike.%${normalizedName}%`)
      .limit(limit)

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error searching by name:', error)
    throw error
  }
}
