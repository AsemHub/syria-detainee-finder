import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import dotenv from 'dotenv';
import { performSearch } from './supabase';
import { DetaineeStatus, DetaineeGender, SearchParams } from '@/types';

dotenv.config({ path: '.env.test' });

const mockData = {
  id: '1',
  full_name: 'John Doe',
  status: 'detained' as DetaineeStatus,
  gender: 'male' as DetaineeGender,
  date_of_detention: '2023-01-01',
  age_at_detention: 30,
  last_seen_location: 'Damascus',
  detention_facility: 'Facility A',
  physical_description: 'Tall',
  notes: 'Some notes',
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  search_rank: 1
};

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                or: jest.fn(() => ({
                  then: jest.fn().mockResolvedValue({
                    data: [mockData],
                    error: null
                  })
                }))
              }))
            }))
          }))
        })),
        or: jest.fn(() => ({
          then: jest.fn().mockResolvedValue({
            data: [mockData],
            error: null
          })
        })),
        then: jest.fn().mockResolvedValue({
          data: [mockData],
          error: null
        })
      }))
    }))
  }))
}));

describe('Supabase Integration Tests', () => {
  const testCases: Array<{name: string, params: SearchParams}> = [
    {
      name: 'Simple name search',
      params: { searchText: 'John' }
    },
    {
      name: 'Location search',
      params: { location: 'Damascus' }
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
      }
    },
    {
      name: 'Female detainees search',
      params: { gender: 'female' as DetaineeGender }
    },
    {
      name: 'Empty search with filters',
      params: { status: 'detained' as DetaineeStatus }
    }
  ];

  testCases.forEach(({ name, params }) => {
    it(`${name} should return valid results within performance threshold`, async () => {
      console.log(`\n${name}:`);
      const startTime = performance.now();
      
      const { data, error } = await performSearch(params);
      
      const duration = performance.now() - startTime;
      console.log(`- Duration: ${duration.toFixed(2)}ms`);
      console.log(`- Results found: ${data?.length || 0}`);

      // Basic assertions
      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000); // Performance threshold of 1 second
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
