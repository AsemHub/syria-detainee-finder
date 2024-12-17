export interface Detainee {
  id: string;
  name: string;
  location: string;
  status: string;
  gender: string;
  age: number;
  detentionDate: string;
  releaseDate?: string;
  lastSeenDate?: string;
  details?: string;
  created_at: string;
  updated_at: string;
}

export type DetaineeStatus = 'detained' | 'released' | 'deceased' | 'unknown';
export type DetaineeGender = 'male' | 'female' | 'unknown';

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
