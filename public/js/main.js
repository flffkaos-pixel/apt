// 법정동코드 (시도 → 시군구 → 읍면동 캐싱)
const regionCache = {};
let selectedSido = '', selectedSgg = '', selectedDong = '';
let tradeChart = null;
let map = null;
let mapMarkers = [];
let allTrades = [];
let chartAptCache = {};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
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
  document.getElementById('dongSelect').addEventListener('change', onDongChange);
  document.getElementById('searchBtn').addEventListener('click', searchByRegion);
  document.getElementById('keywordSearchBtn').addEventListener('click', searchByKeyword);
  document.getElementById('keywordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchByKeyword();
  });
  document.getElementById('chartAptSelect').addEventListener('change', updateChart);
  document.getElementById('showRent').addEventListener('change', updateChart);
}

// ---- 지역 선택 ----
async function loadSido() {
  try {
    const resp = await fetch('/api/codes?regExp=.');
    const items = await resp.json();
    const sidoMap = {};
    for (const item of items) {
      const code = item.code.substring(0, 2);
      const name = item.name.split(' ')[0];
      sidoMap[code] = name;
    }
    const sel = document.getElementById('sidoSelect');
    sel.innerHTML = '<option value="">시/도 선택</option>';
    for (const [code, name] of Object.entries(sidoMap).sort()) {
      const opt = document.createElement('option');
      opt.value = code; opt.textContent = name;
      sel.appendChild(opt);
    }
  } catch (e) {
    // fallback: 직접 입력
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
  const sido = document.getElementById('sidoSelect').value;
  selectedSido = sido;
  resetSelect('sggSelect', '시/군/구 선택');
  resetSelect('dongSelect', '읍/면/동 선택');
  document.getElementById('searchBtn').disabled = true;
  if (!sido) return;
  await loadSgg(sido);
}

async function loadSgg(sido) {
  try {
    const resp = await fetch(`/api/codes?regExp=^${sido}`);
    const items = await resp.json();
    const sggSet = new Set();
    const sel = document.getElementById('sggSelect');
    sel.innerHTML = '<option value="">시/군/구 선택</option>';
    sel.disabled = false;
    for (const item of items) {
      const sggCode = item.code.substring(0, 5);
      const parts = item.name.split(' ');
      const sggName = parts.length > 1 ? parts[1] : '';
      if (sggName && !sggSet.has(sggCode)) {
        sggSet.add(sggCode);
        const opt = document.createElement('option');
        opt.value = sggCode; opt.textContent = sggName;
        sel.appendChild(opt);
      }
    }
  } catch (e) {
    document.getElementById('sggSelect').disabled = false;
  }
}

function onSggChange() {
  const sgg = document.getElementById('sggSelect').value;
  selectedSgg = sgg;
  resetSelect('dongSelect', '읍/면/동 선택');
  document.getElementById('searchBtn').disabled = !sgg;
  if (!sgg) return;
}

function onDongChange() {
  selectedDong = document.getElementById('dongSelect').value;
}

function resetSelect(id, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  sel.disabled = true;
}

// ---- 검색 ----
async function searchByRegion() {
  const lawdCd = selectedSgg;
  const year = document.getElementById('yearSelect').value;
  const month = document.getElementById('monthSelect').value;
  if (!lawdCd) return;
  await fetchTrades(lawdCd, `${year}${month}`);
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
    // 키워드 검색: 여러 지역 돌면서 검색
    if (keyword) {
      allTrades = await keywordSearch(keyword);
    } else {
      allTrades = await regionSearch(lawdCd, dealYmd);
    }

    if (allTrades.length === 0) {
      alert('검색 결과가 없습니다.');
      loading.classList.add('hidden');
      return;
    }

    renderResults(allTrades);
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('statsSection').classList.remove('hidden');
  } catch (e) {
    console.error(e);
    alert('데이터 조회 중 오류가 발생했습니다. API 키를 확인해주세요.');
  }
  loading.classList.add('hidden');
}

async function regionSearch(lawdCd, dealYmd) {
  const trades = [];

  // 매매
  try {
    const resp = await fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${dealYmd}`);
    const data = await resp.json();
    const items = data?.response?.body?.items?.item;
    if (items) {
      const arr = Array.isArray(items) ? items : [items];
      trades.push(...arr.map(t => ({ ...t, type: '매매' })));
    }
  } catch (e) { console.warn('Trade fetch error:', e); }

  // 전월세
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
  // 공공데이터포털은 키워드 검색 직접 지원 안 함 → 여러 구를 시도
  // 간략화: 서울 주요 구 5곳 먼저 검색
  const targetGu = [
    { name: '강남구', code: '11680' },
    { name: '서초구', code: '11650' },
    { name: '송파구', code: '11710' },
    { name: '마포구', code: '11440' },
    { name: '용산구', code: '11170' },
  ];
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const all = [];
  for (const gu of targetGu) {
    const trades = await regionSearch(gu.code, ym);
    all.push(...trades.filter(t =>
      t.aptNm && t.aptNm.includes(keyword)
    ));
    if (all.length >= 50) break;
  }
  return all;
}

// ---- 결과 렌더링 ----
function renderResults(trades) {
  renderMap(trades);
  renderTable(trades);
  renderStats(trades);
  populateChartSelect(trades);
  updateChart();
  fetchSurroundingInfo(trades);
}

// 지도
function renderMap(trades) {
  if (!map) {
    map = L.map('map').setView([37.5665, 126.978], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
  }

  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  const bounds = [];
  const seen = new Set();

  for (const t of trades) {
    const key = t.aptNm;
    if (seen.has(key)) continue;
    seen.add(key);

    // 좌표가 없으면 geocode 시도 (간략화: 지번으로 검색)
    if (!t.lat || !t.lng) {
      geocodeAddress(t);
    }

    if (t.lat && t.lng) {
      const price = parseInt(t.dealAmount?.replace(',','') || '0');
      const color = price > 100000 ? '#ef4444' : price > 50000 ? '#f59e0b' : '#10b981';
      const marker = L.circleMarker([t.lat, t.lng], {
        radius: 10, fillColor: color, color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.8
      }).addTo(map);
      marker.bindPopup(`<b>${t.aptNm}</b><br/>💰 ${t.dealAmount}만원<br/>📐 ${t.excluUseAr}㎡<br/>📅 ${t.dealYear}.${t.dealMonth}`);
      mapMarkers.push(marker);
      bounds.push([t.lat, t.lng]);
    }
  }

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

async function geocodeAddress(t) {
  const addr = `${t.umdNm || ''} ${t.aptNm || ''}`;
  if (!addr) return;
  try {
    const resp = await fetch(`/api/geocode?query=${encodeURIComponent(addr)}`);
    const data = await resp.json();
    if (data.documents?.length > 0) {
      t.lat = parseFloat(data.documents[0].y);
      t.lng = parseFloat(data.documents[0].x);
    }
  } catch (e) {}
}

// 테이블
function renderTable(trades) {
  const tbody = document.getElementById('tradeTableBody');
  tbody.innerHTML = '';
  for (const t of trades.slice(0, 100)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.aptNm || '-'}</strong></td>
      <td>💰 ${t.dealAmount || t.rentGtn || '-'}만원</td>
      <td>${t.excluUseAr || '-'}</td>
      <td>${t.floor || '-'}층</td>
      <td>${t.dealYear || ''}.${t.dealMonth || ''}.${t.dealDay || ''}</td>
    `;
    tbody.appendChild(tr);
  }
}

// 통계
function renderStats(trades) {
  const prices = trades
    .filter(t => t.dealAmount && t.type === '매매')
    .map(t => parseInt(t.dealAmount.replace(',', '')))
    .filter(p => !isNaN(p));

  document.getElementById('statCount').textContent = trades.length.toLocaleString();

  if (prices.length > 0) {
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    document.getElementById('statMax').textContent = `${max.toLocaleString()}만원`;
    document.getElementById('statMin').textContent = `${min.toLocaleString()}만원`;
    document.getElementById('statAvg').textContent = `${avg.toLocaleString()}만원`;
  }
}

// 차트
function populateChartSelect(trades) {
  chartAptCache = {};
  const aptNames = [...new Set(trades.map(t => t.aptNm).filter(Boolean))];
  const sel = document.getElementById('chartAptSelect');
  sel.innerHTML = '<option value="">전체 아파트</option>';
  for (const name of aptNames.sort()) {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  }
}

async function updateChart() {
  const selApt = document.getElementById('chartAptSelect').value;
  const showRent = document.getElementById('showRent').checked;

  let filtered = allTrades;
  if (selApt) filtered = filtered.filter(t => t.aptNm === selApt);
  if (!showRent) filtered = filtered.filter(t => t.type === '매매');

  const prices = filtered
    .filter(t => t.dealAmount)
    .map(t => ({
      date: `${t.dealYear}-${String(t.dealMonth).padStart(2, '0')}`,
      price: parseInt(t.dealAmount.replace(',', '')),
      apt: t.aptNm
    }))
    .filter(p => !isNaN(p.price));

  // 날짜순 정렬
  prices.sort((a, b) => a.date.localeCompare(b.date));

  // 월별 평균
  const monthly = {};
  for (const p of prices) {
    if (!monthly[p.date]) monthly[p.date] = [];
    monthly[p.date].push(p.price);
  }

  const labels = Object.keys(monthly).sort();
  const data = labels.map(d => {
    const vals = monthly[d];
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  });

  if (tradeChart) tradeChart.destroy();

  const ctx = document.getElementById('priceChart').getContext('2d');
  tradeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: selApt || '전체 평균 실거래가',
        data,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y.toLocaleString()}만원`
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: v => `${(v / 10000).toFixed(1)}억` },
          beginAtZero: false
        }
      }
    }
  });
}

// 주변 정보
async function fetchSurroundingInfo(trades) {
  const first = trades[0];
  if (!first) return;

  // 좌표 확보
  if (!first.lat || !first.lng) {
    const addr = `${first.umdNm || ''} ${first.aptNm || ''}`;
    if (addr) {
      try {
        const resp = await fetch(`/api/geocode?query=${encodeURIComponent(addr)}`);
        const data = await resp.json();
        if (data.documents?.length > 0) {
          first.lat = parseFloat(data.documents[0].y);
          first.lng = parseFloat(data.documents[0].x);
        }
      } catch (e) {}
    }
  }

  if (!first.lat || !first.lng) return;

  const x = first.lng, y = first.lat;

  // 미세먼지
  fetchAirQuality();
  fetchNearbyPlaces(x, y);
}

async function fetchAirQuality() {
  try {
    const resp = await fetch('/api/air?sidoName=서울');
    const data = await resp.json();
    const items = data?.response?.body?.items;
    if (items?.length > 0) {
      const pm10 = items[0].pm10Value || '-';
      const pm25 = items[0].pm25Value || '-';
      document.getElementById('airQuality').innerHTML =
        `미세먼지 <strong>${pm10}</strong>㎍/㎥ · 초미세먼지 <strong>${pm25}</strong>㎍/㎥`;
    }
  } catch (e) {
    document.getElementById('airQuality').textContent = '정보 없음';
  }
}

async function fetchNearbyPlaces(x, y) {
  try {
    const subwayResp = await fetch(`/api/places?query=지하철역&x=${x}&y=${y}&radius=500`);
    const subwayData = await subwayResp.json();
    const subways = subwayData.documents || [];
    document.getElementById('subwayInfo').textContent =
      subways.length > 0
        ? `${subways.slice(0, 3).map(s => s.place_name).join(', ')}`
        : '반경 500m 내 없음';

    const schoolResp = await fetch(`/api/places?query=학교&x=${x}&y=${y}&radius=500`);
    const schoolData = await schoolResp.json();
    const schools = schoolData.documents || [];
    document.getElementById('schoolInfo').textContent =
      schools.length > 0
        ? `${schools.slice(0, 3).map(s => s.place_name).join(', ')}`
        : '반경 500m 내 없음';

    const convResp = await fetch(`/api/places?query=편의점&x=${x}&y=${y}&radius=500`);
    const convData = await convResp.json();
    const convs = convData.documents || [];
    document.getElementById('convenienceInfo').textContent =
      convs.length > 0
        ? `${convs.slice(0, 3).map(s => s.place_name).join(', ')}`
        : '반경 500m 내 없음';
  } catch (e) {
    console.warn('Places fetch error:', e);
  }
}
