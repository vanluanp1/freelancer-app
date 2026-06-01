/* ============================================
   FINANCE.JS — Thu Chi Manager
   ============================================ */

let _financeTab = 'today'; // today | week | month | all
let _financeStatsTab = 'week'; // week | month
let _financeMonth = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })();
let _financeMonthOffset = 0; // 0 = current month
let _financeCatFilter = '';
let _financeTypeFilter = ''; // '' | 'income' | 'expense'

function renderFinance() {
  const finSettings = getFinanceSettings();
  return `
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">💰 Thu Chi</h1>
        <p class="page-subtitle">Quản lý tài chính cá nhân hàng ngày</p>
      </div>
    </div>
  </div>
  <div class="page-body">
    <!-- Quick Add Form -->
    ${renderQuickAddForm(finSettings)}

    <!-- Transaction List Tabs -->
    <div class="fin-tabs mb-3">
      ${[['today','Hôm nay'],['week','Tuần này'],['month','Tháng này'],['all','Tất cả']].map(([k,l]) =>
        `<button class="fin-tab-btn ${_financeTab===k?'active':''}" onclick="switchFinTab('${k}')">${l}</button>`
      ).join('')}
    </div>

    <!-- Filters -->
    <div class="fin-filter-bar mb-3">
      <select class="filter-select" id="fin-type-filter" onchange="onFinFilterChange()">
        <option value="">Tất cả loại</option>
        <option value="income" ${_financeTypeFilter==='income'?'selected':''}>📈 Thu nhập</option>
        <option value="expense" ${_financeTypeFilter==='expense'?'selected':''}>📉 Chi tiêu</option>
      </select>
      <select class="filter-select" id="fin-cat-filter" onchange="onFinFilterChange()">
        <option value="">Tất cả danh mục</option>
        ${getTransactionCategories().map(c => `<option value="${c.id}" ${_financeCatFilter===c.id?'selected':''}>${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>

    <!-- Transaction List -->
    ${renderTransactionList()}

    <!-- Stats Charts -->
    <div class="fin-stats-section">
      <div class="fin-stats-tabs mb-3">
        <button class="fin-tab-btn ${_financeStatsTab==='week'?'active':''}" onclick="switchFinStatsTab('week')">📊 Tuần này</button>
        <button class="fin-tab-btn ${_financeStatsTab==='month'?'active':''}" onclick="switchFinStatsTab('month')">📅 Tháng này</button>
      </div>
      ${_financeStatsTab === 'week' ? renderFinWeekStats() : renderFinMonthStats()}
    </div>
  </div>`;
}

/* ---- Quick Add Form ---- */
function renderQuickAddForm(finSettings) {
  const cats = getTransactionCategories();
  const incomeCats = cats.filter(c => c.type === 'income' || c.type === 'both');
  const expenseCats = cats.filter(c => c.type === 'expense' || c.type === 'both');
  const defCurrency = finSettings.defaultCurrency || 'VND';

  return `
  <div class="fin-quick-add card mb-4">
    <div class="fin-qa-header">
      <span style="font-weight:700;font-size:15px">⚡ Thêm giao dịch nhanh</span>
    </div>
    <div class="fin-qa-body">
      <!-- Type Toggle -->
      <div class="fin-type-toggle" id="fin-type-toggle">
        <button class="fin-type-btn expense active" id="fin-btn-expense" onclick="selectFinType('expense')">📉 Chi tiêu</button>
        <button class="fin-type-btn income" id="fin-btn-income" onclick="selectFinType('income')">📈 Thu nhập</button>
      </div>

      <!-- Amount + Currency -->
      <div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:end">
        <div class="form-group" style="margin:0">
          <label class="form-label">Số tiền *</label>
          <input id="fin-amount" class="form-input fin-amount-input" type="number" min="0" step="1000" placeholder="0" oninput="formatAmountInput(this)">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Tiền tệ</label>
          <div class="fin-currency-toggle">
            <button class="fin-cur-btn ${defCurrency==='VND'?'active':''}" id="fin-cur-vnd" onclick="selectFinCurrency('VND')">VNĐ</button>
            <button class="fin-cur-btn ${defCurrency==='USD'?'active':''}" id="fin-cur-usd" onclick="selectFinCurrency('USD')">USD</button>
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Ngày</label>
          <input id="fin-date" type="date" class="form-input" value="${today()}" style="max-width:150px">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Danh mục</label>
          <select id="fin-category" class="form-select">
            <option value="">— Chọn danh mục —</option>
            <optgroup label="Chi tiêu 📉" id="fin-cat-expense-group">
              ${expenseCats.map(c => `<option value="${c.id}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`).join('')}
            </optgroup>
            <optgroup label="Thu nhập 📈" id="fin-cat-income-group" style="display:none">
              ${incomeCats.map(c => `<option value="${c.id}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`).join('')}
            </optgroup>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Ghi chú</label>
          <input id="fin-note" class="form-input" placeholder="Cà phê sáng, thanh toán dự án X...">
        </div>
      </div>

      <button class="btn btn-primary w-full" onclick="submitAddTransaction()" style="margin-top:4px">
        ➕ Thêm giao dịch
      </button>
    </div>
  </div>`;
}

let _finCurrentType = 'expense';
let _finCurrentCurrency = null;

function selectFinType(type) {
  _finCurrentType = type;
  const btnExp = document.getElementById('fin-btn-expense');
  const btnInc = document.getElementById('fin-btn-income');
  const catExp = document.getElementById('fin-cat-expense-group');
  const catInc = document.getElementById('fin-cat-income-group');
  if (btnExp) { btnExp.classList.toggle('active', type==='expense'); btnExp.classList.toggle('income', false); }
  if (btnInc) { btnInc.classList.toggle('active', type==='income'); }
  if (catExp) catExp.style.display = type==='expense' ? '' : 'none';
  if (catInc) catInc.style.display = type==='income' ? '' : 'none';
  const catSel = document.getElementById('fin-category');
  if (catSel) catSel.value = '';
}

function selectFinCurrency(cur) {
  _finCurrentCurrency = cur;
  document.getElementById('fin-cur-vnd')?.classList.toggle('active', cur==='VND');
  document.getElementById('fin-cur-usd')?.classList.toggle('active', cur==='USD');
}

function formatAmountInput(input) {
  // allow raw numbers, just keep it
}

function submitAddTransaction() {
  const amountRaw = parseFloat(document.getElementById('fin-amount')?.value) || 0;
  if (!amountRaw || amountRaw <= 0) { showToast('Vui lòng nhập số tiền!', 'error'); return; }

  const finSettings = getFinanceSettings();
  const currency = _finCurrentCurrency || finSettings.defaultCurrency || 'VND';
  const catId = document.getElementById('fin-category')?.value || null;
  const note = document.getElementById('fin-note')?.value?.trim() || '';
  const date = document.getElementById('fin-date')?.value || today();

  addTransaction({
    type: _finCurrentType,
    amount: amountRaw,
    currency,
    categoryId: catId,
    note,
    date,
  });

  // Reset form
  const amtEl = document.getElementById('fin-amount');
  const noteEl = document.getElementById('fin-note');
  if (amtEl) amtEl.value = '';
  if (noteEl) noteEl.value = '';
  const catEl = document.getElementById('fin-category');
  if (catEl) catEl.value = '';

  showToast(`Đã thêm ${_finCurrentType === 'income' ? 'thu nhập' : 'chi tiêu'}!`, 'success');
  renderCurrentPage();
}

/* ---- Transaction List ---- */
function renderTransactionList() {
  const all = getTransactions();
  const cats = getTransactionCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  let filtered = all;
  // Date filter
  const todayStr = today();
  if (_financeTab === 'today') {
    filtered = filtered.filter(t => t.date === todayStr);
  } else if (_financeTab === 'week') {
    const ws = getWeekStartStr();
    const we = getWeekEndStr();
    filtered = filtered.filter(t => t.date >= ws && t.date <= we);
  } else if (_financeTab === 'month') {
    const ym = todayStr.slice(0,7);
    filtered = filtered.filter(t => t.date.startsWith(ym));
  }
  // Type filter
  if (_financeTypeFilter) filtered = filtered.filter(t => t.type === _financeTypeFilter);
  // Cat filter
  if (_financeCatFilter) filtered = filtered.filter(t => t.categoryId === _financeCatFilter);

  // Sort desc
  filtered = filtered.sort((a,b) => b.date.localeCompare(a.date) || b.createdAt?.localeCompare(a.createdAt||''));

  // Summary
  const totalIncome = filtered.filter(t=>t.type==='income').reduce((s,t)=>s+convertToVND(t),0);
  const totalExpense = filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+convertToVND(t),0);
  const balance = totalIncome - totalExpense;

  // Group by date
  const groups = {};
  filtered.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });
  const sortedDates = Object.keys(groups).sort((a,b) => b.localeCompare(a));

  const summaryHTML = `
  <div class="fin-summary-bar mb-3">
    <div class="fin-sum-item income">
      <span class="fin-sum-label">📈 Tổng thu</span>
      <span class="fin-sum-value income">+${formatMoney(totalIncome, 'VND')}</span>
    </div>
    <div class="fin-sum-divider"></div>
    <div class="fin-sum-item expense">
      <span class="fin-sum-label">📉 Tổng chi</span>
      <span class="fin-sum-value expense">-${formatMoney(totalExpense, 'VND')}</span>
    </div>
    <div class="fin-sum-divider"></div>
    <div class="fin-sum-item">
      <span class="fin-sum-label">💼 Số dư</span>
      <span class="fin-sum-value ${balance >= 0 ? 'income' : 'expense'}">${balance >= 0 ? '+' : ''}${formatMoney(balance, 'VND')}</span>
    </div>
  </div>`;

  if (filtered.length === 0) {
    return summaryHTML + `<div class="no-data"><div class="no-data-icon">💸</div><p>Chưa có giao dịch nào</p></div>`;
  }

  const listHTML = sortedDates.map(date => {
    const dayTx = groups[date];
    const dayInc = dayTx.filter(t=>t.type==='income').reduce((s,t)=>s+convertToVND(t),0);
    const dayExp = dayTx.filter(t=>t.type==='expense').reduce((s,t)=>s+convertToVND(t),0);
    return `
    <div class="fin-day-group">
      <div class="fin-day-header">
        <span class="fin-day-label">${formatViDateStr2(date)}</span>
        <div class="fin-day-totals">
          ${dayInc > 0 ? `<span class="fin-day-inc">+${formatMoneyShort(dayInc)}</span>` : ''}
          ${dayExp > 0 ? `<span class="fin-day-exp">-${formatMoneyShort(dayExp)}</span>` : ''}
        </div>
      </div>
      <div class="fin-tx-list">
        ${dayTx.map(t => {
          const cat = t.categoryId ? catMap[t.categoryId] : null;
          return `
          <div class="fin-tx-item" id="tx-${t.id}">
            <div class="fin-tx-icon">${cat ? escapeHtml(cat.icon) : (t.type==='income'?'💰':'💸')}</div>
            <div class="fin-tx-info">
              <div class="fin-tx-cat">${cat ? escapeHtml(cat.name) : (t.type==='income'?'Thu nhập':'Chi tiêu')}</div>
              ${t.note ? `<div class="fin-tx-note">${escapeHtml(t.note)}</div>` : ''}
            </div>
            <div class="fin-tx-right">
              <div class="fin-tx-amount ${t.type}">
                ${t.type==='income'?'+':'-'}${formatMoney(t.amount, t.currency)}
              </div>
              <div class="fin-tx-currency-badge ${t.currency.toLowerCase()}">${t.currency}</div>
            </div>
            <div class="fin-tx-actions">
              <button class="btn-icon" onclick="openEditTransaction('${t.id}')" title="Sửa">✏️</button>
              <button class="btn-icon" onclick="confirmDeleteTransaction('${t.id}')" title="Xóa">🗑️</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  return summaryHTML + listHTML;
}

/* ---- Week Stats ---- */
function renderFinWeekStats() {
  const ws = getWeekStartStr();
  const we = getWeekEndStr();
  const all = getTransactions().filter(t => t.date >= ws && t.date <= we);
  const finSettings = getFinanceSettings();
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(ws + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return toDateStr(d);
  });
  const VI_DAYS_SHORT = ['CN','T2','T3','T4','T5','T6','T7'];

  const dayData = days.map(date => {
    const txs = all.filter(t => t.date === date);
    const inc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+convertToVND(t),0);
    const exp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+convertToVND(t),0);
    const d = new Date(date+'T00:00:00');
    return { date, label: VI_DAYS_SHORT[d.getDay()], inc, exp };
  });

  const maxVal = Math.max(1, ...dayData.map(d => Math.max(d.inc, d.exp)));

  // Cashflow: running balance
  let running = 0;
  const cashflow = dayData.map(d => { running += d.inc - d.exp; return running; });
  const maxCf = Math.max(1, Math.abs(Math.min(0,...cashflow)), Math.max(...cashflow));

  // Weekly totals
  const weekInc = dayData.reduce((s,d)=>s+d.inc,0);
  const weekExp = dayData.reduce((s,d)=>s+d.exp,0);
  const weekBal = weekInc - weekExp;
  const maxExpDay = dayData.reduce((m,d) => d.exp > (m?.exp||0) ? d : m, null);

  return `
  <div class="card mb-4">
    <div class="fin-stats-chart-title">📊 Thu vs Chi — Tuần này</div>
    <div class="fin-bar-chart">
      ${dayData.map((d,i) => {
        const incH = maxVal > 0 ? Math.max(2, d.inc/maxVal*100) : 0;
        const expH = maxVal > 0 ? Math.max(2, d.exp/maxVal*100) : 0;
        const isToday = d.date === today();
        return `
        <div class="fin-bar-day ${isToday?'today':''}">
          <div class="fin-bar-group">
            <div class="fin-bar-col">
              ${d.inc > 0 ? `<div class="fin-bar income" style="height:${incH}%" title="+${formatMoneyShort(d.inc)}"></div>` : '<div class="fin-bar empty" style="height:2%"></div>'}
            </div>
            <div class="fin-bar-col">
              ${d.exp > 0 ? `<div class="fin-bar expense" style="height:${expH}%" title="-${formatMoneyShort(d.exp)}"></div>` : '<div class="fin-bar empty" style="height:2%"></div>'}
            </div>
          </div>
          <div class="fin-bar-label">${d.label}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="fin-bar-legend">
      <span><span class="fin-legend-dot income"></span>Thu nhập</span>
      <span><span class="fin-legend-dot expense"></span>Chi tiêu</span>
    </div>

    <!-- Cashflow line -->
    <div class="fin-cashflow-section">
      <div class="fin-stats-chart-subtitle">📈 Số dư tích lũy</div>
      <div class="fin-cashflow-chart">
        ${cashflow.map((v, i) => {
          const pct = maxCf ? (v/maxCf*50 + 50) : 50;
          const d = dayData[i];
          return `<div class="fin-cf-point" style="bottom:${Math.max(5,Math.min(95,pct))}%" title="${d.label}: ${v>=0?'+':''}${formatMoneyShort(v)}">
            <div class="fin-cf-dot ${v>=0?'positive':'negative'}"></div>
          </div>`;
        }).join('')}
        <div class="fin-cf-zero-line"></div>
      </div>
    </div>
  </div>

  <!-- Week Summary -->
  <div class="fin-week-summary card">
    <div class="fin-stats-chart-title">📋 Tổng kết tuần</div>
    <div class="fin-sum-grid">
      <div class="fin-sum-box income">
        <div class="fin-sum-box-label">Tổng thu</div>
        <div class="fin-sum-box-val">+${formatMoney(weekInc,'VND')}</div>
      </div>
      <div class="fin-sum-box expense">
        <div class="fin-sum-box-label">Tổng chi</div>
        <div class="fin-sum-box-val">-${formatMoney(weekExp,'VND')}</div>
      </div>
      <div class="fin-sum-box ${weekBal>=0?'income':'expense'}">
        <div class="fin-sum-box-label">Số dư tuần</div>
        <div class="fin-sum-box-val">${weekBal>=0?'+':''}${formatMoney(weekBal,'VND')}</div>
      </div>
      <div class="fin-sum-box">
        <div class="fin-sum-box-label">Chi nhiều nhất</div>
        <div class="fin-sum-box-val" style="font-size:13px">${maxExpDay && maxExpDay.exp > 0 ? `${maxExpDay.label} — ${formatMoneyShort(maxExpDay.exp)}` : '—'}</div>
      </div>
    </div>
  </div>`;
}

/* ---- Month Stats ---- */
function renderFinMonthStats() {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + _financeMonthOffset, 1);
  const ym = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}`;
  const prevDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;

  const all = getTransactions();
  const monthTx = all.filter(t => t.date.startsWith(ym));
  const prevMonthTx = all.filter(t => t.date.startsWith(prevYm));
  const cats = getTransactionCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  const monthInc = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+convertToVND(t),0);
  const monthExp = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+convertToVND(t),0);
  const monthBal = monthInc - monthExp;
  const prevExp = prevMonthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+convertToVND(t),0);
  const expChange = prevExp > 0 ? Math.round((monthExp - prevExp) / prevExp * 100) : null;

  // Donut by expense category (top 5)
  const expByCat = {};
  monthTx.filter(t=>t.type==='expense').forEach(t => {
    const key = t.categoryId || '__other__';
    expByCat[key] = (expByCat[key] || 0) + convertToVND(t);
  });
  const catEntries = Object.entries(expByCat).sort((a,b)=>b[1]-a[1]);
  const top5 = catEntries.slice(0,5);
  const othersSum = catEntries.slice(5).reduce((s,[,v])=>s+v,0);
  if (othersSum > 0) top5.push(['__other__', othersSum]);
  const DONUT_COLORS = ['#6C63FF','#FF6B6B','#FFA502','#2ED573','#54A0FF','#FF9FF3'];

  // Donut segments
  const totalExp = monthExp || 1;
  let startAngle = -90;
  const donutSegs = top5.map(([ catId, val ], i) => {
    const cat = catId !== '__other__' ? catMap[catId] : null;
    const pct = val / totalExp;
    const angle = pct * 360;
    const seg = { catId, val, pct, angle, startAngle, color: DONUT_COLORS[i % DONUT_COLORS.length], label: cat ? `${cat.icon} ${cat.name}` : '🗂️ Khác' };
    startAngle += angle;
    return seg;
  });

  // Week-by-week bars in month
  const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth()+1, 0).getDate();
  const weeks = [];
  let d = 1;
  while (d <= daysInMonth) {
    const wEnd = Math.min(d + 6, daysInMonth);
    const wTx = monthTx.filter(t => {
      const dd = parseInt(t.date.slice(8,10));
      return dd >= d && dd <= wEnd;
    });
    weeks.push({
      label: `T${d}-${wEnd}`,
      inc: wTx.filter(t=>t.type==='income').reduce((s,t)=>s+convertToVND(t),0),
      exp: wTx.filter(t=>t.type==='expense').reduce((s,t)=>s+convertToVND(t),0),
    });
    d += 7;
  }
  const maxWVal = Math.max(1, ...weeks.flatMap(w=>[w.inc,w.exp]));

  // Top expense cat
  const topExpCat = top5[0];
  const topCatInfo = topExpCat && topExpCat[0] !== '__other__' ? catMap[topExpCat[0]] : null;

  const monthLabel = targetDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return `
  <!-- Month Nav -->
  <div class="fin-month-nav mb-3">
    <button class="btn btn-ghost btn-sm" onclick="changeFinMonth(-1)">← Tháng trước</button>
    <span style="font-weight:700;font-size:14px">${monthLabel}</span>
    <button class="btn btn-ghost btn-sm" onclick="changeFinMonth(1)" ${_financeMonthOffset >= 0 ? 'disabled' : ''}>Tháng sau →</button>
  </div>

  <!-- Month totals -->
  <div class="fin-sum-grid card mb-4">
    <div class="fin-sum-box income">
      <div class="fin-sum-box-label">Tổng thu</div>
      <div class="fin-sum-box-val">+${formatMoney(monthInc,'VND')}</div>
    </div>
    <div class="fin-sum-box expense">
      <div class="fin-sum-box-label">Tổng chi</div>
      <div class="fin-sum-box-val">-${formatMoney(monthExp,'VND')}</div>
    </div>
    <div class="fin-sum-box ${monthBal>=0?'income':'expense'}">
      <div class="fin-sum-box-label">Số dư</div>
      <div class="fin-sum-box-val">${monthBal>=0?'+':''}${formatMoney(monthBal,'VND')}</div>
    </div>
    <div class="fin-sum-box">
      <div class="fin-sum-box-label">So tháng trước</div>
      <div class="fin-sum-box-val" style="font-size:13px;color:${expChange!==null?(expChange>0?'var(--danger)':'var(--success)'):'var(--text-muted)'}">
        ${expChange !== null ? (expChange > 0 ? `↑ +${expChange}%` : `↓ ${expChange}%`) : '—'}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
    <!-- Donut chart expense by category -->
    <div class="card">
      <div class="fin-stats-chart-title">🍩 Chi tiêu theo danh mục</div>
      ${monthExp === 0 ? '<p style="color:var(--text-muted);font-size:13px;padding:20px 0">Chưa có chi tiêu</p>' : `
      <div class="fin-donut-wrap">
        <svg class="fin-donut-svg" viewBox="0 0 100 100">
          ${donutSegs.map(seg => {
            const r = 35, cx = 50, cy = 50;
            const circ = 2 * Math.PI * r;
            const dashLen = seg.pct * circ;
            const offset = circ * (1 - seg.pct + (seg.startAngle + 90) / 360);
            return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="16"
              stroke-dasharray="${dashLen} ${circ - dashLen}"
              stroke-dashoffset="${-((seg.startAngle + 90) / 360 * circ)}"
              style="transform-origin:center;transform:rotate(-90deg)">
              <title>${escapeHtml(seg.label)}: ${Math.round(seg.pct*100)}%</title>
            </circle>`;
          }).join('')}
          <circle cx="50" cy="50" r="25" fill="var(--bg-card)"/>
          <text x="50" y="46" text-anchor="middle" style="font-size:7px;fill:var(--text-muted)">Chi tiêu</text>
          <text x="50" y="57" text-anchor="middle" style="font-size:6px;fill:var(--text);font-weight:700">${formatMoneyShort(monthExp)}</text>
        </svg>
        <div class="fin-donut-legend">
          ${donutSegs.map(seg => `
          <div class="fin-donut-item">
            <div class="fin-legend-dot" style="background:${seg.color}"></div>
            <span class="fin-donut-label">${escapeHtml(seg.label)}</span>
            <span class="fin-donut-pct">${Math.round(seg.pct*100)}%</span>
          </div>`).join('')}
        </div>
      </div>`}
    </div>

    <!-- Weekly bars -->
    <div class="card">
      <div class="fin-stats-chart-title">📊 Theo tuần trong tháng</div>
      <div class="fin-bar-chart" style="height:140px">
        ${weeks.map(w => {
          const incH = w.inc/maxWVal*100;
          const expH = w.exp/maxWVal*100;
          return `
          <div class="fin-bar-day">
            <div class="fin-bar-group">
              <div class="fin-bar-col">
                ${w.inc > 0 ? `<div class="fin-bar income" style="height:${Math.max(2,incH)}%" title="+${formatMoneyShort(w.inc)}"></div>` : '<div class="fin-bar empty" style="height:2%"></div>'}
              </div>
              <div class="fin-bar-col">
                ${w.exp > 0 ? `<div class="fin-bar expense" style="height:${Math.max(2,expH)}%" title="-${formatMoneyShort(w.exp)}"></div>` : '<div class="fin-bar empty" style="height:2%"></div>'}
              </div>
            </div>
            <div class="fin-bar-label" style="font-size:9px">${w.label}</div>
          </div>`;
        }).join('')}
      </div>
      ${topExpCat ? `
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)">
        Chi nhiều nhất: <b>${topCatInfo ? escapeHtml(topCatInfo.icon+' '+topCatInfo.name) : 'Khác'}</b> — ${formatMoney(topExpCat[1],'VND')} (${Math.round(topExpCat[1]/totalExp*100)}%)
      </div>` : ''}
    </div>
  </div>`;
}

/* ---- Edit Transaction ---- */
function openEditTransaction(txId) {
  const tx = getTransactionById(txId);
  if (!tx) return;
  const cats = getTransactionCategories();
  const incomeCats = cats.filter(c => c.type==='income' || c.type==='both');
  const expenseCats = cats.filter(c => c.type==='expense' || c.type==='both');

  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">✏️ Sửa giao dịch</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="fin-type-toggle mb-3">
        <button class="fin-type-btn expense ${tx.type==='expense'?'active':''}" id="edit-fin-btn-expense" onclick="editToggleType('expense')">📉 Chi tiêu</button>
        <button class="fin-type-btn income ${tx.type==='income'?'active':''}" id="edit-fin-btn-income" onclick="editToggleType('income')">📈 Thu nhập</button>
      </div>
      <input type="hidden" id="edit-fin-type" value="${tx.type}">
      <div class="form-group">
        <label class="form-label">Số tiền *</label>
        <div style="display:flex;gap:8px">
          <input id="edit-fin-amount" class="form-input" type="number" min="0" value="${tx.amount}" style="flex:1">
          <div class="fin-currency-toggle">
            <button class="fin-cur-btn ${tx.currency==='VND'?'active':''}" id="edit-cur-vnd" onclick="editToggleCurrency('VND')">VNĐ</button>
            <button class="fin-cur-btn ${tx.currency==='USD'?'active':''}" id="edit-cur-usd" onclick="editToggleCurrency('USD')">USD</button>
          </div>
        </div>
      </div>
      <input type="hidden" id="edit-fin-currency" value="${tx.currency}">
      <div class="form-group">
        <label class="form-label">Danh mục</label>
        <select id="edit-fin-cat" class="form-select">
          <option value="">— Không có —</option>
          <optgroup label="Chi tiêu 📉">
            ${expenseCats.map(c=>`<option value="${c.id}" ${tx.categoryId===c.id?'selected':''}>${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`).join('')}
          </optgroup>
          <optgroup label="Thu nhập 📈">
            ${incomeCats.map(c=>`<option value="${c.id}" ${tx.categoryId===c.id?'selected':''}>${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`).join('')}
          </optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ghi chú</label>
        <input id="edit-fin-note" class="form-input" value="${escapeHtml(tx.note||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Ngày</label>
        <input id="edit-fin-date" type="date" class="form-input" value="${tx.date}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitEditTransaction('${txId}')">Lưu</button>
    </div>
  </div>`);
}

function editToggleType(type) {
  document.getElementById('edit-fin-type').value = type;
  document.getElementById('edit-fin-btn-expense')?.classList.toggle('active', type==='expense');
  document.getElementById('edit-fin-btn-income')?.classList.toggle('active', type==='income');
}
function editToggleCurrency(cur) {
  document.getElementById('edit-fin-currency').value = cur;
  document.getElementById('edit-cur-vnd')?.classList.toggle('active', cur==='VND');
  document.getElementById('edit-cur-usd')?.classList.toggle('active', cur==='USD');
}
function submitEditTransaction(txId) {
  const amount = parseFloat(document.getElementById('edit-fin-amount')?.value) || 0;
  if (!amount) { showToast('Số tiền không hợp lệ!','error'); return; }
  updateTransaction(txId, {
    type: document.getElementById('edit-fin-type')?.value || 'expense',
    amount,
    currency: document.getElementById('edit-fin-currency')?.value || 'VND',
    categoryId: document.getElementById('edit-fin-cat')?.value || null,
    note: document.getElementById('edit-fin-note')?.value?.trim() || '',
    date: document.getElementById('edit-fin-date')?.value || today(),
  });
  closeModal();
  showToast('Đã cập nhật giao dịch!','success');
  renderCurrentPage();
}

function confirmDeleteTransaction(txId) {
  if (confirm('Xóa giao dịch này?')) {
    deleteTransaction(txId);
    showToast('Đã xóa giao dịch!','info');
    renderCurrentPage();
  }
}

/* ---- Navigation helpers ---- */
function switchFinTab(tab) {
  _financeTab = tab;
  renderCurrentPage();
}
function switchFinStatsTab(tab) {
  _financeStatsTab = tab;
  renderCurrentPage();
}
function changeFinMonth(delta) {
  _financeMonthOffset += delta;
  if (_financeMonthOffset > 0) _financeMonthOffset = 0;
  renderCurrentPage();
}
function onFinFilterChange() {
  _financeTypeFilter = document.getElementById('fin-type-filter')?.value || '';
  _financeCatFilter = document.getElementById('fin-cat-filter')?.value || '';
  renderCurrentPage();
}

/* ---- Category Management Modal (from Settings) ---- */
function openFinanceCategoryManager() {
  const cats = getTransactionCategories();
  const renderCatList = () => cats.map(c => `
    <div class="fin-cat-item" id="fincat-${c.id}">
      <span style="font-size:20px">${escapeHtml(c.icon)}</span>
      <span style="flex:1;font-size:13px;font-weight:600">${escapeHtml(c.name)}</span>
      <span class="badge ${c.type==='income'?'badge-active':c.type==='expense'?'badge-high':'badge-medium'}" style="font-size:10px">${c.type==='income'?'Thu':'Chi'}</span>
      ${!c.isDefault ? `<button class="btn-icon" onclick="deleteFinCategory('${c.id}')" title="Xóa">🗑️</button>` : ''}
    </div>`).join('');

  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">🗂️ Quản lý danh mục</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div id="fin-cat-list" style="max-height:300px;overflow-y:auto;margin-bottom:16px">${renderCatList()}</div>
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <div style="font-weight:700;font-size:13px;margin-bottom:10px">➕ Thêm danh mục mới</div>
        <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:end">
          <div class="form-group" style="margin:0">
            <label class="form-label">Icon</label>
            <input id="new-cat-icon" class="form-input" value="💡" style="width:60px;text-align:center;font-size:20px">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Tên danh mục</label>
            <input id="new-cat-name" class="form-input" placeholder="VD: Cà phê...">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Loại</label>
            <select id="new-cat-type" class="form-select" style="width:100px">
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-sm mt-2" onclick="submitAddFinCategory()">Thêm</button>
      </div>
    </div>
  </div>`);
}

function submitAddFinCategory() {
  const icon = document.getElementById('new-cat-icon')?.value?.trim() || '💡';
  const name = document.getElementById('new-cat-name')?.value?.trim();
  const type = document.getElementById('new-cat-type')?.value || 'expense';
  if (!name) { showToast('Vui lòng nhập tên danh mục!','error'); return; }
  addTransactionCategory({ icon, name, type, isDefault: false });
  showToast('Đã thêm danh mục!','success');
  closeModal();
}

function deleteFinCategory(id) {
  if (confirm('Xóa danh mục này? Giao dịch thuộc danh mục này sẽ không còn danh mục.')) {
    deleteTransactionCategory(id);
    showToast('Đã xóa danh mục!','info');
    closeModal();
  }
}

/* ---- Helpers ---- */
function getWeekStartStr() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
}
function getWeekEndStr() {
  const d = new Date(getWeekStartStr()+'T00:00:00');
  d.setDate(d.getDate() + 6);
  return toDateStr(d);
}

function convertToVND(tx) {
  const finSettings = getFinanceSettings();
  if (tx.currency === 'USD') {
    return tx.amount * (finSettings.exchangeRate || 25000);
  }
  return tx.amount;
}

function formatMoney(amount, currency) {
  if (currency === 'USD') return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount.toLocaleString('vi-VN') + ' ₫';
}
function formatMoneyShort(amount) {
  if (amount >= 1000000000) return (amount/1000000000).toFixed(1) + 'tỷ';
  if (amount >= 1000000) return (amount/1000000).toFixed(1) + 'tr';
  if (amount >= 1000) return (amount/1000).toFixed(0) + 'k';
  return amount.toLocaleString('vi-VN');
}

function formatViDateStr2(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][d.getDay()];
  return `${dow}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

// Dashboard finance stat helper
function getFinanceSummaryThisMonth() {
  const ym = today().slice(0,7);
  const txs = getTransactions().filter(t => t.date.startsWith(ym));
  const inc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+convertToVND(t),0);
  const exp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+convertToVND(t),0);
  return { inc, exp, balance: inc - exp };
}
