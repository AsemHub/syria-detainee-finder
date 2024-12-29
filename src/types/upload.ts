export type UploadStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

export type ErrorMessage = {
  message: string;
  type: string;
}

export type UploadError = {
  record: string;
  errors: ErrorMessage[];
}

export type ProcessingDetails = {
  current_name?: string;
  current_index?: number;
  total?: number;
}

export type DetaineeRecord = {
  full_name: string;
  last_seen_location?: string;
  contact_info?: string;
  date_of_detention: string;
  detention_facility?: string;
  physical_description?: string;
  age_at_detention?: number;
  gender?: 'male' | 'female' | 'unspecified';
  status?: 'detained' | 'missing' | 'released' | 'deceased' | 'unknown';
  additional_notes?: string;
  organization: string;
}

export type UploadSession = {
  id: string;
  status: Exclude<UploadStatus, 'idle'>;
  total_records: number;
  processed_records: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  skipped_duplicates: number;
  errors: UploadError[];
  error_message?: string;
  processing_details: ProcessingDetails;
  current_record?: string;
}

export type UploadStats = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
}
