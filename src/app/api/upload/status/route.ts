import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import Logger from '@/lib/logger';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for API routes
);

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  'Access-Control-Allow-Credentials': 'true'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    Logger.info('Checking upload session status', { sessionId });

    const { data: session, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      Logger.error('Failed to fetch session status', { 
        error,
        sessionId 
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch session status' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    Logger.info('Session status retrieved', { 
      sessionId,
      status: session.status,
      processedRecords: session.processed_records,
      totalRecords: session.total_records
    });

    return NextResponse.json(session, { headers: corsHeaders });
  } catch (error) {
    Logger.error('Unexpected error checking session status', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500, headers: corsHeaders }
    );
  }
}
