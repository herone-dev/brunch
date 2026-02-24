import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
    if (!N8N_WEBHOOK_URL) {
      throw new Error('N8N_WEBHOOK_URL is not configured')
    }

    const { image, filename } = await req.json()

    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: true, message: 'Image invalide. Format base64 data:image/... attendu.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limit ~10MB base64
    if (image.length > 14_000_000) {
      return new Response(
        JSON.stringify({ error: true, message: 'Image trop volumineuse (max 10 MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, filename }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('n8n webhook error:', response.status, JSON.stringify(data))
      return new Response(
        JSON.stringify({ error: true, message: `Erreur d'analyse (${response.status})`, details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur analyse menu:', error)
    return new Response(
      JSON.stringify({ error: true, message: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
