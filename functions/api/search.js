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
const JSON_H = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
const FREE_DAILY_LIMIT = 1;

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

// 세션 쿠키 검증 → 이메일 (me.js와 동일 로직)
async function cookieEmail(request, env) {
  try {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;
    const parts = match[1].split('.');
    if (parts.length !== 2) return null;
    const payload = JSON.parse(base64Decode(parts[0]));
    const secret = (env.JWT_SECRET || 'fallback-secret-key-12345').padEnd(32, 'X').slice(0, 32);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, hexToBytes(parts[1]), encoder.encode(JSON.stringify(payload)));
    if (!valid || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return (payload.email || '').toLowerCase() || null;
  } catch (e) { return null; }
}

// freemium 게이트: 프리미엄 무제한, 무료 1회/일. true 반환 or 402 Response
// ponytail: 미로그인은 IP 기준 카운트 — CGNAT 공유 IP 과금 오류 가능, 트래픽 늘면 계정 기반으로 전환
async function checkGate(request, env) {
  const kv = env.PREMIUM_KV;
  if (!kv) return true; // KV 미바인딩 시 오픈 (수익화하려면 바인딩 필수)
  const email = await cookieEmail(request, env);
  if (email && await kv.get('premium:' + email)) return true;
  const who = email || request.headers.get('CF-Connecting-IP') || 'anon';
  const today = new Date().toISOString().slice(0, 10);
  const key = 'free:' + who + ':' + today;
  const n = parseInt((await kv.get(key)) || '0', 10);
  if (n >= FREE_DAILY_LIMIT) return new Response(JSON.stringify({ error: 'FREE_LIMIT', code: 'LIMIT' }), { status: 402, headers: JSON_H });
  await kv.put(key, String(n + 1), { expirationTtl: 86400 });
  return true;
}

export async function onRequest(context) {
  try {
    const env = context.env || {};
    const url = new URL(context.request.url);
    const lawdCd = url.searchParams.get('lawdCd');
    const dealYmd = url.searchParams.get('dealYmd');
    const types = (url.searchParams.get('types') || 'apt').split(',');
    const keyword = url.searchParams.get('keyword');
    const dongListMode = url.searchParams.get('dongList') === '1';

    if (!dongListMode) {
      const gate = await checkGate(context.request, env);
      if (gate !== true) return gate;
    }

    if (!lawdCd || !dealYmd) {
      if (!keyword) return new Response(JSON.stringify({ error: 'lawdCd와 dealYmd 또는 keyword 필수' }), { status: 400, headers: JSON_H });
    }

    let all = [];
    if (keyword) {
      const georesp = await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(keyword), {
        headers: { Authorization: 'KakaoAK ' + (env.KAKAO_REST_API_KEY || env.KAKAO_REST_KEY) }
      });
      const geodata = await georesp.json();
      return new Response(JSON.stringify({ items: [], keyword, geoResults: geodata.documents || [] }), { headers: JSON_H });
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

    // 동 목록 전용 모드: 게이팅 제외 대신 umdNm만 반환 (유료 데이터 유출 없음)
    if (dongListMode) {
      const seen = new Set(); const dongs = [];
      for (const t of all) { if (t.umdNm && !seen.has(t.umdNm)) { seen.add(t.umdNm); dongs.push(t.umdNm); } }
      return new Response(JSON.stringify({ items: dongs.map(u => ({ umdNm: u })) }), { headers: JSON_H });
    }

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

    return new Response(JSON.stringify({ items: all, count: all.length }), { headers: JSON_H });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_H });
  }
}

function base64Decode(str) {
  var binary = atob(str);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
  return new TextDecoder().decode(bytes);
}
function hexToBytes(hex) {
  var bytes = new Uint8Array(hex.length / 2);
  for (var i = 0; i < hex.length; i += 2) { bytes[i / 2] = parseInt(hex.substr(i, 2), 16); }
  return bytes;
}
