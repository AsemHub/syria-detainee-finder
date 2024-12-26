import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import type { DetaineeStatus, DetaineeGender } from './database.types';
import fetch from 'cross-fetch';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
}

export const supabase = createSupabaseClient()

export type { DetaineeStatus, DetaineeGender } from './database.types';

export interface Detainee {
    id: string;
    full_name: string;
    status: DetaineeStatus;
    gender: DetaineeGender;
    date_of_detention: string | null;
    age_at_detention: number | null;
    last_seen_location: string;
    detention_facility: string | null;
    physical_description: string | null;
    notes: string | null;
    search_rank?: number;
}

export type Document = {
    id: string;
    detainee_id: string;
    file_url: string;
    document_type: 'photo' | 'official_document' | 'testimony' | 'other';
    submission_date: string;
    description: string | null;
    file_name: string;
};

export type SearchParams = {
    searchText?: string;
    status?: DetaineeStatus;
    gender?: DetaineeGender;
    ageMin?: number;
    ageMax?: number;
    location?: string;
};

export type SearchResponse = {
    data: Detainee[] | null;
    error: Error | null;
};

export const buildSearchQuery = (supabase: any, params: SearchParams) => {
    // Normalize and validate parameters
    const normalizedParams = {
        searchText: params.searchText?.trim() || null,
        status: params.status || null,
        gender: params.gender || null,
        ageMin: typeof params.ageMin === 'number' && !isNaN(params.ageMin) ? params.ageMin : null,
        ageMax: typeof params.ageMax === 'number' && !isNaN(params.ageMax) ? params.ageMax : null,
        location: params.location?.trim() || null
    };

    // Build the base query
    let query = supabase
        .from('detainees')
        .select('*');

    // Apply filters
    if (normalizedParams.status) {
        query = query.eq('status', normalizedParams.status);
    }

    if (normalizedParams.gender) {
        query = query.eq('gender', normalizedParams.gender);
    }

    if (normalizedParams.ageMin !== null) {
        query = query.gte('age_at_detention', normalizedParams.ageMin);
    }

    if (normalizedParams.ageMax !== null) {
        query = query.lte('age_at_detention', normalizedParams.ageMax);
    }

    // Add text search conditions
    if (normalizedParams.searchText) {
        query = query.textSearch('full_name', normalizedParams.searchText, {
            type: 'websearch',
            config: 'english'
        });
    }

    if (normalizedParams.location) {
        query = query.textSearch('last_seen_location', normalizedParams.location, {
            type: 'websearch',
            config: 'english'
        });
    }

    return query;
};

export async function performSearch(params: SearchParams): Promise<{ data: Detainee[] | null; error: Error | null }> {
    try {
        const query = buildSearchQuery(supabase, params);
        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return {
            data: data?.map((d: Database['public']['Tables']['detainees']['Row']) => ({
                id: d.id,
                full_name: d.full_name,
                last_seen_location: d.last_seen_location,
                status: d.status,
                gender: d.gender,
                age_at_detention: d.age_at_detention,
                date_of_detention: d.date_of_detention,
                notes: d.additional_notes,
                detention_facility: d.detention_facility,
                physical_description: d.physical_description,
                search_rank: (d as any).search_rank
            })) || null,
            error: null
        };
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error : new Error('An unknown error occurred')
        };
    }
}
