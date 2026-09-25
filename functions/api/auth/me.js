export async function onRequest(context) {
  try {
    const env = (context && context.env) || {};
    const request = context.request;
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/session=([^;]+)/);
    if (!match) {
      return json({ user: null });
    }
    const parts = match[1].split('.');
    if (parts.length !== 2) {
      return json({ user: null });
    }
    const payload = JSON.parse(base64Decode(parts[0]));
    const sigHex = parts[1];
    const secret = (env.JWT_SECRET || 'fallback-secret-key-12345').padEnd(32, 'X').slice(0, 32);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, hexToBytes(sigHex), encoder.encode(JSON.stringify(payload)));
    if (!valid || payload.exp < Math.floor(Date.now() / 1000)) {
      return json({ user: null });
    }
    let subscription = payload.subscription || null;
    const email = (payload.email || '').toLowerCase();
    if (email && env.PREMIUM_KV) {
      const kv = env.PREMIUM_KV;
      if (await kv.get('premium:' + email)) {
        subscription = 'premium';
      } else {
        const subId = await kv.get('sub:' + email);
        if (subId) subscription = (await reverifySubscription(env, email, subId)) ? 'premium' : null;
      }
    }
    return json({ user: { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture, subscription } });
  } catch (e) {
    return json({ user: null });
  }
}

// ponytail: 웹훅 대신 프리미엄 만료 시 PayPal에 직접 재검증 (일 1회 캐시) — 웹훅 서명검증은 규모 커지면 추가
async function reverifySubscription(env, email, subId) {
  try {
    const kv = env.PREMIUM_KV;
    const today = new Date().toISOString().slice(0, 10);
    if (await kv.get('rv:' + email + ':' + today)) return !!(await kv.get('premium:' + email));

    const id = env.PAYPAL_CLIENT_ID, secret = env.PAYPAL_CLIENT_SECRET;
    if (!id || !secret) return false;
    const base = env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const tokenResp = await fetch(base + '/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(id + ':' + secret), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) return false;

    const r = await fetch(base + '/v1/billing/subscriptions/' + encodeURIComponent(subId), {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    });
    const sub = await r.json();
    await kv.put('rv:' + email + ':' + today, '1', { expirationTtl: 86400 });
    if (sub && sub.status === 'ACTIVE') {
      await kv.put('premium:' + email, '1', { expirationTtl: 60 * 60 * 24 * 32 });
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function json(data) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
function hexToBytes(hex) {
  var bytes = new Uint8Array(hex.length / 2);
  for (var i = 0; i < hex.length; i += 2) { bytes[i / 2] = parseInt(hex.substr(i, 2), 16); }
  return bytes;
}
function base64Decode(str) {
  var binary = atob(str);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
  return new TextDecoder().decode(bytes);
}
