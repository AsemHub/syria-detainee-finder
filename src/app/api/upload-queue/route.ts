import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Logger from '@/lib/logger';
import { Database } from '@/lib/database.types';
import { normalizeArabicText } from '@/lib/arabic-utils';

// Configure as serverless function
export const runtime = 'edge';
export const maxDuration = 10; // Limit to 10 seconds for quick response

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to sanitize file name
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();
}

// Helper function to sanitize organization name for storage
function sanitizeOrgName(name: string): string {
  const normalized = normalizeArabicText(name)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  return normalized || 'unknown_org';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    Logger.info('Received request body', { body });

    const { file, organization } = body;

    if (!file?.name || !organization) {
      Logger.error('Missing required parameters', { file, organization });
      return NextResponse.json(
        { error: 'Missing required parameters: file name and organization' },
        { status: 400 }
      );
    }

    // 1. Create upload session with minimal initial data
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        file_name: file.name,
        organization: organization,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      Logger.error('Failed to create session', { error: sessionError });
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // 2. Generate storage path
    const sanitizedOrg = sanitizeOrgName(organization);
    const sanitizedFileName = sanitizeFileName(file.name);
    const storagePath = `uploads/${sanitizedOrg}/${session.id}/${sanitizedFileName}`;

    // 3. Create signed URL for upload
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('csv-uploads')
      .createSignedUploadUrl(storagePath);

    if (signedUrlError) {
      await supabase.from('upload_sessions').delete().eq('id', session.id);
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      signedUrl: signedUrlData.signedUrl,
      storagePath,
      token: signedUrlData.token
    });

  } catch (error) {
    Logger.error('Error processing upload request', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
