export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const origin = url.origin;

  if (error || !code) {
    return Response.redirect(origin + '/app?auth=error', 302);
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Google OAuth not configured', { status: 500 });
  }

  const redirectUri = env.GOOGLE_REDIRECT_URI || (origin + '/api/auth/callback');

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResp.ok) {
    return Response.redirect(origin + '/app?auth=error', 302);
  }

  const tokens = await tokenResp.json();

  const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResp.ok) {
    return Response.redirect(origin + '/app?auth=error', 302);
  }

  const user = await userResp.json();

  const sessionToken = await signSession(user, env.JWT_SECRET);

  const response = Response.redirect(origin + '/app', 302);
  response.headers.append(
    'Set-Cookie',
    `session=${sessionToken}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`
  );

  return response;
}

async function signSession(user, secret) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    exp: Math.floor(Date.now() / 1000) + 604800,
  };
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret.padEnd(32, 'X').slice(0, 32)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const data = encoder.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(JSON.stringify(payload)) + '.' + sigHex;
}
