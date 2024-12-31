import { NextRequest } from 'next/server'
import { POST } from './route'
import { supabaseServer } from '@/lib/supabase.server'

jest.mock('@/lib/supabase.server', () => ({
  supabaseServer: {
    rpc: jest.fn()
  }
}))

describe('Check Duplicate API', () => {
  const mockRequest = (body: any) => 
    new NextRequest('http://localhost:3000/api/check-duplicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should find exact matches', async () => {
    const searchName = 'John Doe'
    const mockMatches = [
      { id: '1', full_name: 'John Doe', status: 'missing', last_seen_location: 'Damascus' }
    ]

    ;(supabaseServer.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: mockMatches, error: null })

    const response = await POST(mockRequest({ full_name: searchName }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.matches.exact).toHaveLength(1)
    expect(data.matches.similar).toHaveLength(0)
  })

  it('should find similar matches', async () => {
    const searchName = 'Jon Doe'
    const mockSimilarMatches = [
      { id: '1', full_name: 'John Doe', status: 'missing', last_seen_location: 'Damascus' }
    ]

    ;(supabaseServer.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: mockSimilarMatches, error: null })

    const response = await POST(mockRequest({ full_name: searchName }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.matches.exact).toHaveLength(0)
    expect(data.matches.similar).toHaveLength(1)
  })

  it('should handle Arabic names', async () => {
    const searchName = 'عبد الله'
    const mockMatches = [
      { id: '1', full_name: 'عبد الله', status: 'missing', last_seen_location: 'دمشق' }
    ]

    ;(supabaseServer.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: mockMatches, error: null })

    const response = await POST(mockRequest({ full_name: searchName }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.matches.exact).toHaveLength(1)
    expect(data.matches.similar).toHaveLength(0)
  })

  it('should handle search errors gracefully', async () => {
    ;(supabaseServer.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: null, error: new Error('Search failed') })

    const response = await POST(mockRequest({ full_name: 'John Doe' }))
    expect(response.status).toBe(500)
  })

  it('should validate input', async () => {
    const response = await POST(mockRequest({ full_name: '' }))
    expect(response.status).toBe(400)
  })
})
