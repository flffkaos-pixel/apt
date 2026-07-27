export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const origin = url.origin;
    const response = Response.redirect(origin + '/app', 302);
    response.headers.append('Set-Cookie', 'session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax');
    return response;
  } catch (e) {
    return new Response('logout.js error: ' + e.message, { status: 500 });
  }
}
