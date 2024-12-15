import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase.server';
import type { SearchParams } from '@/lib/supabase';

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=59';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        const params: SearchParams = {
            searchText: searchParams.get('q') || undefined,
            detentionStartDate: searchParams.get('startDate') || undefined,
            detentionEndDate: searchParams.get('endDate') || undefined,
            status: searchParams.get('status') as SearchParams['status'] || undefined,
            location: searchParams.get('location') || undefined,
            gender: searchParams.get('gender') as SearchParams['gender'] || undefined,
            ageMin: searchParams.get('ageMin') ? parseInt(searchParams.get('ageMin')!) : undefined,
            ageMax: searchParams.get('ageMax') ? parseInt(searchParams.get('ageMax')!) : undefined,
        };

        // Build the base query
        let query = supabaseServer
            .from('detainees')
            .select(`
                id,
                full_name,
                date_of_detention,
                last_seen_location,
                detention_facility,
                physical_description,
                age_at_detention,
                gender,
                status,
                last_update_date
            `)
            // Enable response caching in Supabase
            .returns<any>();

        // Apply search filters
        if (params.searchText) {
            const searchText = params.searchText.trim();
            if (searchText) {
                // Use websearch_to_tsquery for better performance
                query = query.textSearch('search_vector', searchText, {
                    type: 'websearch',
                    config: 'simple'
                });
            }
        }

        // Apply exact match filters efficiently
        const filters: Record<string, any> = {};
        if (params.status) filters.status = params.status;
        if (params.gender) filters.gender = params.gender;
        if (Object.keys(filters).length > 0) {
            query = query.match(filters);
        }

        // Apply range filters
        if (params.detentionStartDate) {
            query = query.gte('date_of_detention', params.detentionStartDate);
        }
        if (params.detentionEndDate) {
            query = query.lte('date_of_detention', params.detentionEndDate);
        }
        if (params.ageMin !== undefined) {
            query = query.gte('age_at_detention', params.ageMin);
        }
        if (params.ageMax !== undefined) {
            query = query.lte('age_at_detention', params.ageMax);
        }

        // Add efficient ordering and limit
        query = query
            .order('full_name')
            .limit(50);

        const { data, error: searchError } = await query;

        if (searchError) {
            console.error('Search error:', searchError);
            return NextResponse.json(
                { 
                    error: 'Search failed',
                    details: searchError.message,
                    code: searchError.code,
                    message: 'Failed to perform search. Please try again.'
                },
                { 
                    status: 500,
                    headers: {
                        'Cache-Control': 'no-store'
                    }
                }
            );
        }

        const result = { 
            results: data || [],
            count: data?.length || 0,
            params: params 
        };

        // Return response with caching headers
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': CACHE_CONTROL
            }
        });
    } catch (error) {
        console.error('Search endpoint error:', error);
        return NextResponse.json(
            { 
                error: 'Search failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                message: 'An unexpected error occurred. Please try again.'
            },
            { 
                status: 500,
                headers: {
                    'Cache-Control': 'no-store'
                }
            }
        );
    }
}
