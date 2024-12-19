import fetch from 'node-fetch'

export const customFetch = async (url: string, options: RequestInit = {}) => {
  const timeout = 30000 // 30 seconds
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`)
    }
    throw error
  }
}
