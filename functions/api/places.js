export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  const x = url.searchParams.get('x');
  const y = url.searchParams.get('y');
  const radius = url.searchParams.get('radius') || '1000';

  if (!query) {
    return new Response(JSON.stringify({ error: 'query는 필수입니다.' }), {
      status: 400, headers: { 'content-type': 'application/json' }
    });
  }

  const apiUrl = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  apiUrl.searchParams.set('query', query);
  if (x) apiUrl.searchParams.set('x', x);
  if (y) apiUrl.searchParams.set('y', y);
  apiUrl.searchParams.set('radius', radius);

  try {
    const resp = await fetch(apiUrl.toString(), {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` }
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
