import { performSearch } from './supabase';
import { DetaineeStatus, DetaineeGender, Detainee, SearchParams } from '@/types';

interface TestScenario {
  name: string;
  params: SearchParams;
  expectedResults: (detainee: Detainee) => boolean;
}

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

describe('Search Performance Tests', () => {
  const PERFORMANCE_THRESHOLD = 1000; // 1 second

  const scenarios: TestScenario[] = [
    {
      name: 'Simple name search',
      params: { searchText: 'John' },
      expectedResults: (detainee: Detainee) => 
        detainee.full_name.toLowerCase().includes('john')
    },
    {
      name: 'Location search',
      params: { location: 'Damascus' },
      expectedResults: (detainee: Detainee) =>
        detainee.last_seen_location.toLowerCase().includes('damascus')
    },
    {
      name: 'Status search',
      params: { status: 'detained' as DetaineeStatus },
      expectedResults: (detainee: Detainee) =>
        detainee.status === 'detained'
    },
    {
      name: 'Gender search',
      params: { gender: 'female' as DetaineeGender },
      expectedResults: (detainee: Detainee) =>
        detainee.gender === 'female'
    },
    {
      name: 'Age range search',
      params: { ageMin: 20, ageMax: 40 },
      expectedResults: (detainee: Detainee) =>
        (detainee.age_at_detention || 0) >= 20 && (detainee.age_at_detention || 0) <= 40
    }
  ];

  scenarios.forEach((scenario) => {
    it(`${scenario.name} should return results within performance threshold`, async () => {
      const startTime = performance.now();
      const { data, error } = await performSearch(scenario.params);
      const duration = performance.now() - startTime;

      // Log performance metrics
      console.log(`\n${scenario.name}:`);
      console.log(`- Duration: ${duration.toFixed(2)}ms`);
      console.log(`- Results found: ${data?.length || 0}`);

      // Performance assertions
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      // Validate results match expected criteria
      if (data) {
        data.forEach(detainee => {
          expect(scenario.expectedResults(detainee)).toBe(true);
        });
      }
    });
  });

  it('should handle multiple concurrent searches efficiently', async () => {
    const startTime = performance.now();
    const searches = scenarios.map(scenario => performSearch(scenario.params));
    const results = await Promise.all(searches);
    const duration = performance.now() - startTime;

    console.log('\nConcurrent Search Test:');
    console.log(`- Total Duration: ${duration.toFixed(2)}ms`);
    console.log(`- Average Duration: ${(duration / scenarios.length).toFixed(2)}ms`);

    results.forEach((result, index) => {
      const { data, error } = result;
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      if (data) {
        data.forEach(detainee => {
          expect(scenarios[index].expectedResults(detainee)).toBe(true);
        });
      }
    });
  });
});
