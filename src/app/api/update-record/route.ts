import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase.server';
import type { Database } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { recordId, updates, updateReason } = await request.json();
    
    // Get the existing record
    const { data: existingRecord, error: fetchError } = await supabaseServer
      .from('detainees')
      .select()
      .eq('id', recordId)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Prepare the update history entry
    const historyEntry = {
      timestamp: new Date().toISOString(),
      previous_values: {
        contact_info: existingRecord.contact_info,
        additional_notes: existingRecord.additional_notes,
      },
      update_reason: updateReason,
    };

    // Merge contact information and additional notes
    const updatedContactInfo = [existingRecord.contact_info, updates.contact_info]
      .filter(Boolean)
      .join('\n---\n');

    const updatedNotes = [existingRecord.additional_notes, updates.additional_notes]
      .filter(Boolean)
      .join('\n---\n');

    // Update the record
    const { error: updateError } = await supabaseServer
      .from('detainees')
      .update({
        contact_info: updatedContactInfo,
        additional_notes: updatedNotes,
        update_history: [...(existingRecord.update_history || []), historyEntry],
        last_update_date: new Date().toISOString(),
        last_update_reason: updateReason,
      })
      .eq('id', recordId);

    if (updateError) {
      throw updateError;
    }

    // Refresh the materialized view to reflect the changes
    const { error: refreshError } = await supabaseServer.rpc('refresh_mv_detainees_search');
    
    if (refreshError) {
      console.error('Error refreshing materialized view:', refreshError);
      // Don't throw here, as the update was successful
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    );
  }
}
