export async function onRequest(context) {
  const { env } = context;
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response('GOOGLE_CLIENT_ID not configured', { status: 500 });
  }
  const origin = new URL(context.request.url).origin;
  const redirectUri = env.GOOGLE_REDIRECT_URI || (origin + '/api/auth/callback');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  return Response.redirect(url.toString(), 302);
}
