import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { SearchParams } from '@/lib/supabase';

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

        console.log('Search params:', params);

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            throw new Error('Missing Supabase environment variables');
        }

        const { data, error } = await supabase.rpc('search_detainees', {
            search_text: params.searchText,
            detention_start_date: params.detentionStartDate,
            detention_end_date: params.detentionEndDate,
            detainee_status: params.status,
            location: params.location,
            gender_filter: params.gender,
            age_min: params.ageMin,
            age_max: params.ageMax,
        });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Search results:', data?.length || 0, 'records found');
        return NextResponse.json({ results: data || [] });
    } catch (error) {
        console.error('Search error:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error,
        });
        
        return NextResponse.json(
            { 
                error: 'Failed to perform search',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
