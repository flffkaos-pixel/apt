export async function onRequest(context) {
  const env = (context && context.env) || {};
  return new Response(JSON.stringify({
    paypalClientId: env.PAYPAL_CLIENT_ID || '',
    premiumPriceUsd: 3.90
  }), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
}
