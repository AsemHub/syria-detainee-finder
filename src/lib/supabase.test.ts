import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }))
    })),
    auth: jest.fn(),
  })
}));

describe('Supabase Client', () => {
  const mockSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const mockSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully connects to Supabase', () => {
    // Create a new client
    const client = createClient(mockSupabaseUrl!, mockSupabaseKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        fetch: expect.any(Function)
      }
    });

    // Verify client was created with correct options
    expect(createClient).toHaveBeenCalledWith(
      mockSupabaseUrl,
      mockSupabaseKey,
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }),
        global: expect.objectContaining({
          fetch: expect.any(Function)
        })
      })
    );

    // Verify client has required properties
    expect(client).toHaveProperty('auth');
    expect(client).toHaveProperty('from');
  });
});
