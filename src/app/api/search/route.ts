import { NextResponse } from 'next/server';
import { performSearch } from '@/lib/supabase.server';
import type { SearchParams } from '@/lib/supabase';

// Prevent response caching at the edge
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        console.log('Received search request');
        const start = performance.now();
        
        const body = await request.json();
        console.log('Raw request body:', body);
        
        const { query, pageSize, pageNumber, estimateTotal, detentionStatus, gender, ageMin, ageMax, location, facility, dateFrom, dateTo } = body;
        console.log('Extracted parameters:', { query, pageSize, pageNumber, estimateTotal, detentionStatus, gender, ageMin, ageMax, location, facility });

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ 
                error: 'Search query is required and must be a string',
                debug: { receivedValue: query, type: typeof query }
            }, { status: 400 });
        }

        if (pageNumber && (!Number.isInteger(pageNumber) || pageNumber < 1)) {
            return NextResponse.json({
                error: 'Page number must be a positive integer',
                debug: { receivedPageNumber: pageNumber }
            }, { status: 400 });
        }

        try {
            const searchParams: SearchParams = {
                searchText: query.trim(),
                status: detentionStatus,
                gender: gender,
                ageMin: ageMin,
                ageMax: ageMax,
                location: location,
                facility: facility,
                dateFrom: dateFrom,
                dateTo: dateTo
            };

            const results = await performSearch({
                ...searchParams,
                pageSize: pageSize || 20,
                pageNumber: pageNumber || 1,
                estimateTotal: estimateTotal ?? true
            });

            const duration = performance.now() - start;
            console.log(`Search completed successfully in ${duration.toFixed(2)}ms`);
            
            return NextResponse.json(results);
        } catch (searchError: any) {
            console.error('Search operation failed:', {
                error: searchError.message,
                cause: searchError.cause?.message,
                stack: searchError.stack
            });

            if (searchError.message.includes('timeout')) {
                return NextResponse.json(
                    { error: 'Search request timed out', details: 'Please try again' },
                    { status: 504 }
                );
            } else if (searchError.message.includes('invalid')) {
                return NextResponse.json(
                    { error: 'Invalid search', details: searchError.message },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: 'Search operation failed', details: searchError.message },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('API route error:', {
            error: error.message,
            cause: error.cause?.message,
            stack: error.stack
        });
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
