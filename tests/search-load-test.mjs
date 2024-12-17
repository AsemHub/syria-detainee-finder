import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

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

class PerformanceAnalyzer {
  constructor() {
    this.metrics = [];
  }

  addMetric(metric) {
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
        acc[m.error] = (acc[m.error] || 0) + 1;
        return acc;
      }, {});

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

  calculatePercentile(percentile) {
    const sortedDurations = this.metrics
      .map(m => m.duration)
      .sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sortedDurations.length) - 1;
    return sortedDurations[index];
  }
}

// Performance monitoring class
class SearchPerformanceMonitor {
  constructor() {
    this.metrics = {
      searches: [],
      phaseTimings: {
        prefix: [],
        advanced: [],
        total: []
      },
      scriptTimings: {
        arabic: [],
        latin: []
      },
      errors: {
        timeouts: 0,
        other: 0
      },
      connectionPool: {
        concurrent: 0,
        maxConcurrent: 0
      }
    };
  }

  startSearch() {
    this.metrics.connectionPool.concurrent++;
    this.metrics.connectionPool.maxConcurrent = Math.max(
      this.metrics.connectionPool.maxConcurrent,
      this.metrics.connectionPool.concurrent
    );
    return performance.now();
  }

  endSearch() {
    this.metrics.connectionPool.concurrent--;
  }

  recordPhase(phase, duration, success) {
    this.metrics.phaseTimings[phase].push({
      duration,
      success,
      timestamp: new Date()
    });
  }

  recordScriptTiming(script, duration) {
    this.metrics.scriptTimings[script].push({
      duration,
      timestamp: new Date()
    });
  }

  recordError(type) {
    if (type === 'timeout') {
      this.metrics.errors.timeouts++;
    } else {
      this.metrics.errors.other++;
    }
  }

  generateReport() {
    const calculateStats = (timings) => {
      if (timings.length === 0) return null;
      const durations = timings.map(t => t.duration);
      return {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
        count: timings.length,
        successRate: timings.filter(t => t.success).length / timings.length * 100
      };
    };

    return {
      summary: {
        totalSearches: this.metrics.phaseTimings.total.length,
        uniqueQueries: new Set(this.metrics.searches.map(s => s.query)).size,
        timeouts: this.metrics.errors.timeouts,
        otherErrors: this.metrics.errors.other,
        maxConcurrentSearches: this.metrics.connectionPool.maxConcurrent
      },
      performance: {
        prefix: calculateStats(this.metrics.phaseTimings.prefix),
        advanced: calculateStats(this.metrics.phaseTimings.advanced),
        total: calculateStats(this.metrics.phaseTimings.total),
        byScript: {
          arabic: calculateStats(this.metrics.scriptTimings.arabic),
          latin: calculateStats(this.metrics.scriptTimings.latin)
        }
      },
      slowQueries: this.metrics.searches
        .filter(s => s.duration > 2000)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
    };
  }

  calculatePercentile(numbers, percentile) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

const performanceMonitor = new SearchPerformanceMonitor();

// Helper function to process mixed language text
function preprocessSearchText(text) {
  // Split on whitespace and handle each part separately
  const parts = text.split(/\s+/).filter(Boolean);
  
  // Detect script (Arabic or Latin) for each part
  return parts.map(part => {
    const isArabic = /[\u0600-\u06FF]/.test(part);
    return {
      text: part,
      isArabic
    };
  });
}

// Helper function to calculate dynamic timeout
function calculateTimeout(searchText, isArabic) {
  // Base timeout
  let timeout = 2000;

  // Adjust for script type
  if (isArabic) {
    timeout += 1500; // Arabic needs more time
  }

  // Adjust for text length (longer text needs more time)
  timeout += Math.min(searchText.length * 100, 1000);

  // Adjust for complexity
  if (searchText.includes(' ')) {
    timeout += 500; // Multi-word queries
  }
  if (/[^\w\s]/.test(searchText)) {
    timeout += 500; // Special characters
  }

  // Cap the maximum timeout
  return Math.min(timeout, 5000);
}

// Helper function to normalize text for prefix search
function normalizeForPrefix(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

async function tryPrefixSearch(searchText, timeoutMs) {
  try {
    // Try exact prefix first
    const { data: exactData, error: exactError } = await Promise.race([
      supabase.rpc('search_detainees_by_prefix', {
        search_prefix: searchText
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Prefix search timeout')), timeoutMs * 0.5)
      )
    ]);

    if (!exactError && exactData?.length > 0) {
      return { data: exactData, source: 'exact' };
    }

    // If no exact match, try normalized prefix
    const normalized = normalizeForPrefix(searchText);
    if (normalized !== searchText) {
      const { data: normalizedData, error: normalizedError } = await Promise.race([
        supabase.rpc('search_detainees_by_prefix', {
          search_prefix: normalized
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Normalized prefix search timeout')), timeoutMs * 0.5)
        )
      ]);

      if (!normalizedError && normalizedData?.length > 0) {
        return { data: normalizedData, source: 'normalized' };
      }
    }

    return { data: null, source: null };
  } catch (error) {
    console.warn('Prefix search failed:', error.message);
    return { data: null, source: null, error };
  }
}

async function performSearch(searchText, maxTimeoutMs = 5000) {
  const startTime = performanceMonitor.startSearch();
  try {
    // Process mixed language text
    const searchParts = preprocessSearchText(searchText);
    console.log(`Search "${searchText}" split into ${searchParts.length} parts:`, 
      searchParts.map(p => `${p.text} (${p.isArabic ? 'Arabic' : 'Latin'})`));
    
    // Calculate timeouts based on text properties
    const hasArabic = searchParts.some(p => p.isArabic);
    const baseTimeout = calculateTimeout(searchText, hasArabic);
    const effectiveTimeout = Math.min(baseTimeout, maxTimeoutMs);
    
    console.log(`Using timeout: ${effectiveTimeout}ms (base: ${baseTimeout}ms)`);

    // If it's a single term, try optimized prefix search
    if (searchParts.length === 1) {
      const prefixStart = performance.now();
      const { data: prefixData, source } = await tryPrefixSearch(searchText, effectiveTimeout);

      const prefixDuration = performance.now() - prefixStart;
      performanceMonitor.recordPhase('prefix', prefixDuration, !!prefixData);
      
      if (prefixData) {
        console.log(`${source} prefix search succeeded in ${prefixDuration.toFixed(2)}ms with ${prefixData.length} results`);
        const totalDuration = performance.now() - startTime;
        performanceMonitor.recordPhase('total', totalDuration, true);
        performanceMonitor.endSearch();
        return prefixData;
      }
    }

    // For each part, do a separate search and combine results
    const searchPromises = searchParts.map(async ({ text, isArabic }) => {
      const partStart = performance.now();
      const partTimeout = calculateTimeout(text, isArabic);
      
      try {
        const { data, error } = await Promise.race([
          supabase.rpc('search_detainees_advanced', {
            search_text: text
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Search timeout for term: ${text}`)), partTimeout);
          })
        ]);

        const partDuration = performance.now() - partStart;
        performanceMonitor.recordScriptTiming(isArabic ? 'arabic' : 'latin', partDuration);
        
        if (error) throw error;
        console.log(`Part "${text}" search completed in ${partDuration.toFixed(2)}ms with ${data?.length || 0} results`);
        return data || [];
      } catch (error) {
        const partDuration = performance.now() - partStart;
        performanceMonitor.recordScriptTiming(isArabic ? 'arabic' : 'latin', partDuration);
        console.warn(`Search part failed: ${text}`, error.message);
        return [];
      }
    });

    // Wait for all searches to complete or timeout
    const results = await Promise.race([
      Promise.all(searchPromises),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Global search timeout')), effectiveTimeout);
      })
    ]);

    // Combine and deduplicate results
    const combinedResults = results.flat();
    const uniqueResults = Array.from(new Map(
      combinedResults.map(item => [item.id, item])
    ).values());

    const totalDuration = performance.now() - startTime;
    performanceMonitor.recordPhase('advanced', totalDuration, true);
    performanceMonitor.recordPhase('total', totalDuration, true);
    console.log(`Total search completed in ${totalDuration.toFixed(2)}ms with ${uniqueResults.length} unique results`);
    
    performanceMonitor.endSearch();
    return uniqueResults;
  } catch (error) {
    const totalDuration = performance.now() - startTime;
    if (error.message.includes('timeout')) {
      performanceMonitor.recordError('timeout');
      console.error('Search timeout:', error.message);
      performanceMonitor.recordPhase('total', totalDuration, false);
      performanceMonitor.endSearch();
      return []; // Return empty results on timeout
    }
    performanceMonitor.recordError('other');
    console.error('Search error:', error.message);
    performanceMonitor.recordPhase('total', totalDuration, false);
    performanceMonitor.endSearch();
    throw error;
  }
}

async function runLoadTest(config) {
  const analyzer = new PerformanceAnalyzer();
  const allTestCases = Object.values(testCases).flat();
  
  console.log('Starting load test with configuration:', config);

  for (let iteration = 0; iteration < config.totalIterations; iteration++) {
    console.log(`\nIteration ${iteration + 1}/${config.totalIterations}`);
    
    const searches = Array(config.concurrentSearches)
      .fill(null)
      .map(() => {
        const query = allTestCases[Math.floor(Math.random() * allTestCases.length)];
        return testSearch(query, analyzer);
      });

    await Promise.all(searches);
    
    if (iteration < config.totalIterations - 1) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
    }
  }

  // Generate and print reports
  const basicReport = analyzer.generateReport();
  const detailedReport = performanceMonitor.generateReport();
  
  console.log('\nBasic Load Test Report:');
  console.log(JSON.stringify(basicReport, null, 2));
  
  console.log('\nDetailed Performance Report:');
  console.log(JSON.stringify(detailedReport, null, 2));

  return { basicReport, detailedReport };
}

async function testSearch(query, analyzer) {
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

  } catch (error) {
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
