import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 10 // Number of requests
const RATE_LIMIT_WINDOW = 60 * 1000 // Time window in milliseconds (1 minute)

export async function rateLimit(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1'
  const key = `rate-limit:${ip}`

  try {
    // Get the current requests count
    const currentRequests = await redis.get<number>(key) || 0

    if (currentRequests >= RATE_LIMIT_REQUESTS) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': RATE_LIMIT_WINDOW.toString(),
        },
      })
    }

    // Increment the requests count
    await redis.multi()
      .incr(key)
      .pexpire(key, RATE_LIMIT_WINDOW)
      .exec()

    // Add rate limit headers
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString())
    headers.set('X-RateLimit-Remaining', (RATE_LIMIT_REQUESTS - currentRequests - 1).toString())
    headers.set('X-RateLimit-Reset', (Date.now() + RATE_LIMIT_WINDOW).toString())

    return { success: true, headers }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // If rate limiting fails, allow the request
    return { success: true, headers: new Headers() }
  }
}
