import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import fetch from 'cross-fetch';
import type { SearchParams } from './supabase';
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
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
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
  totalCount: number | null;
  currentPage: number | null;
  totalPages: number | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number | null;
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
  estimateTotal = true
}: {
  searchText: string;
  pageSize?: number;
  pageNumber?: number;
  estimateTotal?: boolean;
}): Promise<SearchResponse> {
  try {
    const normalizedSearchText = normalizeArabicText(searchText);
    
    const { data, error } = await supabaseServer.rpc('search_detainees_enhanced', {
      search_params: {
        query: normalizedSearchText,
        page_size: pageSize,
        page_number: pageNumber,
        estimate_total: estimateTotal
      }
    });

    if (error) throw error;

    const response = data as any;
    console.log('Database response:', {
      totalCount: response.totalCount,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      hasNextPage: response.hasNextPage,
      hasPreviousPage: response.hasPreviousPage,
      resultCount: response.results?.length
    });
    
    return {
      results: response.results || [],
      totalCount: response.totalCount || 0,
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
      hasNextPage: response.hasNextPage || false,
      hasPreviousPage: response.hasPreviousPage || false,
      pageSize: response.pageSize || pageSize
    };
  } catch (error: any) {
    console.error('Search failed:', error);
    throw new Error('Failed to perform search', { cause: error });
  }
}
