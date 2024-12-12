import type { Database } from '@/lib/supabase/types'
import type { DetaineeFormData, DetaineeSubmissionFormData } from '@/lib/types/forms'
import { normalizeArabic } from './text'

type DetaineeInsert = Database['public']['Tables']['detainees']['Insert']
type SubmissionInsert = Database['public']['Tables']['submissions']['Insert']

export function formatDetaineeData(formData: DetaineeFormData): DetaineeInsert {
  return {
    full_name_ar: formData.full_name_ar,
    full_name_en: formData.full_name_en || null,
    date_of_birth: formData.date_of_birth || null,
    place_of_birth_ar: formData.place_of_birth_ar || null,
    place_of_birth_en: formData.place_of_birth_en || null,
    gender: formData.gender,
    nationality: formData.nationality || null,
    detention_date: formData.detention_date || null,
    detention_location_ar: formData.detention_location_ar || null,
    detention_location_en: formData.detention_location_en || null,
    last_seen_date: formData.last_seen_date || null,
    last_seen_location_ar: formData.last_seen_location_ar || null,
    last_seen_location_en: formData.last_seen_location_en || null,
    status: formData.status || 'unknown',
    additional_info_ar: formData.additional_info_ar || null,
    additional_info_en: formData.additional_info_en || null,
    verified_at: null,
    verified_by: null
  }
}

export function formatSubmissionData(
  formData: DetaineeSubmissionFormData,
  detaineeId: string,
  ipAddress?: string,
  recaptchaScore?: number
): SubmissionInsert {
  return {
    detainee_id: detaineeId,
    submitter_name: formData.submitter_name,
    submitter_email: formData.submitter_email || null,
    submitter_phone: formData.submitter_phone || null,
    relationship_to_detainee: formData.relationship_to_detainee || null,
    submission_type: formData.submission_type,
    status: 'pending',
    verification_date: null,
    verification_notes: null,
    ip_address: ipAddress || null,
    recaptcha_score: recaptchaScore || null
  }
}

// Helper function to create both detainee and submission records
export async function createDetaineeSubmission(
  formData: DetaineeSubmissionFormData,
  ipAddress?: string,
  recaptchaScore?: number
) {
  const { supabase } = await import('@/lib/supabase/client')
  
  // Start a transaction
  const { data: detainee, error: detaineeError } = await supabase
    .from('detainees')
    .insert(formatDetaineeData(formData))
    .select()
    .single()

  if (detaineeError) throw detaineeError

  try {
    const { error: submissionError } = await supabase
      .from('submissions')
      .insert(formatSubmissionData(formData, detainee.id, ipAddress, recaptchaScore))

    if (submissionError) {
      // If submission creation fails, clean up the detainee record
      await supabase.from('detainees').delete().eq('id', detainee.id)
      throw submissionError
    }

    return detainee
  } catch (error) {
    // Clean up the detainee record if anything goes wrong
    await supabase.from('detainees').delete().eq('id', detainee.id)
    throw error
  }
}
