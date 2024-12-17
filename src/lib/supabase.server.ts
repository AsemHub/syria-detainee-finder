import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
    },
    global: {
      headers: { 'x-my-custom-header': 'my-app-name' },
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      }
    }
  }
);

// Initialize LRU cache for search results
const searchCache = new LRUCache<string, any>({
  max: 1000, // Increased cache size
  ttl: 1000 * 60 * 15, // Extended to 15 minutes
  fetchMethod: async (key: string) => {
    const params = JSON.parse(key);
    return await performSearch(params.searchText);
  },
});

// Connection state management
let lastConnectionCheck = 0;
let isConnectionHealthy = true;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

// Helper function to check connection health
async function checkConnection(): Promise<boolean> {
  try {
    const now = Date.now();
    if (now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
      return isConnectionHealthy;
    }

    const { data, error } = await supabaseServer
      .from('detainees')
      .select('id')
      .limit(1)
      .maybeSingle();

    isConnectionHealthy = !error;
    lastConnectionCheck = now;
    return isConnectionHealthy;
  } catch (error) {
    isConnectionHealthy = false;
    lastConnectionCheck = Date.now();
    return false;
  }
}

// Helper function to build cache key
const buildCacheKey = (params: SearchParams): string => {
  return JSON.stringify(params);
};

// Helper function to build search query
export const buildSearchQuery = (supabase: SupabaseClient<Database>, params: SearchParams) => {
  try {
    // Normalize and validate parameters
    const normalizedParams = {
      searchText: params.searchText?.trim() || null,
      status: params.status || null,
      gender: params.gender || null,
      ageMin: typeof params.ageMin === 'number' && !isNaN(params.ageMin) ? params.ageMin : null,
      ageMax: typeof params.ageMax === 'number' && !isNaN(params.ageMax) ? params.ageMax : null,
      location: params.location?.trim() || null
    };

    // Validate age range
    if (normalizedParams.ageMin !== null && normalizedParams.ageMax !== null) {
      if (normalizedParams.ageMin > normalizedParams.ageMax) {
        throw new Error('Minimum age cannot be greater than maximum age');
      }
    }

    // Use the search function with proper error handling
    return supabase.rpc('search_detainees', {
      search_query: normalizedParams.searchText,
      status_filter: normalizedParams.status,
      gender_filter: normalizedParams.gender,
      age_min: normalizedParams.ageMin,
      age_max: normalizedParams.ageMax,
      location_filter: normalizedParams.location
    }).throwOnError();
  } catch (error) {
    console.error('Error building search query:', error);
    throw error;
  }
};

// Enhanced retry helper function
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = 3,
  baseTimeout = 3000
): Promise<T> {
  let lastError: any;
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      // Check connection health before attempting operation
      if (attempt > 0 && !(await checkConnection())) {
        throw new Error('Database connection is unhealthy');
      }

      // Dynamic timeout based on attempt number and operation complexity
      const timeout = baseTimeout * Math.pow(1.5, attempt);
      console.log(`Attempt ${attempt + 1} with timeout ${timeout}ms`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
        )
      ]).finally(() => clearTimeout(timeoutId));
      
      return result;
    } catch (error: any) {
      lastError = error;
      attempt++;
      
      const isTimeout = error.message?.includes('timeout') || 
                       error.message?.includes('abort') ||
                       error.code === '20' ||
                       error.message?.includes('unhealthy');
                       
      if (!isTimeout && !error.message?.includes('fetch failed')) {
        throw error;
      }
      
      if (attempt < retries) {
        // Exponential backoff with jitter
        const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000) * (0.8 + Math.random() * 0.4);
        console.log(`Search attempt ${attempt} failed, retrying in ${Math.round(backoffTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  console.error('All retry attempts failed:', lastError);
  throw new Error('Search is currently unavailable. Please try again in a moment.');
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

    const searchOperation = async () => {
      // Normalize text for better matching
      const normalizedText = searchText.toLowerCase().trim();
      let results = new Map();

      try {
        // Phase 1: Quick prefix and exact matches (fastest)
        const prefixSearch = await supabaseServer
          .rpc('search_detainees_by_prefix', { search_prefix: searchText })
          .maybeSingle();

        if (!prefixSearch.error && prefixSearch.data) {
          console.log('Found results with exact prefix search');
          results.set(prefixSearch.data.id, prefixSearch.data);
          return Array.from(results.values());
        }

        // If text was normalized, try normalized prefix search
        if (searchText !== normalizedText) {
          const normalizedPrefixSearch = await supabaseServer
            .rpc('search_detainees_by_prefix', { search_prefix: normalizedText })
            .maybeSingle();

          if (!normalizedPrefixSearch.error && normalizedPrefixSearch.data) {
            console.log('Found results with normalized prefix search');
            results.set(normalizedPrefixSearch.data.id, normalizedPrefixSearch.data);
            return Array.from(results.values());
          }
        }

        // Phase 2: Try trigram search (still fast)
        const trigramSearch = await supabaseServer
          .from('detainees_search_mv')
          .select()
          .or(`name_trigrams.ilike.%${normalizedText}%`)
          .limit(10);

        if (!trigramSearch.error && trigramSearch.data?.length > 0) {
          console.log('Found results with trigram search');
          trigramSearch.data.forEach(r => results.set(r.id, r));
          return Array.from(results.values());
        }

        // Phase 3: Full-text search based on text type
        const isArabic = /[\u0600-\u06FF]/.test(searchText);
        const searchPromise = isArabic
          ? supabaseServer
              .from('detainees_search_mv')
              .select()
              .textSearch('arabic_fts_document', searchText, {
                type: 'websearch',
                config: 'arabic'
              })
              .order('last_update_date', { ascending: false })
              .limit(10)
          : supabaseServer
              .from('detainees_search_mv')
              .select()
              .textSearch('english_fts_document', searchText, {
                type: 'websearch',
                config: 'english'
              })
              .order('last_update_date', { ascending: false })
              .limit(10);

        const ftsSearch = await searchPromise;

        if (!ftsSearch.error && ftsSearch.data?.length > 0) {
          console.log(`Found results with ${isArabic ? 'Arabic' : 'English'} search`);
          ftsSearch.data.forEach(r => {
            if (!results.has(r.id)) results.set(r.id, r);
          });
        }

        // If still no results and text is long enough, try fuzzy search
        if (results.size === 0 && normalizedText.length >= 3) {
          const fuzzySearch = await supabaseServer
            .from('detainees_search_mv')
            .select()
            .or(
              `name_trigrams % '${normalizedText}',` +
              `location_trigrams % '${normalizedText}'`
            )
            .order('last_update_date', { ascending: false })
            .limit(5);

          if (!fuzzySearch.error && fuzzySearch.data?.length > 0) {
            console.log('Found results with fuzzy search');
            fuzzySearch.data.forEach(r => results.set(r.id, r));
          }
        }

        return Array.from(results.values());
      } catch (error: any) {
        // Log specific error for debugging
        console.error('Search operation error:', {
          phase: results.size > 0 ? 'secondary' : 'primary',
          error: error.message,
          code: error.code
        });
        
        // If we have partial results, return them instead of failing
        if (results.size > 0) {
          console.log('Returning partial results due to error');
          return Array.from(results.values());
        }
        throw error;
      }
    };

    // Dynamic timeout based on search phase and text type
    const baseTimeout = 2000;
    const timeout = Math.min(
      baseTimeout + 
      (searchText.length * 150) + // Less time per character
      (/[\u0600-\u06FF]/.test(searchText) ? 800 : 0), // Less extra time for Arabic
      4000 // Lower maximum timeout
    );

    const results = await retryOperation(searchOperation, 2, timeout);

    const duration = performance.now() - start;
    console.log(`Search completed in ${duration.toFixed(2)}ms with ${results?.length || 0} results`);
    
    // Cache successful results
    if (results?.length > 0) {
      searchCache.set(cacheKey, results);
    }
    return results || [];

  } catch (error: any) {
    const duration = performance.now() - start;
    console.error(`Search failed after ${duration.toFixed(2)}ms:`, {
      message: error.message,
      details: error.toString(),
      hint: error.hint || '',
      code: error.code || ''
    });
    throw error;
  }
}

// Test connection function
const testConnection = async () => {
  try {
    const { data, error } = await supabaseServer
      .from('detainees')
      .select('id')
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to connect to Supabase:', error);
      throw error;
    } else {
      console.log('Successfully connected to Supabase');
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }
};

// Run connection test on initialization
testConnection();
