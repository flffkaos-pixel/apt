export async function onRequest(context) {
  try {
    const env = (context && context.env) || {};
    const request = context.request;
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    const body = await request.json();
    const email = (body.email || body.payer?.email_address || '').toLowerCase();
    if (!email) {
      return new Response('Missing email', { status: 400 });
    }
    const secret = env.JWT_SECRET || 'fallback-secret-key-12345';
    const kv = env.PREMIUM_KV;
    if (kv) {
      await kv.put('premium:' + email, JSON.stringify({ email, since: Date.now() }), { expirationTtl: 60 * 60 * 24 * 365 });
    }
    return new Response(JSON.stringify({ ok: true, email }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}