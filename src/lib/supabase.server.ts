import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { LRUCache } from 'lru-cache';
import type { SearchParams } from './supabase';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Initialize Supabase client with service role key for server-side operations
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    }
  }
);

// Initialize LRU cache for search results
const searchCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 15, // 15 minutes
});

// Helper function to build cache key
function buildCacheKey(params: SearchParams): string {
  return JSON.stringify(params);
}

// Helper function to perform a search with timeout
async function searchWithTimeout<T>(
  searchPromise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timeout`)), timeoutMs);
  });

  return Promise.race([searchPromise, timeoutPromise]) as Promise<T>;
}

// Main search function
export async function performSearch(searchText: string) {
  const start = performance.now();
  console.log('Starting search with text:', searchText);

  try {
    // Check cache first
    const cacheKey = buildCacheKey({ searchText });
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult) {
      console.log('Returning cached results');
      return cachedResult;
    }

    // Normalize search text
    const normalizedText = searchText.trim();
    if (!normalizedText) {
      return [];
    }

    // Determine if text contains Arabic
    const hasArabic = /[\u0600-\u06FF]/.test(normalizedText);
    const isShort = normalizedText.length <= 3;
    
    // Adjust timeouts based on text characteristics
    const prefixTimeout = isShort ? 1500 : 3000;
    const fullSearchTimeout = hasArabic ? 5000 : 4000;

    try {
      // Try prefix search first for better performance
      const { data: prefixResults, error: prefixError } = await searchWithTimeout(
        supabaseServer.rpc('search_detainees_by_prefix', { search_prefix: normalizedText }),
        prefixTimeout,
        'Prefix search'
      );

      if (!prefixError && prefixResults?.length > 0) {
        const duration = performance.now() - start;
        console.log(`Found ${prefixResults.length} results with prefix search in ${duration.toFixed(2)}ms`);
        searchCache.set(cacheKey, prefixResults);
        return prefixResults;
      }
    } catch (error: any) {
      if (error.message !== 'Prefix search timeout') {
        console.warn('Prefix search error:', error.message);
      }
    }

    // Fall back to full search
    const { data: results, error } = await searchWithTimeout(
      supabaseServer.rpc('search_detainees', { 
        search_query: normalizedText,
        max_results: 10
      }),
      fullSearchTimeout,
      'Full search'
    );

    if (error) {
      console.error('Search RPC error:', error);
      throw error;
    }

    const duration = performance.now() - start;
    console.log(`Found ${results?.length || 0} results using full search in ${duration.toFixed(2)}ms`);
    
    // Cache successful results
    if (results?.length > 0) {
      searchCache.set(cacheKey, results);
    }
    
    return results || [];

  } catch (error: any) {
    const duration = performance.now() - start;
    
    if (error.message.includes('timeout')) {
      console.warn(`Search timed out after ${duration.toFixed(2)}ms:`, error.message);
      return [];
    }

    console.error(`Search failed after ${duration.toFixed(2)}ms:`, {
      message: error.message,
      details: error.toString(),
      hint: error.hint || '',
      code: error.code || ''
    });

    return [];
  }
}
