export async function onRequest(context) {
  try {
    const env = context.env || {};
    const url = new URL(context.request.url);
    const regExp = url.searchParams.get('regExp') || '^';
    const resp = await fetch('https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?serviceKey=' + env.PUBLIC_DATA_API_KEY + '&LAWD_CD=11110&DEAL_YMD=202601&numOfRows=1');
    const text = await resp.text();
    // Return empty codes for fallback — inline __SGG already handles common ones
    const items = [];
    return new Response(JSON.stringify(items), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify([]), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
}
