// Simple in-memory rate limiter (per isolate)
const ipRequests = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const window = 60000;
  const limit = 10;
  
  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, []);
  }
  
  const timestamps = ipRequests.get(ip).filter(t => now - t < window);
  
  if (timestamps.length >= limit) {
    ipRequests.set(ip, timestamps);
    return true;
  }
  
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return false;
}

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
    
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({
        error: 'Too many requests. Please wait a moment.',
        status: 'rate_limited'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
