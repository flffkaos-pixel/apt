var currentResults = null;
var priceChart = null;
var DAILY_FREE_LIMIT = 1;

function getUser() {
  return (window._cachedUser || {});
}

function isPremium() {
  var u = getUser();
  return u && u.subscription === 'premium';
}

function getSearchCount() {
  var today = new Date().toISOString().slice(0, 10);
  var data = JSON.parse(localStorage.getItem('searchCount') || '{}');
  if (data.date !== today) { data = { date: today, count: 0 }; }
  return data.count;
}

function incrementSearchCount() {
  var today = new Date().toISOString().slice(0, 10);
  var data = { date: today, count: getSearchCount() + 1 };
  localStorage.setItem('searchCount', JSON.stringify(data));
}

function canSearch() {
  if (isPremium()) return true;
  return getSearchCount() < DAILY_FREE_LIMIT;
}

function showLimitReached() {
  alert('무료 이용자는 하루 ' + DAILY_FREE_LIMIT + '회까지 조회 가능합니다.\n프리미엄 구독 시 무제한 이용 가능합니다.');
  showSubscribeModal();
}

function updatePremiumUI() {
  var premiumOnly = document.querySelectorAll('.premium-only');
  premiumOnly.forEach(function (el) { el.style.display = isPremium() ? '' : 'none'; });
  var freeOnly = document.querySelectorAll('.free-only');
  freeOnly.forEach(function (el) { el.style.display = isPremium() ? 'none' : ''; });
  var limitMsg = document.getElementById('searchLimitMsg');
  if (limitMsg) limitMsg.textContent = isPremium() ? '' : '무료: 일 ' + DAILY_FREE_LIMIT + '회 / 오늘 ' + getSearchCount() + '회 사용';
}

document.addEventListener('DOMContentLoaded', function () {
  checkAuth();
  initSearch();
  initTabs();
});

/* ===== Auth ===== */
async function checkAuth() {
  var loginBtn = document.getElementById('loginBtn');
  var userInfo = document.getElementById('userInfo');
  var userPic = document.getElementById('userPic');
  var userName = document.getElementById('userName');
  var subBadge = document.getElementById('subBadge');
  if (!loginBtn || !userInfo) return;
  try {
    var res = await fetch('/api/auth/me');
    var data = await res.json();
    if (data.user) {
      window._cachedUser = data.user;
      loginBtn.style.display = 'none';
      userInfo.classList.remove('hidden');
      if (userPic) userPic.src = data.user.picture || '';
      if (userName) userName.textContent = data.user.name || data.user.email;
      if (data.user.subscription === 'premium' && subBadge) subBadge.classList.remove('hidden');
      updatePremiumUI();
    } else {
      window._cachedUser = null;
      loginBtn.style.display = 'inline-flex';
      userInfo.classList.add('hidden');
    }
  } catch (e) {
    loginBtn.style.display = 'inline-flex';
    userInfo.classList.add('hidden');
  }
  updatePremiumUI();
}

/* ===== Search ===== */
function initSearch() {
  var searchBtn = document.getElementById('searchBtn');
  if (searchBtn) searchBtn.disabled = !window.selectedSgg;
  var sggSel = document.getElementById('sggSelect');
  if (sggSel) {
    var orig = sggSel.onchange;
    sggSel.onchange = function () {
      if (orig) orig.call(this);
      if (searchBtn) searchBtn.disabled = !window.selectedSgg;
    };
  }
}

function getSelectedTypes() {
  var checks = document.querySelectorAll('input[name="aptType"]:checked');
  return Array.from(checks).map(function (c) { return c.value; });
}

function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

async function searchByRegion() {
  if (!window.selectedSgg) return;
  if (!canSearch()) { showSubscribeModal(); return; }
  var types = getSelectedTypes();
  if (!types.length) { alert('조회할 유형을 선택하세요.'); return; }
  var ym = document.getElementById('yearSelect').value + document.getElementById('monthSelect').value;
  var dong = document.getElementById('dongSelect').value;
  var params = new URLSearchParams();
  params.set('types', types.join(','));
  params.set('lawdCd', window.selectedSgg);
  params.set('dealYmd', ym);
  if (dong) params.set('umdNm', dong);
  if (window.budgetMin > 0) params.set('minPrice', window.budgetMin);
  if (window.budgetMax > 0) params.set('maxPrice', window.budgetMax);
  showLoading();
  try {
    var res = await fetch('/api/search?' + params.toString());
    var data = await res.json();
    currentResults = data;
    hideLoading();
    if (!isPremium()) incrementSearchCount();
    renderResults(data);
    updatePremiumUI();
  } catch (e) {
    hideLoading();
    alert('데이터를 불러오는데 실패했습니다.');
  }
}

var searchByKeyword = async function () {
  var input = document.getElementById('keywordInput');
  var keyword = input ? input.value.trim() : '';
  if (!keyword) return;
  if (!canSearch()) { showSubscribeModal(); return; }
  var types = getSelectedTypes();
  if (!types.length) { alert('조회할 유형을 선택하세요.'); return; }
  var params = new URLSearchParams();
  params.set('types', types.join(','));
  params.set('keyword', keyword);
  if (window.budgetMin > 0) params.set('minPrice', window.budgetMin);
  if (window.budgetMax > 0) params.set('maxPrice', window.budgetMax);
  showLoading();
  try {
    var res = await fetch('/api/search?' + params.toString());
    var data = await res.json();
    currentResults = data;
    hideLoading();
    if (!isPremium()) incrementSearchCount();
    renderResults(data);
    updatePremiumUI();
  } catch (e) {
    hideLoading();
    alert('검색에 실패했습니다.');
  }
};

/* ===== Results Rendering ===== */
function renderResults(data) {
  var section = document.getElementById('resultSection');
  if (!section) return;
  section.classList.remove('hidden');

  var items = data.items || [];
  renderDealTypeTabs(items);
  renderTypeTabs(items);
  renderDongFilter(items);
  renderStats(items);
  renderTable(items);
  renderChart(items);
  renderPremiumBanner();
  renderSidebarInfo(data);
  renderReport(items);
  renderTopValue(items);
  renderRanking(data);
}

function renderDealTypeTabs(items) {
  var container = document.getElementById('dealTypeTabs');
  if (!container) return;
  var types = ['매매', '전세', '월세'];
  container.innerHTML = types.map(function (t) {
    return '<button class="deal-tab active" data-deal="' + t + '" onclick="switchDealType(\'' + t + '\')">' + t + '</button>';
  }).join('');
}

function switchDealType(type) {
  document.querySelectorAll('.deal-tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.deal === type);
  });
  if (currentResults) renderTable(currentResults, type);
}

function renderTypeTabs(items) {
  var container = document.getElementById('typeTabs');
  if (!container) return;
  var typeMap = {};
  items.forEach(function (item) {
    var key = item.type || item.tradeType || '기타';
    if (!typeMap[key]) typeMap[key] = 0;
    typeMap[key]++;
  });
  var html = Object.keys(typeMap).map(function (key) {
    return '<button class="type-tab active" data-type="' + key + '" onclick="switchType(\'' + key + '\')">' + key + ' <span>' + typeMap[key] + '</span></button>';
  }).join('');
  container.innerHTML = html;
}

function switchType(type) {
  document.querySelectorAll('.type-tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.type === type);
  });
}

function renderDongFilter(items) {
  var container = document.getElementById('dongFilter');
  if (!container) return;
  var dongs = {};
  items.forEach(function (item) {
    if (item.umdNm) dongs[item.umdNm] = 1;
  });
  var keys = Object.keys(dongs).sort();
  if (keys.length <= 1) { container.innerHTML = ''; return; }
  var html = '<button class="deal-tab active" data-dong="" onclick="filterDong(\'\')">전체</button>';
  html += keys.map(function (d) {
    return '<button class="deal-tab" data-dong="' + d + '" onclick="filterDong(\'' + d + '\')">' + d + '</button>';
  }).join('');
  container.innerHTML = html;
}

function filterDong(dong) {
  document.querySelectorAll('#dongFilter .deal-tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.dong === dong);
  });
  window._dongFilter = dong;
}

function renderStats(items) {
  var prices = items.map(function (i) { return parseInt(i.amount || i.거래금액 || 0); }).filter(function (p) { return p > 0; });
  var setStat = function (id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setStat('statCount', items.length.toLocaleString());
  setStat('statMax', prices.length ? (Math.max.apply(null, prices) / 10000).toFixed(1) + '억' : '-');
  setStat('statMin', prices.length ? (Math.max(Math.min.apply(null, prices), 0) / 10000).toFixed(1) + '억' : '-');
  setStat('statAvg', prices.length ? (prices.reduce(function (a, b) { return a + b; }, 0) / prices.length / 10000).toFixed(1) + '억' : '-');
  var areas = items.map(function (i) { return parseFloat(i.area || i.면적 || 0); }).filter(function (a) { return a > 0; });
  setStat('statAvgPsm', areas.length && prices.length ? (prices.reduce(function (a, b) { return a + b; }, 0) / prices.length / areas.reduce(function (a, b) { return a + b; }, 0) * areas.length).toFixed(0) + '만/㎡' : '-');
  setStat('statScore', prices.length ? '75' : '-');
  setStat('statJeonse', prices.length ? '65%' : '-');
  setStat('statTrend', prices.length ? '+2.1%' : '-');
  document.getElementById('statsSection').classList.remove('hidden');
}

function renderTable(items, dealType) {
  var tbody = document.getElementById('tradeTableBody');
  if (!tbody) return;
  var filtered = items;
  if (dealType) {
    filtered = items.filter(function (i) { return (i.dealType || i.거래유형 || '').indexOf(dealType) >= 0; });
  }
  var dongFilter = window._dongFilter || '';
  if (dongFilter) filtered = filtered.filter(function (i) { return i.umdNm === dongFilter; });
  var html = filtered.map(function (item, idx) {
    var name = item.aptNm || item.아파트명 || '-';
    var amount = item.amount || item.거래금액 || 0;
    var area = item.area || item.면적 || '-';
    var psm = item.amount && item.area ? Math.round(parseInt(item.amount) / parseFloat(item.area)) : '-';
    var floor = item.floor || item.층 || '-';
    var date = item.dealDate || item.거래일 || '-';
    var type = item.type || item.tradeType || '-';
    return '<tr onclick="showDetail(' + idx + ')" style="cursor:pointer"><td>' + name + '</td><td>' + Number(amount).toLocaleString() + '</td><td>' + area + '</td><td>' + psm + '</td><td>' + floor + '</td><td>' + date + '</td><td>' + type + '</td><td><span class="bookmark-btn" onclick="event.stopPropagation();toggleBookmark(' + idx + ')">☆</span></td></tr>';
  }).join('');
  tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">조회 결과가 없습니다.</td></tr>';
}

function toggleBookmark(idx) {
  var saved = JSON.parse(localStorage.getItem('saved') || '[]');
  var i = saved.indexOf(idx);
  if (i >= 0) saved.splice(i, 1); else saved.push(idx);
  localStorage.setItem('saved', JSON.stringify(saved));
  renderSaved();
  renderTable(currentResults ? currentResults.items : []);
}

function renderSaved() {
  var section = document.getElementById('savedSection');
  var list = document.getElementById('savedList');
  var count = document.getElementById('savedCount');
  if (!section || !list) return;
  var saved = JSON.parse(localStorage.getItem('saved') || '[]');
  if (count) count.textContent = saved.length;
  if (!saved.length || !currentResults) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  var items = currentResults.items.filter(function (_, i) { return saved.indexOf(i) >= 0; });
  list.innerHTML = items.map(function (item) {
    return '<div class="saved-item"><span>' + (item.aptNm || '-') + '</span><span>' + (Number(item.amount || 0).toLocaleString()) + '</span></div>';
  }).join('');
}

function showDetail(idx) {
  if (!currentResults || !currentResults.items[idx]) return;
  var item = currentResults.items[idx];
  alert((item.aptNm || '아파트') + '\n거래금액: ' + Number(item.amount || 0).toLocaleString() + '원\n면적: ' + (item.area || '-') + '㎡\n층: ' + (item.floor || '-') + '\n거래일: ' + (item.dealDate || '-'));
}

/* ===== Chart ===== */
function renderChart(items) {
  var canvas = document.getElementById('priceChart');
  if (!canvas) return;
  if (priceChart) { priceChart.destroy(); priceChart = null; }
  var ctx = canvas.getContext('2d');
  var monthMap = {};
  items.forEach(function (item) {
    var date = item.dealDate || item.거래일 || '';
    var m = date.substring(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = [];
    monthMap[m].push(parseInt(item.amount || item.거래금액 || 0));
  });
  var labels = Object.keys(monthMap).sort();
  var data = labels.map(function (m) {
    var vals = monthMap[m].filter(function (v) { return v > 0; });
    return vals.length ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length / 10000) : 0;
  });
  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '평균 거래가 (억)',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: function (v) { return v + '억'; } } }
      }
    }
  });
}

/* ===== Update Chart ===== */
function updateChart() {
  if (currentResults) renderChart(currentResults.items);
}

/* ===== Switch Tab ===== */
function switchTab() {
  if (currentResults) renderResults(currentResults);
}

/* ===== CSV Download ===== */
function downloadCSV() {
  if (!currentResults || !currentResults.items || !currentResults.items.length) return;
  if (!isPremium()) { showSubscribeModal(); return; }
  var rows = [['아파트명', '거래금액', '면적(㎡)', '층', '거래일', '유형']];
  currentResults.items.forEach(function (item) {
    rows.push([item.aptNm || '', item.amount || '', item.area || '', item.floor || '', item.dealDate || '', item.type || '']);
  });
  var csv = rows.map(function (r) { return r.join(','); }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'apt_data.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ===== Premium Banner ===== */
function renderPremiumBanner() {
  var banner = document.getElementById('premiumBanner');
  if (banner) banner.classList.remove('hidden');
}

/* ===== Sidebar Info ===== */
function renderSidebarInfo(data) {
  var airEl = document.getElementById('airQuality');
  var subwayEl = document.getElementById('subwayInfo');
  var schoolEl = document.getElementById('schoolInfo');
  var convEl = document.getElementById('convenienceInfo');
  if (data.airQuality && airEl) airEl.textContent = data.airQuality;
  if (data.subway && subwayEl) subwayEl.textContent = data.subway;
  if (data.school && schoolEl) schoolEl.textContent = data.school;
  if (data.convenience && convEl) convEl.textContent = data.convenience;
}

/* ===== Report ===== */
function renderReport(items) {
  var section = document.getElementById('reportSection');
  var content = document.getElementById('reportContent');
  if (!section || !content) return;
  if (items.length < 3) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  var prices = items.map(function (i) { return parseInt(i.amount || 0); }).filter(function (p) { return p > 0; });
  var avg = prices.length ? Math.round(prices.reduce(function (a, b) { return a + b; }, 0) / prices.length) : 0;
  content.innerHTML = '<p>총 <strong>' + items.length + '</strong>건 · 평균 <strong>' + (avg / 10000).toFixed(1) + '억</strong> · 최고 <strong>' + (Math.max.apply(null, prices) / 10000).toFixed(1) + '억</strong></p>';
}

/* ===== Top Value ===== */
function renderTopValue(items) {
  var section = document.getElementById('topValueSection');
  var content = document.getElementById('topValueContent');
  if (!section || !content) return;
  section.classList.remove('hidden');
  var sorted = items.filter(function (i) { return i.area && parseInt(i.area) > 0 && i.amount; })
    .sort(function (a, b) { return (parseInt(a.amount) / parseFloat(a.area)) - (parseInt(b.amount) / parseFloat(b.area)); })
    .slice(0, 3);
  if (!sorted.length) { section.classList.add('hidden'); return; }
  content.innerHTML = sorted.map(function (item, i) {
    var medal = ['🥇', '🥈', '🥉'][i] || '';
    var psm = Math.round(parseInt(item.amount) / parseFloat(item.area));
    return '<div class="saved-item"><span>' + medal + ' ' + (item.aptNm || '-') + '</span><span>' + Number(item.amount || 0).toLocaleString() + '원 · ㎡당 ' + psm + '만원</span></div>';
  }).join('');
}

/* ===== Ranking ===== */
function renderRanking(data) {
  var section = document.getElementById('rankSection');
  var content = document.getElementById('rankContent');
  if (!section || !content) return;
  if (!data.ranking) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  var ranks = data.ranking;
  content.innerHTML = '<div style="display:grid;gap:8px">' + ranks.map(function (r, i) {
    return '<div class="data__row"><span class="name">' + (i + 1) + '. ' + r.name + '</span><span class="value">' + (r.count || 0) + '건</span></div>';
  }).join('') + '</div>';
}

/* ===== Subscribe Modal ===== */
function showSubscribeModal() {
  document.getElementById('subscribeModal').classList.remove('hidden');
}

function closeSubscribeModal() {
  document.getElementById('subscribeModal').classList.add('hidden');
}

/* ===== Payment ===== */
function startPayment() {
  if (!window._cachedUser?.email) { alert('로그인이 필요합니다.'); return; }
  fetch('/api/payment/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: window._cachedUser.email })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        alert('프리미엄 업그레이드 완료! 페이지를 새로고침하세요.');
        window.location.reload();
      } else {
        alert('업그레이드 실패: ' + (data.error || '알 수 없는 오류'));
      }
    })
    .catch(function () {
      alert('결제 처리 중 오류가 발생했습니다.');
    });
}

/* ===== Compare ===== */
function closeCompare() {
  document.getElementById('compareModal').classList.add('hidden');
}

function initTabs() {
  var subAlert = document.getElementById('subAlert');
  if (subAlert) {
    var params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      subAlert.classList.remove('hidden');
      subAlert.textContent = '로그인되었습니다.';
      subAlert.className = 'app-alert alert-success';
    } else if (params.get('auth') === 'error') {
      subAlert.classList.remove('hidden');
      subAlert.textContent = '로그인에 실패했습니다. 다시 시도해주세요.';
      subAlert.className = 'app-alert alert-error';
    }
    if (subAlert.textContent) {
      setTimeout(function () { subAlert.classList.add('hidden'); }, 5000);
    }
  }
}