let selectedSido = '', selectedSgg = '';
let tradeChart = null;
let map = null;
let mapMarkers = [];
let allTrades = [];
let kakaoJsKey = '';

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await (await fetch('/api/config')).json();
  kakaoJsKey = cfg.kakaoJsKey;
  initYearMonth();
  loadSido();
  bindEvents();
});

function initYearMonth() {
  const yearSel = document.getElementById('yearSelect');
  const monthSel = document.getElementById('monthSelect');
  const now = new Date();
  for (let y = now.getFullYear(); y >= 2018; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = `${y}년`;
    yearSel.appendChild(opt);
  }
  yearSel.value = now.getFullYear();
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = String(m).padStart(2, '0');
    opt.textContent = `${m}월`;
    monthSel.appendChild(opt);
  }
  monthSel.value = String(now.getMonth() + 1).padStart(2, '0');
}

function bindEvents() {
  document.getElementById('sidoSelect').addEventListener('change', onSidoChange);
  document.getElementById('sggSelect').addEventListener('change', onSggChange);
  document.getElementById('searchBtn').addEventListener('click', searchByRegion);
  document.getElementById('keywordSearchBtn').addEventListener('click', searchByKeyword);
  document.getElementById('keywordInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchByKeyword(); });
  document.getElementById('chartAptSelect').addEventListener('change', updateChart);
  document.getElementById('showRent').addEventListener('change', updateChart);
}

async function loadSido() {
  try {
    const resp = await fetch('/api/codes?regExp=.');
    const items = await resp.json();
    const sel = document.getElementById('sidoSelect');
    sel.innerHTML = '<option value="">시/도 선택</option>';
    for (const item of items) {
      const opt = document.createElement('option');
      opt.value = item.code.substring(0, 2);
      opt.textContent = item.name.split(' ')[0];
      sel.appendChild(opt);
    }
  } catch (e) {
    const sel = document.getElementById('sidoSelect');
    sel.innerHTML = '<option value="">시/도 선택</option>';
    for (const s of ['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원도','충청북도','충청남도','전라북도','전라남도','경상북도','경상남도','제주특별자치도']) {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    }
  }
}

async function onSidoChange() {
  selectedSido = document.getElementById('sidoSelect').value;
  resetSelect('sggSelect', '시/군/구 선택');
  document.getElementById('searchBtn').disabled = true;
  if (!selectedSido) return;
  try {
    const resp = await fetch(`/api/codes?regExp=^${selectedSido}`);
    const items = await resp.json();
    const sel = document.getElementById('sggSelect');
    sel.innerHTML = '<option value="">시/군/구 선택</option>';
    sel.disabled = false;
    const seen = new Set();
    for (const item of items) {
      const code = item.code.substring(0, 5);
      const name = item.name.split(' ').slice(1).join(' ');
      if (name && !seen.has(code)) { seen.add(code); const opt = document.createElement('option'); opt.value = code; opt.textContent = name; sel.appendChild(opt); }
    }
  } catch (e) { document.getElementById('sggSelect').disabled = false; }
}

function onSggChange() {
  selectedSgg = document.getElementById('sggSelect').value;
  document.getElementById('searchBtn').disabled = !selectedSgg;
}

function resetSelect(id, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  sel.disabled = true;
}

async function searchByRegion() {
  const lawdCd = selectedSgg;
  if (!lawdCd) return;
  const ym = `${document.getElementById('yearSelect').value}${document.getElementById('monthSelect').value}`;
  await fetchTrades(lawdCd, ym);
}

async function searchByKeyword() {
  const keyword = document.getElementById('keywordInput').value.trim();
  if (!keyword) return alert('아파트명을 입력해주세요.');
  await fetchTrades(null, null, keyword);
}

async function fetchTrades(lawdCd, dealYmd, keyword) {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('statsSection').classList.add('hidden');

  try {
    if (keyword) {
      allTrades = await keywordSearch(keyword);
    } else {
      allTrades = await regionSearch(lawdCd, dealYmd);
    }
    if (allTrades.length === 0) { alert('검색 결과가 없습니다.'); loading.classList.add('hidden'); return; }
    renderResults(allTrades);
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('statsSection').classList.remove('hidden');
  } catch (e) {
    console.error(e);
    alert('데이터 조회 중 오류가 발생했습니다.');
  }
  loading.classList.add('hidden');
}

async function regionSearch(lawdCd, dealYmd) {
  const trades = [];
  try {
    const resp = await fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${dealYmd}`);
    const data = await resp.json();
    const items = data?.response?.body?.items?.item;
    if (items) {
      const arr = Array.isArray(items) ? items : [items];
      trades.push(...arr.map(t => ({ ...t, type: '매매' })));
    }
  } catch (e) { console.warn('Trade fetch error:', e); }
  try {
    const resp = await fetch(`/api/rent?lawdCd=${lawdCd}&dealYmd=${dealYmd}`);
    const data = await resp.json();
    const items = data?.response?.body?.items?.item;
    if (items) {
      const arr = Array.isArray(items) ? items : [items];
      trades.push(...arr.map(t => ({ ...t, type: '전월세' })));
    }
  } catch (e) { console.warn('Rent fetch error:', e); }
  return trades;
}

async function keywordSearch(keyword) {
  const targetGu = [
    { name: '강남구', code: '11680' }, { name: '서초구', code: '11650' },
    { name: '송파구', code: '11710' }, { name: '마포구', code: '11440' }, { name: '용산구', code: '11170' },
  ];
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const all = [];
  for (const gu of targetGu) {
    const trades = await regionSearch(gu.code, ym);
    all.push(...trades.filter(t => t.aptNm && t.aptNm.includes(keyword)));
    if (all.length >= 50) break;
  }
  return all;
}

function renderResults(trades) {
  renderTable(trades);
  renderStats(trades);
  populateChartSelect(trades);
  updateChart();
  initMap(trades);
  fetchSurroundingInfo(trades);
}

// ---- Kakao Map ----
async function initMap(trades) {
  if (typeof kakao === 'undefined') {
    await loadKakaoMap();
  }
  const container = document.getElementById('map');
  const center = new kakao.maps.LatLng(37.5665, 126.978);
  if (!map) {
    map = new kakao.maps.Map(container, { center, level: 7 });
  }

  mapMarkers.forEach(m => m.setMap(null));
  mapMarkers = [];

  const bounds = new kakao.maps.LatLngBounds();
  const seen = new Set();
  let hasMarker = false;

  for (const t of trades) {
    if (seen.has(t.aptNm)) continue;
    seen.add(t.aptNm);

    if (!t.lat || !t.lng) {
      await geocodeTrade(t);
    }
    if (t.lat && t.lng) {
      const pos = new kakao.maps.LatLng(t.lat, t.lng);
      const marker = new kakao.maps.Marker({ position: pos, map });
      const price = parseInt(t.dealAmount?.replace(',','') || '0');
      const info = new kakao.maps.InfoWindow({
        content: `<div style="padding:8px;font-size:13px"><b>${t.aptNm}</b><br/>💰 ${t.dealAmount}만원<br/>📐 ${t.excluUseAr}㎡<br/>📅 ${t.dealYear}.${t.dealMonth}</div>`
      });
      kakao.maps.event.addListener(marker, 'click', () => info.open(map, marker));
      mapMarkers.push(marker);
      bounds.extend(pos);
      hasMarker = true;
    }
  }

  if (hasMarker) map.setBounds(bounds);
}

function loadKakaoMap() {
  return new Promise((resolve, reject) => {
    if (!kakaoJsKey) { reject(new Error('Kakao JS key 없음')); return; }
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}&libraries=services,clusterer`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function geocodeTrade(t) {
  if (!window.kakao || !kakao.maps.services) return;
  const addr = `${t.umdNm || ''} ${t.aptNm || ''}`.trim();
  if (!addr) return;
  return new Promise(resolve => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(addr, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        t.lat = parseFloat(result[0].y);
        t.lng = parseFloat(result[0].x);
      }
      resolve();
    });
  });
}

function renderTable(trades) {
  const tbody = document.getElementById('tradeTableBody');
  tbody.innerHTML = '';
  for (const t of trades.slice(0, 100)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${t.aptNm || '-'}</strong></td><td>💰 ${t.dealAmount || t.rentGtn || '-'}만원</td><td>${t.excluUseAr || '-'}</td><td>${t.floor || '-'}층</td><td>${t.dealYear || ''}.${t.dealMonth || ''}.${t.dealDay || ''}</td>`;
    tbody.appendChild(tr);
  }
}

function renderStats(trades) {
  const prices = trades.filter(t => t.dealAmount && t.type === '매매').map(t => parseInt(t.dealAmount.replace(',', ''))).filter(p => !isNaN(p));
  document.getElementById('statCount').textContent = trades.length.toLocaleString();
  if (prices.length > 0) {
    document.getElementById('statMax').textContent = `${Math.max(...prices).toLocaleString()}만원`;
    document.getElementById('statMin').textContent = `${Math.min(...prices).toLocaleString()}만원`;
    document.getElementById('statAvg').textContent = `${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}만원`;
  }
}

function populateChartSelect(trades) {
  const aptNames = [...new Set(trades.map(t => t.aptNm).filter(Boolean))];
  const sel = document.getElementById('chartAptSelect');
  sel.innerHTML = '<option value="">전체 아파트</option>';
  for (const name of aptNames.sort()) { const opt = document.createElement('option'); opt.value = name; opt.textContent = name; sel.appendChild(opt); }
}

async function updateChart() {
  const selApt = document.getElementById('chartAptSelect').value;
  const showRent = document.getElementById('showRent').checked;
  let filtered = allTrades;
  if (selApt) filtered = filtered.filter(t => t.aptNm === selApt);
  if (!showRent) filtered = filtered.filter(t => t.type === '매매');
  const prices = filtered.filter(t => t.dealAmount).map(t => ({ date: `${t.dealYear}-${String(t.dealMonth).padStart(2, '0')}`, price: parseInt(t.dealAmount.replace(',', '')) })).filter(p => !isNaN(p.price));
  prices.sort((a, b) => a.date.localeCompare(b.date));
  const monthly = {};
  for (const p of prices) { if (!monthly[p.date]) monthly[p.date] = []; monthly[p.date].push(p.price); }
  const labels = Object.keys(monthly).sort();
  const data = labels.map(d => Math.round(monthly[d].reduce((a, b) => a + b, 0) / monthly[d].length));
  if (tradeChart) tradeChart.destroy();
  const ctx = document.getElementById('priceChart').getContext('2d');
  tradeChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: selApt || '전체 평균 실거래가', data, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3, pointRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toLocaleString()}만원` } } },
      scales: { y: { ticks: { callback: v => `${(v / 10000).toFixed(1)}억` }, beginAtZero: false } }
    }
  });
}

async function fetchSurroundingInfo(trades) {
  const first = trades[0];
  if (!first) return;
  if (!first.lat || !first.lng) {
    const addr = `${first.umdNm || ''} ${first.aptNm || ''}`.trim();
    if (addr) {
      try {
        const resp = await fetch(`/api/geocode?query=${encodeURIComponent(addr)}`);
        const data = await resp.json();
        if (data.documents?.length > 0) { first.lat = parseFloat(data.documents[0].y); first.lng = parseFloat(data.documents[0].x); }
      } catch (e) {}
    }
  }
  if (!first.lat || !first.lng) return;
  fetchAirQuality();
  fetchNearbyPlaces(first.lng, first.lat);
}

async function fetchAirQuality() {
  try {
    const resp = await fetch('/api/air?sidoName=서울');
    const data = await resp.json();
    const items = data?.response?.body?.items;
    if (items?.length > 0) {
      document.getElementById('airQuality').innerHTML = `미세먼지 <strong>${items[0].pm10Value || '-'}</strong>㎍/㎥ · 초미세먼지 <strong>${items[0].pm25Value || '-'}</strong>㎍/㎥`;
    }
  } catch (e) { document.getElementById('airQuality').textContent = '정보 없음'; }
}

async function fetchNearbyPlaces(x, y) {
  try {
    const subwayResp = await fetch(`/api/places?query=지하철역&x=${x}&y=${y}&radius=500`);
    const subwayData = await subwayResp.json();
    const subways = subwayData.documents || [];
    document.getElementById('subwayInfo').textContent = subways.length > 0 ? subways.slice(0, 3).map(s => s.place_name).join(', ') : '반경 500m 내 없음';
    const schoolResp = await fetch(`/api/places?query=학교&x=${x}&y=${y}&radius=500`);
    const schoolData = await schoolResp.json();
    const schools = schoolData.documents || [];
    document.getElementById('schoolInfo').textContent = schools.length > 0 ? schools.slice(0, 3).map(s => s.place_name).join(', ') : '반경 500m 내 없음';
    const convResp = await fetch(`/api/places?query=편의점&x=${x}&y=${y}&radius=500`);
    const convData = await convResp.json();
    const convs = convData.documents || [];
    document.getElementById('convenienceInfo').textContent = convs.length > 0 ? convs.slice(0, 3).map(s => s.place_name).join(', ') : '반경 500m 내 없음';
  } catch (e) { console.warn('Places fetch error:', e); }
}
