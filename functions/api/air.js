export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sidoName = url.searchParams.get('sidoName') || '서울';

  const apiUrl = new URL('https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty');
  apiUrl.searchParams.set('serviceKey', env.AIR_API_KEY || env.PUBLIC_DATA_API_KEY);
  apiUrl.searchParams.set('returnType', 'json');
  apiUrl.searchParams.set('numOfRows', '100');
  apiUrl.searchParams.set('pageNo', '1');
  apiUrl.searchParams.set('sidoName', sidoName);
  apiUrl.searchParams.set('ver', '1.0');

  try {
    const resp = await fetch(apiUrl.toString());
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
