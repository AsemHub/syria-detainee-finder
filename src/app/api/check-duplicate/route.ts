import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase.server';
import { Detainee } from '@/types';

export async function POST(request: Request) {
  try {
    const detainee: Detainee = await request.json();
    
    // Perform exact match search first
    const exactMatches = await supabaseServer
      .rpc('search_detainees', {
        search_text: detainee.full_name,
        location: detainee.last_seen_location || '',
        min_age: 0,
        max_age: 100,
        gender: '',
        status: ''
      });

    // If no exact matches, try fuzzy search
    if (exactMatches.data?.length === 0) {
      const fuzzyMatches = await supabaseServer
        .rpc('search_detainees', {
          search_text: detainee.full_name,
          location: '',
          min_age: 0,
          max_age: 100,
          gender: '',
          status: ''
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
