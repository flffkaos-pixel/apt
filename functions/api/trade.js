export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lawdCd = url.searchParams.get('lawdCd');
  const dealYmd = url.searchParams.get('dealYmd');
  const pageNo = url.searchParams.get('pageNo') || '1';
  const numOfRows = url.searchParams.get('numOfRows') || '100';

  if (!lawdCd || !dealYmd) {
    return new Response(JSON.stringify({ error: 'lawdCd와 dealYmd는 필수입니다.' }), {
      status: 400, headers: { 'content-type': 'application/json' }
    });
  }

  const apiUrl = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade');
  apiUrl.searchParams.set('serviceKey', env.PUBLIC_DATA_API_KEY);
  apiUrl.searchParams.set('LAWD_CD', lawdCd);
  apiUrl.searchParams.set('DEAL_YMD', dealYmd);
  apiUrl.searchParams.set('pageNo', pageNo);
  apiUrl.searchParams.set('numOfRows', numOfRows);

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
