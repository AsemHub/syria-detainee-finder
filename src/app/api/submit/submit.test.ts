import { NextRequest } from 'next/server'
import { POST } from './route'
import { supabaseServer } from '@/lib/supabase.server'

// Mock Supabase
jest.mock('@/lib/supabase.server', () => ({
  supabaseServer: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn()
  }
}))

describe('Submit API', () => {
  const mockRequest = (body: any) => 
    new NextRequest('http://localhost:3000/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '127.0.0.1'
      },
      body: JSON.stringify(body)
    })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully submit valid detainee data', async () => {
    const validData = {
      full_name: 'John Doe',
      date_of_detention: '2023-01-01',
      last_seen_location: 'Damascus',
      detention_facility: 'Unknown',
      physical_description: 'Tall',
      age_at_detention: 30,
      gender: 'male',
      status: 'missing',
      contact_info: 'john@example.com'
    }

    ;(supabaseServer.from as jest.Mock).mockReturnThis()
    ;(supabaseServer.insert as jest.Mock).mockReturnThis()
    ;(supabaseServer.select as jest.Mock).mockReturnThis()
    ;(supabaseServer.single as jest.Mock).mockResolvedValueOnce({
      data: { id: '123', ...validData },
      error: null
    })

    const response = await POST(mockRequest(validData))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toMatch(/submitted successfully/)
  })

  it('should handle rate limiting', async () => {
    const validData = {
      full_name: 'John Doe',
      last_seen_location: 'Damascus',
      gender: 'male',
      status: 'missing',
      contact_info: 'john@example.com'
    }

    // Submit multiple times to trigger rate limit
    const requests = Array(6).fill(null).map(() => POST(mockRequest(validData)))
    const responses = await Promise.all(requests)

    const rateLimitedResponse = responses.find(r => r.status === 429)
    expect(rateLimitedResponse).toBeDefined()
    const responseData = await rateLimitedResponse.json()
    expect(responseData.error).toBeTruthy()
    expect(responseData.details).toBeTruthy()
  })

  it('should validate input data', async () => {
    const invalidData = {
      full_name: 'A', // Too short
      last_seen_location: '',
      gender: 'invalid',
      status: 'unknown',
      contact_info: ''
    }

    const response = await POST(mockRequest(invalidData))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.details).toBeDefined()
  })

  it('should handle database errors gracefully', async () => {
    const validData = {
      full_name: 'John Doe',
      last_seen_location: 'Damascus',
      gender: 'male',
      status: 'missing',
      contact_info: 'john@example.com'
    }

    ;(supabaseServer.single as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Database error')
    })

    const response = await POST(mockRequest(validData))
    expect(response.status).toBe(500)
  })
})
