import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== Deno.env.get('TMP_STRIPE_ADMIN_TOKEN')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const key = Deno.env.get('STRIPE_LIVE_SECRET_KEY') ?? Deno.env.get('STRIPE_SECRET_KEY')!
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const updates = (body as { updates?: { id: string; name?: string; description?: string }[] }).updates

  if (updates?.length) {
    const results: unknown[] = []
    for (const u of updates) {
      const form = new URLSearchParams()
      if (u.name) form.set('name', u.name)
      if (u.description) form.set('description', u.description)
      const res = await fetch(`https://api.stripe.com/v1/products/${u.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      })
      const json = await res.json()
      results.push({ id: u.id, ok: res.ok, name: json?.name, description: json?.description, error: json?.error?.message })
    }
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://api.stripe.com/v1/products?limit=100&active=true', {
    headers: { Authorization: `Bearer ${key}` },
  })
  const json = await res.json()
  const products = (json.data ?? []).map((p: { id: string; name: string; description: string | null }) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }))
  return new Response(JSON.stringify({ products }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
