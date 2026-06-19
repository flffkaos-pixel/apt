export async function onRequest(context) {
  try {
    const env = context.env || {};
    const url = new URL(context.request.url);
    const lawdCd = url.searchParams.get('lawdCd');
    const dealYmd = url.searchParams.get('dealYmd');

    const hasKey = !!env.PUBLIC_DATA_API_KEY;
    const keyLen = (env.PUBLIC_DATA_API_KEY || '').length;
    const envKeys = Object.keys(env);

    if (!lawdCd || !dealYmd) {
      return new Response(JSON.stringify({ error: 'params missing', hasKey, keyLen, envKeys }), {
        status: 400, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    const apiUrl = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade');
    apiUrl.searchParams.set('serviceKey', env.PUBLIC_DATA_API_KEY);
    apiUrl.searchParams.set('LAWD_CD', lawdCd);
    apiUrl.searchParams.set('DEAL_YMD', dealYmd);

    const resp = await fetch(apiUrl.toString(), { signal: AbortSignal.timeout(10000) });
    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { parseError: e.message, raw: text.substring(0, 300) }; }

    return new Response(JSON.stringify({ status: resp.status, hasKey, keyLen, data: json }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ fatal: err.message, stack: err.stack }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  }
}
