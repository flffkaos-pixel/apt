// 구독 승인 확인: PayPal에 실제 ACTIVE 상태인지 검증 후 프리미엄 부여
// ponytail: 웹훅 대신 me.js에서 만료시 재검증 — 규모 커지면 PAYMENT.SALE.COMPLETED 웹훅 추가

async function getPayPalToken(env) {
  const id = env.PAYPAL_CLIENT_ID, secret = env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET 미설정');
  const base = env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const resp = await fetch(base + '/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(id + ':' + secret), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('PayPal 토큰 발급 실패');
  return { token: data.access_token, base };
}

async function sessionEmail(request, env) {
  try {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;
    const parts = match[1].split('.');
    if (parts.length !== 2) return null;
    const payload = JSON.parse(base64Decode(parts[0]));
    const secret = (env.JWT_SECRET || 'fallback-secret-key-12345').padEnd(32, 'X').slice(0, 32);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, hexToBytes(parts[1]), encoder.encode(JSON.stringify(payload)));
    if (!valid || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return (payload.email || '').toLowerCase() || null;
  } catch (e) { return null; }
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const kv = env.PREMIUM_KV;
    if (!kv) return new Response(JSON.stringify({ error: 'PREMIUM_KV 바인딩 필요' }), { status: 500, headers: { 'content-type': 'application/json' } });

    const email = await sessionEmail(request, env);
    if (!email) return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), { status: 401, headers: { 'content-type': 'application/json' } });

    const body = await request.json();
    const subId = (body.subscriptionId || '').trim();
    if (!subId) return new Response(JSON.stringify({ error: 'subscriptionId 필수' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const { token, base } = await getPayPalToken(env);
    const r = await fetch(base + '/v1/billing/subscriptions/' + encodeURIComponent(subId), {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const sub = await r.json();
    if (sub.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: '구독이 활성 상태가 아닙니다 (상태: ' + (sub.status || '알 수 없음') + ')' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    // 프리미엄 32일 유효 — 월 갱신은 me.js 재검증이 자동 연장 처리
    await kv.put('sub:' + email, subId, { expirationTtl: 31536000 });
    await kv.put('premium:' + email, '1', { expirationTtl: 60 * 60 * 24 * 32 });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

function base64Decode(str) {
  var binary = atob(str);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
  return new TextDecoder().decode(bytes);
}
function hexToBytes(hex) {
  var bytes = new Uint8Array(hex.length / 2);
  for (var i = 0; i < hex.length; i += 2) { bytes[i / 2] = parseInt(hex.substr(i, 2), 16); }
  return bytes;
}
