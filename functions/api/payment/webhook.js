export async function onRequest(context) {
  try {
    const { request, env } = context;
    const kv = env.PREMIUM_KV;
    if (!kv) {
      return new Response('KV not configured', { status: 500 });
    }

    if (request.method === 'POST') {
      const data = await request.json();
      const email = (data.email || '').toLowerCase().trim();
      if (!email || !email.includes('@')) {
        return new Response('Invalid email', { status: 400 });
      }
      await kv.put('premium:' + email, '1', { expirationTtl: 31536000 });
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const email = url.searchParams.get('email');
      if (!email) return new Response('Missing email', { status: 400 });
      await kv.delete('premium:' + email.toLowerCase().trim());
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const email = url.searchParams.get('email');
      if (!email) {
        return new Response(JSON.stringify({ premium: false }), { headers: { 'Content-Type': 'application/json' } });
      }
      const val = await kv.get('premium:' + email.toLowerCase().trim());
      return new Response(JSON.stringify({ premium: !!val }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (e) {
    return new Response('payment.js error: ' + e.message, { status: 500 });
  }
}