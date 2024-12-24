import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase.server';
import { Detainee } from '@/types';

export async function POST(request: Request) {
  try {
    const detainee: Detainee = await request.json();
    
    // Perform exact match search first
    const exactMatches = await supabaseServer
      .rpc('search_detainees_enhanced', {
        search_query: detainee.full_name,
        page_size: 10,
        estimate_total: false
      });

    // If no exact matches, try fuzzy search
    if (exactMatches.data?.length === 0) {
      const fuzzyMatches = await supabaseServer
        .rpc('search_detainees_enhanced', {
          search_query: detainee.full_name,
          page_size: 10,
          estimate_total: false,
          fuzzy_search: true
        });

      return NextResponse.json({
        matches: {
          exact: [],
          similar: fuzzyMatches.data || []
        }
      });
    }

    return NextResponse.json({
      matches: {
        exact: exactMatches.data || [],
        similar: []
      }
    });
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
