import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import nodeFetch from 'node-fetch';

// Connection pool configuration
const poolConfig = {
  'keep-alive': true,
  'keep-alive-msecs': 10000,
  maxSockets: 20,
  maxFreeSockets: 10,
  timeout: 60000,
};

// Create an agent for connection pooling
const http = require('http');
const https = require('https');
const httpAgent = new http.Agent(poolConfig);
const httpsAgent = new https.Agent(poolConfig);

const customFetch = (url: string, options: any) => {
  const agent = url.startsWith('https:') ? httpsAgent : httpAgent;
  return nodeFetch(url, { ...options, agent });
};

// Cache for connection test results
const connectionTestCache = {
  lastTest: 0,
  result: null as any,
  validityPeriod: 5000, // 5 seconds
};

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

// Create a single supabase client for interacting with your database
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: customFetch,
    },
    db: {
      schema: 'public',
    },
    queries: {
      retryCount: 2,
      retryDelay: 200,
    },
  }
);

export const testConnection = async () => {
  const now = Date.now();
  
  // Return cached result if still valid
  if (connectionTestCache.result && (now - connectionTestCache.lastTest) < connectionTestCache.validityPeriod) {
    return connectionTestCache.result;
  }

  try {
    const result = await supabaseServer.from('detainees').select('id').limit(1);
    connectionTestCache.result = { data: result.data, error: null };
    connectionTestCache.lastTest = now;
    return connectionTestCache.result;
  } catch (error) {
    connectionTestCache.result = { data: null, error };
    connectionTestCache.lastTest = now;
    return connectionTestCache.result;
  }
};

// Initialize connection test
testConnection()
