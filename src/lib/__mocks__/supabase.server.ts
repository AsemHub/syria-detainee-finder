import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { SearchParams } from '../supabase';

// Mock data for testing
const mockDetainees = [
  {
    id: 1,
    full_name: 'Asem Test',
    status: 'missing',
    gender: 'male',
    age: 30,
    age_at_detention: 28,
    last_seen_location: 'Damascus',
    search_rank: 1
  },
  {
    id: 2,
    full_name: 'Samer Test',
    status: 'missing',
    gender: 'male',
    age: 25,
    age_at_detention: 23,
    last_seen_location: 'Damascus',
    search_rank: 0.8
  },
  {
    id: 3,
    full_name: 'Samira Test',
    status: 'missing',
    gender: 'female',
    age: 28,
    age_at_detention: 26,
    last_seen_location: 'Damascus',
    search_rank: 0.7
  },
  {
    id: 4,
    full_name: 'Ahmad Test',
    status: 'missing',
    gender: 'male',
    age: 35,
    age_at_detention: 33,
    last_seen_location: 'Damascus',
    search_rank: 0.6
  }
];

// Mock Supabase client
export const supabaseServer = {
  rpc: (functionName: string, params: any) => {
    // Mock the search_detainees function
    if (functionName === 'search_detainees') {
      return {
        data: mockDetainees.filter(d => {
          // Basic filtering logic for testing
          if (params.search_query && !d.full_name.toLowerCase().includes(params.search_query.toLowerCase())) {
            return false;
          }
          if (params.status_filter && d.status !== params.status_filter) {
            return false;
          }
          if (params.gender_filter && d.gender !== params.gender_filter) {
            return false;
          }
          if (params.location_filter && !d.last_seen_location.toLowerCase().includes(params.location_filter.toLowerCase())) {
            return false;
          }
          if (params.age_min && d.age_at_detention < params.age_min) {
            return false;
          }
          if (params.age_max && d.age_at_detention > params.age_max) {
            return false;
          }
          return true;
        }).sort((a, b) => {
          // Sort by search rank if available
          if (a.search_rank && b.search_rank) {
            return b.search_rank - a.search_rank;
          }
          return 0;
        }),
        error: null
      };
    }
    return { data: null, error: new Error('Function not implemented') };
  }
} as unknown as SupabaseClient<Database>;

// Export the search functions with mock implementation
export const buildSearchQuery = (supabase: SupabaseClient<Database>, params: SearchParams) => {
  return supabase.rpc('search_detainees', {
    search_query: params.searchText?.trim() || null,
    status_filter: params.status || null,
    gender_filter: params.gender || null,
    age_min: params.ageMin || null,
    age_max: params.ageMax || null,
    location_filter: params.location?.trim() || null
  });
};

export const performSearch = async (params: SearchParams) => {
  const startTime = performance.now();
  try {
    const { data, error } = await buildSearchQuery(supabaseServer, params);
    const endTime = performance.now();
    return {
      data,
      error,
      duration: endTime - startTime
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      data: null,
      error: error as Error,
      duration: endTime - startTime
    };
  }
};
