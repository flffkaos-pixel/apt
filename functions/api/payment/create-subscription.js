// PayPal 정기구독 생성: 상품/플랜은 최초 1회 생성 후 KV에 캐시
// ponytail: KV 캐시 없이 매번 생성하면 PayPal 계정에 플랜이 무한 증식함

const PRICE_USD = '3.90';

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
  if (!data.access_token) throw new Error('PayPal 토큰 발급 실패: ' + JSON.stringify(data).slice(0, 200));
  return { token: data.access_token, base };
}

async function ensurePlan(env) {
  const kv = env.PREMIUM_KV;
  if (!kv) throw new Error('PREMIUM_KV 바인딩 필요 (Cloudflare Pages > Settings > Bindings)');
  const { token, base } = await getPayPalToken(env);
  const auth = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  let planId = await kv.get('paypal:plan');
  if (planId) return { planId, token, base };

  let productId = await kv.get('paypal:product');
  if (!productId) {
    const r = await fetch(base + '/v1/catalogs/products', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: 'AptScouter Premium', type: 'SERVICE', description: '아파트 실거래가 프리미엄 분석 구독' })
    });
    const p = await r.json();
    if (!p.id) throw new Error('PayPal 상품 생성 실패: ' + JSON.stringify(p).slice(0, 200));
    productId = p.id;
    await kv.put('paypal:product', productId);
  }

  const r = await fetch(base + '/v1/billing/plans', {
    method: 'POST', headers: auth,
    body: JSON.stringify({
      product_id: productId,
      name: 'AptScouter Premium 월간',
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR', sequence: 1, total_cycles: 0,
        pricing_scheme: { fixed_price: { value: PRICE_USD, currency_code: 'USD' } }
      }],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 1, setup_fee_failure_action: 'CONTINUE' }
    })
  });
  const plan = await r.json();
  if (!plan.id) throw new Error('PayPal 플랜 생성 실패: ' + JSON.stringify(plan).slice(0, 200));
  await kv.put('paypal:plan', plan.id);
  return { planId: plan.id, token, base };
}

export async function onRequest(context) {
  try {
    const { env, request } = context;
    const { planId, token, base } = await ensurePlan(env);
    const origin = new URL(request.url).origin;
    const r = await fetch(base + '/v1/billing/subscriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        application_context: {
          brand_name: 'AptScouter',
          locale: 'ko-KR',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: origin + '/app.html?paypal=success',
          cancel_url: origin + '/app.html?paypal=cancel'
        }
      })
    });
    const sub = await r.json();
    if (!sub.id) return new Response(JSON.stringify({ error: '구독 생성 실패: ' + JSON.stringify(sub).slice(0, 200) }), { status: 500, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ subscriptionId: sub.id }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
