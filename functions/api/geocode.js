export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return new Response(JSON.stringify({ error: 'query는 필수입니다.' }), {
      status: 400, headers: { 'content-type': 'application/json' }
    });
  }

  const apiUrl = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  apiUrl.searchParams.set('query', query);

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
