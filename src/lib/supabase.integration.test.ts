import { createClient } from '@supabase/supabase-js';
import { performSearch } from './supabase';
import { Database } from './database.types';
import { DetaineeStatus, DetaineeGender } from '@/types';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

jest.mock('@supabase/supabase-js');

describe('Supabase Integration Tests', () => {
  const mockData = {
    id: '1',
    full_name: 'John Smith',
    last_seen_location: 'Damascus',
    age_at_detention: 25,
    gender: 'male' as DetaineeGender,
    status: 'detained' as DetaineeStatus,
    created_at: new Date().toISOString(),
    date_of_detention: '2023-01-01',
    detention_facility: 'Facility A',
    physical_description: 'Tall',
    notes: 'Test notes',
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      data: [mockData],
      error: null
    });
  });

  const testCases = [
    {
      name: 'Simple name search',
      params: { searchText: 'John' },
      expectedResults: (detainee: Database['public']['Tables']['detainees']['Row']) =>
        detainee.full_name.toLowerCase().includes('john')
    },
    {
      name: 'Location search',
      params: { location: 'Damascus' },
      expectedResults: (detainee: Database['public']['Tables']['detainees']['Row']) =>
        detainee.last_seen_location.toLowerCase().includes('damascus')
    },
    {
      name: 'Complex search with filters',
      params: {
        searchText: 'John',
        location: 'Damascus',
        status: 'detained' as DetaineeStatus,
        gender: 'male' as DetaineeGender,
        ageMin: 20,
        ageMax: 40
      },
      expectedResults: (detainee: Database['public']['Tables']['detainees']['Row']) =>
        detainee.full_name.toLowerCase().includes('john') &&
        detainee.last_seen_location.toLowerCase().includes('damascus') &&
        detainee.age_at_detention >= 20 &&
        detainee.age_at_detention <= 40 &&
        detainee.gender === 'male'
    }
  ];

  testCases.forEach(({ name, params, expectedResults }) => {
    it(`${name} should return valid results within performance threshold`, async () => {
      const startTime = performance.now();
      const { data, error } = await performSearch(params);
      const duration = performance.now() - startTime;

      console.log(`\n${name}:`);
      console.log(`- Duration: ${duration.toFixed(2)}ms`);
      console.log(`- Results found: ${data?.length || 0}`);

      // Basic assertions
      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000); // Performance threshold of 1 second
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      // Verify results match expected criteria
      data?.forEach(detainee => {
        expect(expectedResults(detainee)).toBe(true);
      });
    });
  });
});
