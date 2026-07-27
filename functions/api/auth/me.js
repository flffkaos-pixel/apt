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
    return json({ user: { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture, subscription: payload.subscription || null } });
  } catch (e) {
    return json({ user: null });
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
