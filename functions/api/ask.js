export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Rate limiting — 10 requests per minute per IP
    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rate:${ip}`;
    const now = Date.now();
    const window = 60000; // 1 minute in ms
    const limit = 10;

    if (context.env.RATE_LIMIT_KV) {
      const raw = await context.env.RATE_LIMIT_KV.get(key);
      const timestamps = raw ? JSON.parse(raw) : [];
      const recent = timestamps.filter(t => now - t < window);

      if (recent.length >= limit) {
        return new Response(JSON.stringify({
          error: 'Too many requests. Please wait a moment.',
          status: 'rate_limited'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      recent.push(now);
      await context.env.RATE_LIMIT_KV.put(key, JSON.stringify(recent), {
        expirationTtl: 120
      });
    }

    // Proxy to Railway
    const body = await context.request.text();
    const upstream = await fetch(
      'https://web-production-5799b.up.railway.app/ask',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      }
    );

    const result = await upstream.text();
    return new Response(result, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
