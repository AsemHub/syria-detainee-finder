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
        
        const { query, pageSize, pageNumber, estimateTotal } = body;
        console.log('Extracted parameters:', { query, pageSize, pageNumber, estimateTotal });

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
            const results = await performSearch({
                searchText: query.trim(),
                pageSize: pageSize || 20,
                pageNumber: pageNumber || 1,
                estimateTotal: estimateTotal ?? true  // Default to true if undefined
            });
            const duration = performance.now() - start;
            console.log(`Search completed successfully in ${duration.toFixed(2)}ms`);
            
            // Return the response directly
            return NextResponse.json(results);
        } catch (searchError: any) {
            console.error('Search operation failed:', {
                error: searchError.message,
                cause: searchError.cause?.message,
                stack: searchError.stack
            });

            // Handle specific error cases
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
