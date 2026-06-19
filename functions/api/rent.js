function xmlToItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const obj = {};
    const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g;
    let f;
    while ((f = fieldRegex.exec(m[1])) !== null) obj[f[1]] = f[2].trim();
    items.push(obj);
  }
  return items;
}

function xmlToJson(xml) {
  const getTag = (tag) => { const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)); return m ? m[1].trim() : ''; };
  return { response: { header: { resultCode: getTag('resultCode'), resultMsg: getTag('resultMsg') }, body: { items: { item: xmlToItems(xml) } } } };
}

export async function onRequest(context) {
  try {
    const env = context.env || {};
    const url = new URL(context.request.url);
    const lawdCd = url.searchParams.get('lawdCd');
    const dealYmd = url.searchParams.get('dealYmd');

    if (!lawdCd || !dealYmd) {
      return new Response(JSON.stringify({ error: 'lawdCd와 dealYmd는 필수입니다.' }), {
        status: 400, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    const apiUrl = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptRent');
    apiUrl.searchParams.set('serviceKey', env.PUBLIC_DATA_API_KEY);
    apiUrl.searchParams.set('LAWD_CD', lawdCd);
    apiUrl.searchParams.set('DEAL_YMD', dealYmd);

    const resp = await fetch(apiUrl.toString(), { signal: AbortSignal.timeout(10000) });
    const text = await resp.text();

    return new Response(text.trim().startsWith('<') ? JSON.stringify(xmlToJson(text)) : text, {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
}
