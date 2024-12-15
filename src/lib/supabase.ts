import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false
        },
        db: {
            schema: 'public'
        }
    }
);

// Type definitions for our database
export type Detainee = {
    id: string;
    full_name: string;
    date_of_detention: string | null;
    last_seen_location: string | null;
    detention_facility: string | null;
    physical_description: string | null;
    age_at_detention: number | null;
    gender: 'male' | 'female' | 'other';
    status: 'missing' | 'released' | 'deceased';
    last_update_date: string;
    contact_info: string | null;
    additional_notes: string | null;
    created_at: string;
    search_rank?: number;
};

export type Document = {
    id: string;
    detainee_id: string;
    file_url: string;
    document_type: 'photo' | 'official_document' | 'testimony' | 'other';
    submission_date: string;
    description: string | null;
    file_name: string;
    mime_type: string;
};

export type SearchParams = {
    searchText?: string;
    detentionStartDate?: string;
    detentionEndDate?: string;
    status?: 'missing' | 'released' | 'deceased';
    location?: string;
    gender?: 'male' | 'female' | 'other';
    ageMin?: number;
    ageMax?: number;
};
