export async function onRequest(context) {
  try {
    const env = (context && context.env) || {};
    const request = context.request;
    const url = new URL(request.url);
    const origin = url.origin;
    const code = url.searchParams.get('code');
    const err = url.searchParams.get('error');
    if (err || !code) {
      return Response.redirect(origin + '/app?auth=error', 302);
    }
    const clientId = env.GOOGLE_CLIENT_ID || '';
    const clientSecret = env.GOOGLE_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
      return new Response('Missing Google OAuth env vars', { status: 500 });
    }
    const redirectUri = env.GOOGLE_REDIRECT_URI || (origin + '/api/auth/callback');
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    if (!tokenResp.ok) {
      return Response.redirect(origin + '/app?auth=error', 302);
    }
    const tokens = await tokenResp.json();
    const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    });
    if (!userResp.ok) {
      return Response.redirect(origin + '/app?auth=error', 302);
    }
    const user = await userResp.json();
    const secret = (env.JWT_SECRET || 'fallback-secret-key-12345').padEnd(32, 'X').slice(0, 32);
    const isPremium = (env.PREMIUM_EMAILS || '').split(',').map(function(e){return e.trim().toLowerCase()}).indexOf(user.email.toLowerCase()) >= 0;
    const payload = { sub: user.id, email: user.email, name: user.name, picture: user.picture, subscription: isPremium ? 'premium' : null, exp: Math.floor(Date.now() / 1000) + 604800 };
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)));
    const sigHex = Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    const sessionToken = base64Encode(JSON.stringify(payload)) + '.' + sigHex;
    const headers = new Headers();
    headers.set('Location', origin + '/app?auth=success');
    headers.set('Set-Cookie', 'session=' + sessionToken + '; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax');
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return new Response('callback.js error: ' + e.message, { status: 500 });
  }
}
function base64Encode(str) {
  var bytes = new TextEncoder().encode(str);
  var binary = '';
  for (var i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}
