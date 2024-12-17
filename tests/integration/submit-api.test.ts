import { Request } from 'node-fetch';
import { POST } from '@/app/api/submit/route';
import { supabaseServer } from '@/lib/supabase.server';

// Mock Supabase
jest.mock('@/lib/supabase.server', () => ({
  supabaseServer: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    rpc: jest.fn()
  }
}));

const mockRequest = (body: any) => {
  const init = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '127.0.0.1'
    },
    body: JSON.stringify(body)
  };
  const request = new Request('http://localhost:3000/api/submit', init);
  return Request.from(request);
};

describe('Submit API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully submit valid detainee data', async () => {
    const validData = {
      full_name: 'John Doe',
      date_of_detention: '2023-01-01',
      last_seen_location: 'Damascus',
      detention_facility: 'Unknown',
      physical_description: 'Tall',
      age_at_detention: 30,
      gender: 'male',
      status: 'detained',
      notes: 'Additional information'
    };

    const mockSupabaseResponse = {
      data: { id: '123', ...validData },
      error: null
    };

    const mockSingle = jest.fn().mockResolvedValueOnce(mockSupabaseResponse);
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabaseServer.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const response = await POST(mockRequest(validData));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toMatch(/submitted successfully/);
  });

  it('should handle rate limiting', async () => {
    const validData = {
      full_name: 'John Doe',
      last_seen_location: 'Damascus',
      gender: 'male',
      status: 'detained',
      notes: 'Additional information'
    };

    // Submit multiple times to trigger rate limit
    const requests = Array(6).fill(null).map(() => POST(mockRequest(validData)));
    const responses = await Promise.all(requests);

    const rateLimitedResponse = responses.find(r => r.status === 429);
    expect(rateLimitedResponse).toBeDefined();
    if (!rateLimitedResponse) {
      throw new Error('Expected to find a rate-limited response');
    }
    const responseData = await rateLimitedResponse.json();
    expect(responseData.error).toBe('Too many submissions. Please try again later.');
  });

  it('should validate input data', async () => {
    const invalidData = {
      full_name: 'A', // Too short
      last_seen_location: '',
      gender: 'invalid',
      status: 'invalid',
      notes: ''
    };

    const response = await POST(mockRequest(invalidData));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeTruthy();
  });

  it('should handle database errors gracefully', async () => {
    const validData = {
      full_name: 'John Doe',
      last_seen_location: 'Damascus',
      gender: 'male',
      status: 'detained',
      notes: 'Additional information'
    };

    const mockSupabaseError = {
      data: null,
      error: new Error('Database error')
    };

    const mockSingle = jest.fn().mockResolvedValueOnce(mockSupabaseError);
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabaseServer.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const response = await POST(mockRequest(validData));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Database operation failed');
  });
});
