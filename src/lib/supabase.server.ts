import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import fetch from 'cross-fetch';
import { normalizeArabicText, areArabicStringsSimilar } from './arabic-utils';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Create a Supabase client for server-side operations
export const createServerSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables for Supabase server client');
  }
  
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public'
      },
      global: {
        fetch: fetch
      }
    }
  );
};

// Create a single supabase client for interacting with your database
export const supabaseServer = createServerSupabaseClient();

interface SearchResult {
  id: string;
  full_name: string;
  last_seen_location: string | null;
  status: string;
  gender: string | null;
  age_at_detention: number | null;
  date_of_detention: string | null;
  detention_facility: string | null;
  additional_notes: string | null;
  physical_description: string | null;
  contact_info: string | null;
  last_update_date: string | null;
  created_at: string;
  search_rank?: number;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
}

// Enhanced cache configuration
const CACHE_CONFIG = {
  maxSize: 200,           // Increased from 100
  ttlMs: 5 * 60 * 1000,  // Increased to 5 minutes
  minQueryLength: 2,      // Minimum query length
  popularQueryTtlMs: 15 * 60 * 1000,  // 15 minutes for popular queries
  popularThreshold: 5,    // Number of hits to consider a query popular
  queryHits: new Map<string, number>()
};

// Track popular queries
function isPopularQuery(query: string): boolean {
  const hits = CACHE_CONFIG.queryHits.get(query) || 0;
  return hits >= CACHE_CONFIG.popularThreshold;
}

function trackQueryHit(query: string) {
  const hits = (CACHE_CONFIG.queryHits.get(query) || 0) + 1;
  CACHE_CONFIG.queryHits.set(query, hits);
}

// Improved cache implementation with LRU-like behavior
const searchCache = new Map<string, SearchResponse & { timestamp: number }>();
const cacheStats = {
  hits: 0,
  misses: 0,
  fuzzyHits: 0,
  evictions: 0,
  avgResponseTime: 0,
  totalSearches: 0,
  hitRate: () => {
    const total = cacheStats.hits + cacheStats.misses;
    return total > 0 ? (cacheStats.hits / total * 100).toFixed(2) + '%' : '0%';
  },
  averageResponseTime: () => {
    return cacheStats.totalSearches > 0 
      ? (cacheStats.avgResponseTime / cacheStats.totalSearches).toFixed(2) + 'ms'
      : '0ms';
  }
};

// Cache maintenance function
function maintainCache() {
  const now = Date.now();
  let evicted = 0;
  
  // Remove expired entries
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_CONFIG.ttlMs) {
      searchCache.delete(key);
      evicted++;
    }
  }
  
  // If still over size limit, remove oldest entries
  if (searchCache.size > CACHE_CONFIG.maxSize) {
    const sortedEntries = Array.from(searchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const entriesToRemove = sortedEntries.slice(0, searchCache.size - CACHE_CONFIG.maxSize);
    for (const [key] of entriesToRemove) {
      searchCache.delete(key);
      evicted++;
    }
  }
  
  if (evicted > 0) {
    cacheStats.evictions += evicted;
  }
}

export async function performSearch({
  searchText,
  pageSize = 20,
  pageNumber = 1,
  estimateTotal = true,
  status,
  gender,
  ageMin,
  ageMax,
  location,
  detentionFacility,
  dateFrom,
  dateTo
}: {
  searchText: string;
  pageSize?: number;
  pageNumber?: number;
  estimateTotal?: boolean;
  status?: string;
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  location?: string;
  detentionFacility?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<SearchResponse> {
  try {
    const normalizedSearchText = normalizeArabicText(searchText);
    
    const { data, error } = await supabaseServer.rpc('search_detainees_enhanced', {
      search_params: {
        query: normalizedSearchText,
        pageSize: pageSize,
        pageNumber: pageNumber,
        estimateTotal: estimateTotal,
        detentionStatus: status,
        gender: gender,
        ageMin: ageMin,
        ageMax: ageMax,
        location: location,
        facility: detentionFacility,
        dateFrom: dateFrom,
        dateTo: dateTo
      }
    });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!data) {
      console.warn('No data returned from search');
      return {
        results: [],
        totalCount: 0,
        currentPage: pageNumber,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        pageSize: pageSize
      };
    }

    // Log the raw response for debugging
    console.log('Raw database response:', data);

    // Parse and type the response - matching exact property names from PostgreSQL
    type SearchResponseData = {
      results: SearchResult[];
      pageSize: number;
      totalCount: number;
      totalPages: number;
      currentPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };

    // First cast to unknown, then to our expected type
    const response = (data as unknown) as SearchResponseData;
    
    return {
      results: response.results || [],
      totalCount: response.totalCount || 0,
      currentPage: response.currentPage || pageNumber,
      totalPages: response.totalPages || 1,
      hasNextPage: response.hasNextPage || false,
      hasPreviousPage: response.hasPreviousPage || false,
      pageSize: response.pageSize || pageSize
    };
  } catch (error: any) {
    console.error('Search failed:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error('Failed to perform search', { cause: error.message || error });
  }
}
