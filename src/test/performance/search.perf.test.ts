import { performance } from 'perf_hooks';
import { createClient } from '@/lib/supabase';

describe('Search Performance Tests', () => {
  const supabase = createClient();
  
  // Helper function to measure execution time
  const measureExecutionTime = async (fn: () => Promise<any>) => {
    const start = performance.now();
    await fn();
    return performance.now() - start;
  };

  it('should return search results within acceptable time limit', async () => {
    const executionTime = await measureExecutionTime(async () => {
      await supabase
        .from('detainees')
        .select('*')
        .textSearch('full_name_ar_normalized', 'محمد')
        .limit(10);
    });

    // Search should complete within 1 second
    expect(executionTime).toBeLessThan(1000);
  });

  it('should handle pagination efficiently', async () => {
    const executionTime = await measureExecutionTime(async () => {
      await supabase
        .from('detainees')
        .select('*')
        .range(0, 9)
        .order('created_at', { ascending: false });
    });

    // Pagination should complete within 500ms
    expect(executionTime).toBeLessThan(500);
  });

  it('should handle complex filters efficiently', async () => {
    const executionTime = await measureExecutionTime(async () => {
      await supabase
        .from('detainees')
        .select('*')
        .eq('status', 'detained')
        .gte('detention_date', '2020-01-01')
        .textSearch('detention_location_ar_normalized', 'دمشق')
        .limit(10);
    });

    // Complex queries should complete within 1.5 seconds
    expect(executionTime).toBeLessThan(1500);
  });
});
