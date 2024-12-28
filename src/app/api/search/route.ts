import { NextResponse } from 'next/server';
import { performSearch } from '@/lib/supabase.server';
import type { SearchParams } from '@/lib/database.types';
import Logger from "@/lib/logger"

// Prevent response caching at the edge
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const startTime = performance.now();
        Logger.info('Received search request');
        
        const body = await request.json();
        Logger.debug('Raw request body:', body);
        
        const { query, pageSize = 10, pageNumber = 1, estimateTotal = false, detentionStatus, gender, ageMin, ageMax, location, facility, dateFrom, dateTo } = body;
        Logger.debug('Extracted parameters:', { query, pageSize, pageNumber, estimateTotal, detentionStatus, gender, ageMin, ageMax, location, facility, dateFrom, dateTo });

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
                query: query.trim(),
                detentionStatus: detentionStatus,
                gender: gender,
                ageMin: ageMin,
                ageMax: ageMax,
                location: location,
                facility: facility,
                dateFrom: dateFrom,
                dateTo: dateTo,
                pageSize: pageSize,
                pageNumber: pageNumber,
                estimateTotal: estimateTotal
            };

            const results = await performSearch(searchParams);

            const duration = performance.now() - startTime;
            Logger.info(`Search completed successfully in ${duration.toFixed(2)}ms`);
            
            return NextResponse.json(results);
        } catch (searchError: any) {
            Logger.error('Search operation failed:', searchError);

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
        Logger.error('API route error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
