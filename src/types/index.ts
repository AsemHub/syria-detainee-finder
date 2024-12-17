export type DetaineeStatus = 'detained' | 'released' | 'deceased' | 'unknown';
export type DetaineeGender = 'male' | 'female' | 'other' | 'unknown';

export interface Detainee {
  id: string;
  full_name: string;
  date_of_detention: string | null;
  last_seen_location: string;
  detention_facility: string | null;
  physical_description: string | null;
  age_at_detention: number | null;
  gender: DetaineeGender;
  status: DetaineeStatus;
  additional_info: string | null;
  created_at: string;
  updated_at: string;
  search_rank?: number;
}

export interface SearchParams {
  searchText?: string;
  location?: string;
  status?: DetaineeStatus;
  gender?: DetaineeGender;
  detentionStartDate?: string;
  detentionEndDate?: string;
  ageMin?: number;
  ageMax?: number;
  page?: number;
  pageSize?: number;
}
