import { corsHeaders } from './cors'

export interface HandlerResponse {
  status: number
  data?: unknown
  error?: string
}

export async function handleCorsRequest(
  req: Request,
  handler: () => Promise<HandlerResponse>
): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const response = await handler()
    return new Response(
      JSON.stringify(response.data || { error: response.error }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    )
  } catch (error) {
    console.error('Error in handler:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}
