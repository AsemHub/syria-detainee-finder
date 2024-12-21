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
        
        const { searchText, pageSize, cursor, estimateTotal } = body;
        console.log('Extracted parameters:', { searchText, pageSize, cursor, estimateTotal });

        if (!searchText || typeof searchText !== 'string') {
            return NextResponse.json({ 
                error: 'Search text is required and must be a string',
                debug: { receivedValue: searchText, type: typeof searchText }
            }, { status: 400 });
        }

        try {
            const results = await performSearch({
                searchText: searchText.trim(),
                pageSize: pageSize || 20,
                cursor,
                estimateTotal: estimateTotal !== false
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
