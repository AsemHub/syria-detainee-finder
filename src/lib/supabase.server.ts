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

// Create a single supabase client for interacting with your database
export const supabaseServer = createClient<Database>(
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

interface SearchResult {
  id: string;
  fullName: string;
  lastSeenLocation: string | null;
  status: string;
  gender: string | null;
  ageAtDetention: number | null;
  dateOfDetention: string | null;
  detentionFacility: string | null;
  additionalNotes: string | null;
  physicalDescription: string | null;
  contactInfo: string | null;
  lastUpdateDate: string | null;
}

interface SearchResponse {
  data: SearchResult[];
  metadata: {
    totalCount: number | null;
    hasNextPage: boolean;
    lastCursor: {
      id: string;
      rank: number;
      date: string;
    } | null;
  };
}

// Enhanced cache configuration
const CACHE_CONFIG = {
  maxSize: 100, // Maximum number of entries
  ttlMs: 30000, // Time-to-live in milliseconds
  minQueryLength: 2 // Minimum query length to cache
};

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
  cursor = null,
  estimateTotal = true
}: {
  searchText: string;
  pageSize?: number;
  cursor?: { id: string; rank: number; date: string } | null;
  estimateTotal?: boolean;
}): Promise<SearchResponse> {
  // Cache key includes all search parameters
  const cacheKey = JSON.stringify({ searchText, pageSize, cursor, estimateTotal });
  
  // Check cache first
  const cachedResult = searchCache.get(cacheKey);
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_CONFIG.ttlMs) {
    cacheStats.hits++;
    return cachedResult;
  }
  cacheStats.misses++;

  const startTime = Date.now();

  try {
    const { data, error } = await supabaseServer.rpc('search_detainees_enhanced', {
      params: {
        search_query: searchText,
        page_size: pageSize,
        cursor_id: cursor?.id,
        cursor_rank: cursor?.rank,
        cursor_date: cursor?.date,
        estimate_total: estimateTotal
      }
    });

    if (error) throw error;

    const response: SearchResponse = data;

    // Cache the result
    if (searchText.length >= CACHE_CONFIG.minQueryLength) {
      maintainCache();
      searchCache.set(cacheKey, { ...response, timestamp: Date.now() });
    }

    // Update performance stats
    const responseTime = Date.now() - startTime;
    cacheStats.totalSearches++;
    cacheStats.avgResponseTime = 
      (cacheStats.avgResponseTime * (cacheStats.totalSearches - 1) + responseTime) / 
      cacheStats.totalSearches;

    return response;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
