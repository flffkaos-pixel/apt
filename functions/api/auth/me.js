export async function onRequest(context) {
  const { request, env } = context;
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ user: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const parts = match[1].split('.');
  if (parts.length !== 2) {
    return json(null);
  }
  try {
    const payload = JSON.parse(atob(parts[0]));
    const sigHex = parts[1];
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode((env.JWT_SECRET || '').padEnd(32, 'X').slice(0, 32)),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, hexToBytes(sigHex), encoder.encode(JSON.stringify(payload))
    );
    if (!valid || payload.exp < Math.floor(Date.now() / 1000)) {
      return json(null);
    }
    return json({ user: { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture } });
  } catch {
    return json(null);
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
