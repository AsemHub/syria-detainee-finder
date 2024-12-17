import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test cases covering different scenarios
const testCases = {
  exactMatches: [
    'asem',
    'nader',
    'omar',
    'fatima',
    'ahmad',
  ],
  partialMatches: [
    'sam',
    'nad',
    'fat',
    'ahm',
  ],
  arabicNames: [
    'عاصم',
    'نادر',
    'عمر',
    'فاطمة',
    'أحمد',
  ],
  mixedText: [
    'asem الحلبي',
    'nader دمشق',
    'omar حلب',
  ],
  specialCases: [
    '',  // Empty string
    ' ',  // Whitespace
    'a',  // Single character
    'aa', // Two characters
    '123', // Numbers
    '@#$', // Special characters
  ]
};

// Performance metrics collector
interface SearchMetrics {
  query: string;
  duration: number;
  resultCount: number;
  error?: string;
  timestamp: Date;
}

class PerformanceAnalyzer {
  private metrics: SearchMetrics[] = [];

  addMetric(metric: SearchMetrics) {
    this.metrics.push(metric);
  }

  generateReport() {
    const totalTests = this.metrics.length;
    const successfulTests = this.metrics.filter(m => !m.error).length;
    const failedTests = totalTests - successfulTests;
    
    const avgDuration = this.metrics.reduce((acc, m) => acc + m.duration, 0) / totalTests;
    const maxDuration = Math.max(...this.metrics.map(m => m.duration));
    const minDuration = Math.min(...this.metrics.map(m => m.duration));

    const errors = this.metrics
      .filter(m => m.error)
      .reduce((acc, m) => {
        acc[m.error!] = (acc[m.error!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      summary: {
        totalTests,
        successfulTests,
        failedTests,
        successRate: (successfulTests / totalTests) * 100,
      },
      timing: {
        averageDuration: avgDuration,
        maxDuration,
        minDuration,
        p95: this.calculatePercentile(95),
        p99: this.calculatePercentile(99),
      },
      errors,
      slowQueries: this.metrics
        .filter(m => m.duration > 2000)
        .map(m => ({
          query: m.query,
          duration: m.duration,
          timestamp: m.timestamp,
        })),
    };
  }

  private calculatePercentile(percentile: number): number {
    const sortedDurations = this.metrics
      .map(m => m.duration)
      .sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sortedDurations.length) - 1;
    return sortedDurations[index];
  }
}

// Load test configuration
interface LoadTestConfig {
  concurrentSearches: number;
  delayBetweenBatches: number;
  totalIterations: number;
  timeoutMs: number;
}

async function performSearch(searchText: string) {
  try {
    const { data, error } = await supabase
      .rpc('search_detainees_optimized', {
        search_text: searchText
      });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Search error:', error.message);
    throw error;
  }
}

async function runLoadTest(config: LoadTestConfig) {
  const analyzer = new PerformanceAnalyzer();
  const allTestCases = Object.values(testCases).flat();
  
  console.log('Starting load test with configuration:', config);

  for (let iteration = 0; iteration < config.totalIterations; iteration++) {
    console.log(`\nIteration ${iteration + 1}/${config.totalIterations}`);
    
    // Run concurrent searches
    const searches = Array(config.concurrentSearches)
      .fill(null)
      .map(() => {
        const query = allTestCases[Math.floor(Math.random() * allTestCases.length)];
        return testSearch(query, analyzer);
      });

    await Promise.all(searches);
    
    // Wait between batches
    if (iteration < config.totalIterations - 1) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
    }
  }

  // Generate and print report
  const report = analyzer.generateReport();
  console.log('\nLoad Test Report:');
  console.log(JSON.stringify(report, null, 2));

  return report;
}

async function testSearch(query: string, analyzer: PerformanceAnalyzer) {
  const start = performance.now();
  try {
    const results = await performSearch(query);
    const duration = performance.now() - start;
    
    analyzer.addMetric({
      query,
      duration,
      resultCount: results?.length || 0,
      timestamp: new Date(),
    });

  } catch (error: any) {
    const duration = performance.now() - start;
    analyzer.addMetric({
      query,
      duration,
      resultCount: 0,
      error: error.message,
      timestamp: new Date(),
    });
  }
}

// Run different load test scenarios
async function runAllTests() {
  // Light load test
  console.log('\nRunning light load test...');
  await runLoadTest({
    concurrentSearches: 2,
    delayBetweenBatches: 1000,
    totalIterations: 5,
    timeoutMs: 5000,
  });

  // Medium load test
  console.log('\nRunning medium load test...');
  await runLoadTest({
    concurrentSearches: 5,
    delayBetweenBatches: 500,
    totalIterations: 5,
    timeoutMs: 5000,
  });

  // Heavy load test
  console.log('\nRunning heavy load test...');
  await runLoadTest({
    concurrentSearches: 10,
    delayBetweenBatches: 200,
    totalIterations: 5,
    timeoutMs: 5000,
  });
}

// Run the tests
runAllTests().catch(console.error);
