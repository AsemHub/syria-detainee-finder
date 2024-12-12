import { supabase } from '@/lib/supabase/client'
import { DetaineeSearchResult, DetaineeFilter } from '@/lib/types/detainees'

const SIMILARITY_THRESHOLD = 0.3 // Adjust based on desired fuzzy match sensitivity

/**
 * Search for detainees using full-text search and fuzzy matching
 */
export async function searchDetainees(
  query: string,
  filter?: DetaineeFilter
): Promise<DetaineeSearchResult[]> {
  // Normalize Arabic query if present
  const normalizedQuery = await supabase.rpc('normalize_arabic', {
    input: query
  })

  // Start building the search query
  let searchQuery = supabase
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
      limit = 50,
      offset = 0
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
      searchQuery = searchQuery.gte('detention_date', startDate.toISOString())
    }
    if (endDate) {
      searchQuery = searchQuery.lte('detention_date', endDate.toISOString())
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

  const { data: detainees, error } = await searchQuery

  if (error) {
    throw new Error(`Failed to search detainees: ${error.message}`)
  }

  // Calculate similarity scores and determine matched fields
  return detainees.map(detainee => {
    const matchedFields: string[] = []
    let maxSimilarity = 0

    // Check each field for matches
    const fieldsToCheck = [
      { name: 'full_name_ar', value: detainee.full_name_ar },
      { name: 'full_name_en', value: detainee.full_name_en },
      { name: 'place_of_birth_ar', value: detainee.place_of_birth_ar },
      { name: 'place_of_birth_en', value: detainee.place_of_birth_en },
      { name: 'detention_location_ar', value: detainee.detention_location_ar },
      { name: 'detention_location_en', value: detainee.detention_location_en },
      { name: 'last_seen_location_ar', value: detainee.last_seen_location_ar },
      { name: 'last_seen_location_en', value: detainee.last_seen_location_en }
    ]

    for (const field of fieldsToCheck) {
      if (field.value) {
        const similarity = calculateSimilarity(query, field.value)
        if (similarity > SIMILARITY_THRESHOLD) {
          matchedFields.push(field.name)
          maxSimilarity = Math.max(maxSimilarity, similarity)
        }
      }
    }

    return {
      detainee,
      similarity: maxSimilarity,
      matchedField: matchedFields[0] || ''
    }
  }).sort((a, b) => b.similarity - a.similarity)
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) {
    return 1.0
  }
  
  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase())
  return (longer.length - distance) / longer.length
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[str1.length][str2.length]
}
