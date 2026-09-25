// 지역별 SEO 랜딩 페이지: /area/{lawdCd} — "강남구 아파트 실거래가" 롱테일 검색 유입용
const SGG = '11110:종로구,11140:중구,11170:용산구,11200:성동구,11215:광진구,11230:동대문구,11260:중랑구,11290:성북구,11305:강북구,11320:도봉구,11350:노원구,11380:은평구,11410:서대문구,11440:마포구,11470:양천구,11500:강서구,11530:구로구,11545:금천구,11560:영등포구,11590:동작구,11620:관악구,11650:서초구,11680:강남구,11710:송파구,11740:강동구,26110:중구,26140:서구,26170:동구,26200:영도구,26230:부산진구,26260:동래구,26290:남구,26320:북구,26350:해운대구,26380:사하구,26410:금정구,26440:강서구,26470:연제구,26500:수영구,26530:사상구,26710:기장군,27110:중구,27140:동구,27170:서구,27200:남구,27230:북구,27260:수성구,27290:달서구,27710:달성군,28110:중구,28140:동구,28170:미추홀구,28200:연수구,28230:남동구,28237:부평구,28245:계양구,28260:서구,28710:강화군,28720:옹진군,29110:동구,29140:서구,29155:남구,29170:북구,29200:광산구,30110:동구,30140:중구,30170:서구,30200:유성구,30230:대덕구,31110:중구,31140:남구,31170:동구,31200:북구,31710:울주군,36110:세종특별자치시,41111:수원시 장안구,41113:수원시 권선구,41115:수원시 팔달구,41117:수원시 영통구,41131:성남시 수정구,41133:성남시 중원구,41135:성남시 분당구,41151:의정부시,41171:안양시 만안구,41173:안양시 동안구,41192:부천시,41210:광명시,41220:평택시,41250:동두천시,41271:안산시 상록구,41273:안산시 단원구,41281:고양시 덕양구,41285:고양시 일산동구,41287:고양시 일산서구,41290:과천시,41310:구리시,41320:남양주시,41350:오산시,41360:시흥시,41370:군포시,41380:의왕시,41390:하남시,41410:용인시 처인구,41413:용인시 기흥구,41415:용인시 수지구,41430:파주시,41450:이천시,41460:안성시,41470:김포시,41480:화성시,41490:광주시,41500:양주시,41550:포천시,41570:여주시,41800:연천군,41820:가평군,41830:양평군,42110:춘천시,42130:원주시,42150:강릉시,42170:동해시,42190:태백시,42210:속초시,42230:삼척시,42720:홍천군,42730:횡성군,42750:영월군,42760:평창군,42770:정선군,42780:철원군,42790:화천군,42800:양구군,42810:인제군,42820:고성군,42830:양양군,43111:청주시 상당구,43112:청주시 서원구,43113:청주시 흥덕구,43114:청주시 청원구,43130:충주시,43150:제천시,43720:보은군,43730:옥천군,43740:영동군,43750:증평군,43760:진천군,43770:괴산군,43780:음성군,43800:단양군,44131:천안시 동남구,44133:천안시 서북구,44150:공주시,44180:보령시,44200:아산시,44210:서산시,44230:논산시,44250:계룡시,44270:당진시,44710:금산군,44760:부여군,44770:서천군,44790:청양군,44800:홍성군,44810:예산군,44825:태안군,45111:전주시 완산구,45113:전주시 덕진구,45130:군산시,45140:익산시,45180:정읍시,45190:남원시,45210:김제시,45710:완주군,45720:진안군,45730:무주군,45740:장수군,45750:임실군,45770:순창군,45790:고창군,45800:부안군,46110:목포시,46130:여수시,46150:순천시,46170:나주시,46230:광양시,46710:담양군,46720:곡성군,46730:구례군,46770:고흥군,46780:보성군,46790:화순군,46800:장흥군,46810:강진군,46820:해남군,46830:영암군,46840:무안군,46860:함평군,46870:영광군,46880:장성군,46890:완도군,46900:진도군,46910:신안군,47111:포항시 남구,47113:포항시 북구,47130:경주시,47150:김천시,47170:안동시,47190:구미시,47210:영주시,47230:영천시,47250:상주시,47280:문경시,47290:경산시,47730:군위군,47750:의성군,47760:청송군,47770:영양군,47780:영덕군,47820:청도군,47830:고령군,47840:성주군,47850:칠곡군,47900:예천군,47920:봉화군,47930:울진군,47940:울릉군,48121:창원시 의창구,48123:창원시 성산구,48125:창원시 마산합포구,48127:창원시 마산회원구,48129:창원시 진해구,48170:진주시,48220:통영시,48240:사천시,48250:김해시,48270:밀양시,48310:거제시,48330:양산시,48720:의령군,48730:함안군,48740:창녕군,48820:고성군,48840:남해군,48850:하동군,48860:산청군,48870:함양군,48880:거창군,48890:합천군,50110:제주시,50130:서귀포시';
const SIDO_MAP = { '11':'서울','26':'부산','27':'대구','28':'인천','29':'광주','30':'대전','31':'울산','36':'세종','41':'경기','42':'강원','43':'충북','44':'충남','45':'전북','46':'전남','47':'경북','48':'경남','50':'제주' };

function sggName(code) {
  for (const pair of SGG.split(',')) {
    const [c, ...rest] = pair.split(':');
    if (c === code) return rest.join(':');
  }
  return null;
}

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

function esc(s) {
  var AMP = String.fromCharCode(38); // ponytail: 엔티티 문자열을 런타임 조합 — &
  return String(s || '').replace(/[&<>"]/g, function (c) {
    if (c === '"') return AMP + 'quot;';
    if (c === '<') return AMP + 'lt;';
    if (c === '>') return AMP + 'gt;';
    return AMP + 'amp;';
  });
}

async function fetchMonth(env, lawdCd, ym) {
  try {
    const url = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?serviceKey=' + encodeURIComponent(env.PUBLIC_DATA_API_KEY) + '&LAWD_CD=' + lawdCd + '&DEAL_YMD=' + ym + '&numOfRows=100';
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await resp.text();
    if (!text.includes('<item>')) return [];
    return xmlToItems(text);
  } catch (e) { return []; }
}

export async function onRequest(context) {
  const code = context.params.code;
  const name = sggName(code);
  if (!name) return new Response('Not Found', { status: 404 });

  const env = context.env || {};
  const sido = SIDO_MAP[code.substring(0, 2)] || '';
  const fullName = name === '세종특별자치시' ? name : sido + ' ' + name;

  // 최근 3개월 중 데이터 있는 최신 월 탐색
  const now = new Date();
  let items = [], usedYm = '';
  for (let back = 0; back < 3; back++) {
    let d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const ym = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');
    items = await fetchMonth(env, code, ym);
    if (items.length) { usedYm = ym; break; }
  }

  const yLabel = usedYm ? usedYm.slice(0, 4) + '년 ' + parseInt(usedYm.slice(4), 10) + '월' : '';
  const prices = items.map(t => parseInt((t.dealAmount || '0').replace(/,/g, ''), 10)).filter(p => p > 0);
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const stats = prices.length ? { count: items.length, avg, max: Math.max(...prices), min: Math.min(...prices) } : null;
  const recent = items.slice(0, 10);

  const rows = recent.map(t => '<tr><td><b>' + esc(t.aptNm || '-') + '</b><small>' + esc(t.umdNm || '') + '</small></td><td>' + esc(t.excluUseAr || '-') + '㎡</td><td>' + esc(t.floor || '-') + '층</td><td><b>' + esc(t.dealAmount || '-') + '만원</b></td><td>' + esc(t.dealYear || '') + '.' + esc(t.dealMonth || '') + '.' + esc(t.dealDay || '') + '</td></tr>').join('');

  const desc = stats
    ? fullName + ' 아파트 실거래가 ' + yLabel + ' — 총 ' + stats.count + '건, 평균 ' + stats.avg.toLocaleString() + '만원, 최고 ' + stats.max.toLocaleString() + '만원. 국토교통부 실거래가 기반.'
    : fullName + ' 아파트 실거래가 조회 — 국토교통부 실거래가 기반 실시간 데이터.';

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: fullName + ' 아파트 실거래가',
    description: desc,
    license: 'https://www.data.go.kr',
    creator: { '@type': 'Organization', name: 'AptScouter' },
    temporalCoverage: usedYm || undefined
  });

  const html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + esc(fullName) + ' 아파트 실거래가 ' + (yLabel ? '· ' + yLabel + ' 최신' : '조회') + ' | AptScouter</title>'
    + '<meta name="description" content="' + esc(desc) + '">'
    + '<link rel="canonical" href="https://aptscouter.pages.dev/area/' + code + '">'
    + '<meta property="og:type" content="website"><meta property="og:title" content="' + esc(fullName) + ' 아파트 실거래가 | AptScouter">'
    + '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="https://aptscouter.pages.dev/area/' + code + '">'
    + '<script type="application/ld+json">' + jsonld.replace(/</g, '\\u003c') + '</script>'
    + '<style>body{font-family:-apple-system,system-ui,"Malgun Gothic",sans-serif;margin:0;color:#1e293b;line-height:1.6}'
    + 'header{background:#0b1e5c;color:#fff;padding:14px 20px}header a{color:#fff;text-decoration:none;font-weight:700;font-size:1.1rem}'
    + '.wrap{max-width:820px;margin:0 auto;padding:24px 20px}'
    + 'h1{font-size:1.6rem;margin:0 0 6px}h2{font-size:1.15rem;margin:28px 0 10px}'
    + '.stats{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.stat{flex:1;min-width:150px;background:#f1f5f9;border-radius:10px;padding:14px}'
    + '.stat small{display:block;color:#64748b}.stat b{font-size:1.3rem}'
    + 'table{width:100%;border-collapse:collapse;font-size:0.9rem}td,th{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}'
    + 'td small{color:#64748b;display:block}th{color:#64748b;font-weight:600;font-size:0.8rem}'
    + '.cta{display:block;margin:26px 0;padding:16px;background:#1e40af;color:#fff;text-align:center;border-radius:12px;text-decoration:none;font-weight:700}'
    + '</style></head><body>'
    + '<header><a href="/"> AptScouter</a></header>'
    + '<div class="wrap">'
    + '<h1>' + esc(fullName) + ' 아파트 실거래가' + (yLabel ? ' <span style="font-size:0.9rem;color:#64748b;font-weight:400">' + yLabel + '</span>' : '') + '</h1>'
    + '<p style="color:#64748b">국토교통부 실거래가 기반 · 허위매물 없는 실제 거래 데이터</p>'
    + (stats
      ? '<div class="stats">'
        + '<div class="stat"><small>거래 수</small><b>' + stats.count + '건</b></div>'
        + '<div class="stat"><small>평균 거래가</small><b>' + stats.avg.toLocaleString() + '만원</b></div>'
        + '<div class="stat"><small>최고가</small><b>' + stats.max.toLocaleString() + '만원</b></div>'
        + '<div class="stat"><small>최저가</small><b>' + stats.min.toLocaleString() + '만원</b></div>'
        + '</div>'
      : '<p>현재 조회 가능한 최근 거래 데이터가 없습니다. 아래 버튼으로 직접 조회해보세요.</p>')
    + (recent.length ? '<h2>최근 실거래 (' + yLabel + ')</h2><table><tr><th>아파트</th><th>면적</th><th>층</th><th>거래가</th><th>거래일</th></tr>' + rows + '</table>' : '')
    + '<a class="cta" href="/app.html">' + esc(fullName) + ' 전체 실거래가 무료 조회하기 →</a>'
    + '<p style="font-size:0.8rem;color:#94a3b8">매매·전월세, 단독·연립·오피스텔 전체 조회는 AptScouter에서 무료로 이용할 수 있습니다. (무료 1회/일)</p>'
    + '</div></body></html>';

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
