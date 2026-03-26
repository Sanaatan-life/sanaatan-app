export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Rate limiting using Cloudflare's built-in IP
    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate:${ip}`;

    // Simple rate limit check using KV if available, otherwise skip
    // Full rate limiting added in Step 4

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
