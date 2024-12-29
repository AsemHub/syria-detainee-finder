import { createClient } from '@supabase/supabase-js';
import { Database, SearchParams, DetaineeStatus, DetaineeGender } from './database.types';
import fetch from 'cross-fetch';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const createSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      db: {
        schema: 'public'
      }
    }
  );
};

export const supabase = createSupabaseClient()

export type { DetaineeStatus, DetaineeGender, SearchParams } from './database.types';

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

export const buildSearchQuery = (supabase: any, params: SearchParams) => {
    // Normalize and validate parameters
    const normalizedParams = {
        query: params.query?.trim() || '',
        status: params.detentionStatus || null,
        gender: params.gender || null,
        ageMin: typeof params.ageMin === 'number' && !isNaN(params.ageMin) ? params.ageMin : null,
        ageMax: typeof params.ageMax === 'number' && !isNaN(params.ageMax) ? params.ageMax : null,
        location: params.location?.trim() || null,
        detentionFacility: params.facility?.trim() || null,
        dateFrom: params.dateFrom || null,
        dateTo: params.dateTo || null
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

    if (normalizedParams.dateFrom) {
        query = query.gte('date_of_detention', normalizedParams.dateFrom);
    }

    if (normalizedParams.dateTo) {
        query = query.lte('date_of_detention', normalizedParams.dateTo);
    }

    // Add text search conditions
    if (normalizedParams.query) {
        query = query.textSearch('name_fts', normalizedParams.query, {
            type: 'websearch',
            config: 'arabic'
        });
    }

    return query;
};

export const performSearch = async (params: SearchParams): Promise<{ data: Detainee[] | null; error: Error | null }> => {
    try {
        // Build the query with all filters
        const query = buildSearchQuery(supabase, params);

        // Execute the query
        const { data, error } = await query
            .limit(params.pageSize || 20)
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Search error:', error);
            return { data: null, error };
        }

        return {
            data: data as Detainee[],
            error: null
        };
    } catch (error) {
        console.error('Search failed:', error);
        return {
            data: null,
            error: error as Error
        };
    }
};
