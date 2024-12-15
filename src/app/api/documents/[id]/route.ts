import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { data, error } = await supabase.rpc('get_detainee_documents', {
            detainee_uuid: params.id
        });

        if (error) throw error;

        return NextResponse.json({ documents: data });
    } catch (error) {
        console.error('Documents fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch documents' },
            { status: 500 }
        );
    }
}
