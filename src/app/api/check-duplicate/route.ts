import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase.server';
import type { Database } from '@/lib/database.types';
import { normalizeNameForDb } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const detainee: Database['public']['Tables']['detainees']['Row'] = await request.json();
    
    // Validate input
    if (!detainee.full_name?.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Normalize name for search
    const normalizedName = normalizeNameForDb(detainee.full_name);
    
    // Perform exact match search first using the normalized_name column
    const exactMatches = await supabaseServer
      .from('detainees')
      .select()
      .eq('normalized_name', normalizedName)
      .limit(10);

    if (exactMatches.error) {
      console.error('Error in exact match search:', exactMatches.error);
      throw new Error('Search failed');
    }

    // If no exact matches, try fuzzy search
    if (!exactMatches.data || exactMatches.data.length === 0) {
      const { data: fuzzyMatches, error: fuzzyError } = await supabaseServer
        .from('detainees')
        .select()
        .textSearch('search_vector', normalizedName, {
          type: 'plain',
          config: 'arabic'
        })
        .limit(10);

      if (fuzzyError) {
        console.error('Error in fuzzy match search:', fuzzyError);
        throw new Error('Search failed');
      }

      return NextResponse.json({
        exactMatches: [],
        fuzzyMatches: fuzzyMatches || []
      });
    }

    return NextResponse.json({
      exactMatches: exactMatches.data,
      fuzzyMatches: []
    });
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
