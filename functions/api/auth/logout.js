export async function onRequest(context) {
  const origin = new URL(context.request.url).origin;
  const response = Response.redirect(origin + '/app', 302);
  response.headers.append(
    'Set-Cookie',
    'session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax'
  );
  return response;
}
