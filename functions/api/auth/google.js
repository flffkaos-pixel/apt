export async function onRequest(context) {
  try {
    const env = (context && context.env) || {};
    const clientId = env.GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      return new Response('Missing GOOGLE_CLIENT_ID env var', { status: 500 });
    }
    const url = new URL(context.request.url);
    const origin = url.origin;
    const redirectUri = env.GOOGLE_REDIRECT_URI || (origin + '/api/auth/callback');
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');
    return Response.redirect(authUrl.toString(), 302);
  } catch (e) {
    return new Response('google.js error: ' + e.message, { status: 500 });
  }
}
