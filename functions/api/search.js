const API_TYPES = {
  'apt':       { base: 'RTMSDataSvcAptTrade',   label: '아파트 매매',     rent: false },
  'apt-rent':  { base: 'RTMSDataSvcAptRent',     label: '아파트 전월세',   rent: true },
  'house':     { base: 'RTMSDataSvcSHTrade',     label: '단독/다가구 매매', rent: false },
  'house-rent':{ base: 'RTMSDataSvcSHRent',      label: '단독/다가구 전월세', rent: true },
  'townhouse': { base: 'RTMSDataSvcRHTrade',     label: '연립다세대 매매',   rent: false },
  'townhouse-rent':{ base: 'RTMSDataSvcRHRent',  label: '연립다세대 전월세', rent: true },
  'officetel': { base: 'RTMSDataSvcOffiTrade',   label: '오피스텔 매매',    rent: false },
  'officetel-rent':{ base: 'RTMSDataSvcOffiRent',label: '오피스텔 전월세',   rent: true }
};

const SIDO_MAP = { '11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원도','43':'충청북도','44':'충청남도','45':'전라북도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도' };

function xmlToItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const obj = {};
    const fieldRegex = /<([^>]+)>([^<]*)<\/\1>/g;
    let f;
    while ((f = fieldRegex.exec(m[1])) !== null) obj[f[1]] = f[2].trim();
    items.push(obj);
  }
  return items;
}

function xmlToJson(xml) {
  const getTag = (tag) => { const m = xml.match(new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>')); return m ? m[1].trim() : ''; };
  return { response: { header: { resultCode: getTag('resultCode'), resultMsg: getTag('resultMsg') }, body: { items: { item: xmlToItems(xml) } } } };
}

async function geocodeItem(item, env, sidoName) {
  const addr = [sidoName, item.umdNm, (item.aptNm || item.bjdongNm || ''), item.jibun].filter(Boolean).join(' ');
  if (!addr || addr.length < 4) return;
  try {
    const resp = await fetch('https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(addr), {
      headers: { Authorization: 'KakaoAK ' + (env.KAKAO_REST_API_KEY || env.KAKAO_REST_KEY) }
    });
    const data = await resp.json();
    if (data.documents?.length > 0) { item.lat = parseFloat(data.documents[0].y); item.lng = parseFloat(data.documents[0].x); }
  } catch (e) {}
}

export async function onRequest(context) {
  try {
    const env = context.env || {};
    const url = new URL(context.request.url);
    const lawdCd = url.searchParams.get('lawdCd');
    const dealYmd = url.searchParams.get('dealYmd');
    const types = (url.searchParams.get('types') || 'apt').split(',');
    const keyword = url.searchParams.get('keyword');

    if (!lawdCd || !dealYmd) {
      if (!keyword) return new Response(JSON.stringify({ error: 'lawdCd와 dealYmd 또는 keyword 필수' }), { status: 400, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    }

    let all = [];
    if (keyword) {
      // keyword search via local geocoding → region search
      const georesp = await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(keyword), {
        headers: { Authorization: 'KakaoAK ' + (env.KAKAO_REST_API_KEY || env.KAKAO_REST_KEY) }
      });
      const geodata = await georesp.json();
      return new Response(JSON.stringify({ items: [], keyword, geoResults: geodata.documents || [] }), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    const results = await Promise.all(types.map(async (type) => {
      const cfg = API_TYPES[type.trim()];
      if (!cfg) return [];
      try {
        const apiUrl = new URL('https://apis.data.go.kr/1613000/' + cfg.base + '/get' + cfg.base);
        apiUrl.searchParams.set('serviceKey', env.PUBLIC_DATA_API_KEY);
        apiUrl.searchParams.set('LAWD_CD', lawdCd);
        apiUrl.searchParams.set('DEAL_YMD', dealYmd);
        apiUrl.searchParams.set('numOfRows', '100');
        const resp = await fetch(apiUrl.toString(), { signal: AbortSignal.timeout(10000) });
        const text = await resp.text();
        const json = text.trim().startsWith('<') ? xmlToJson(text) : JSON.parse(text);
        const items = json?.response?.body?.items?.item;
        if (!items) return [];
        const arr = Array.isArray(items) ? items : [items];
        return arr.map(t => {
          if (cfg.rent && t.deposit !== undefined) { t.rentGtn = t.deposit; t.rentFee = t.monthlyRent || ''; }
          if (!t.excluUseAr && t.area) t.excluUseAr = t.area;
          if (!t.aptNm) t.aptNm = t.offiNm || t.bjdongNm || '';
          return { ...t, _type: type, type: cfg.rent ? '전월세' : '매매' };
        });
      } catch (e) { return []; }
    }));

    all = results.flat();
    const skipGeocode = url.searchParams.get('skipGeocode') === '1';
    if (!skipGeocode) {
      let groups = [];
      const seen = new Map();
      for (const item of all) {
        const key = (item.umdNm || '') + '|' + (item.aptNm || item.bjdongNm || '') + '|' + item._type;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(item);
      }
      groups = [...seen.values()];
      const sidoName = SIDO_MAP[lawdCd.substring(0, 2)] || '';
      await Promise.all(groups.slice(0, 200).map(g => geocodeItem(g[0], env, sidoName)));
      for (const g of groups) { for (const item of g) { item.lat = g[0].lat; item.lng = g[0].lng; } }
    }

    return new Response(JSON.stringify({ items: all, count: all.length }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
}
