/* ============================================
   TIME.JS — Pomodoro + Time Tracker + Weekly Calendar
   ============================================ */

let _timeTab = 'pomodoro';

// ---- Pomodoro State ----
window._pomodoroState = {
  running: false, paused: false,
  mode: 'work',       // 'work' | 'short-break' | 'long-break'
  remaining: 0,       // seconds
  total: 0,
  pomosInCycle: 0,
  taskId: null, taskName: '',
  _interval: null,
};

// ---- Time Tracker State ----
window._trackerState = {
  running: false,
  startTime: null,
  elapsed: 0,
  taskId: null, projectId: null,
  _interval: null,
};

function renderTime() {
  return `
  <div class="page-header">
    <h1 class="page-title">⏱️ Thời gian</h1>
    <p class="page-subtitle">Pomodoro, theo dõi thời gian và lên lịch tuần</p>
  </div>
  <div class="page-body">
    <div class="tabs mb-4" id="time-tabs">
      <button class="tab-btn ${_timeTab==='pomodoro'?'active':''}" onclick="switchTimeTab('pomodoro')">🍅 Pomodoro</button>
      <button class="tab-btn ${_timeTab==='tracker'?'active':''}" onclick="switchTimeTab('tracker')">⏱️ Time Tracker</button>
      <button class="tab-btn ${_timeTab==='schedule'?'active':''}" onclick="switchTimeTab('schedule')">📅 Lịch tuần</button>
    </div>
    <div id="time-tab-content">
      ${renderTimeTabContent()}
    </div>
  </div>`;
}

function switchTimeTab(tab) {
  _timeTab = tab;
  const content = document.getElementById('time-tab-content');
  if (content) {
    content.innerHTML = renderTimeTabContent();
    document.querySelectorAll('#time-tabs .tab-btn').forEach((b, i) => {
      b.classList.toggle('active', ['pomodoro','tracker','schedule'][i] === tab);
    });
    if (tab === 'pomodoro') afterRenderPomodoro();
    if (tab === 'tracker') afterRenderTracker();
    if (tab === 'schedule') afterRenderSchedule();
  } else {
    renderCurrentPage();
  }
}

function renderTimeTabContent() {
  if (_timeTab === 'pomodoro') return renderPomodoro();
  if (_timeTab === 'tracker') return renderTracker();
  if (_timeTab === 'schedule') return renderSchedule();
  return '';
}

// ============================================================
// POMODORO
// ============================================================
function renderPomodoro() {
  const pd = getPomodoroData();
  const s = pd.settings;
  const st = window._pomodoroState;
  if (!st.running && !st.paused && st.remaining === 0) {
    st.remaining = s.workMin * 60;
    st.total = s.workMin * 60;
    st.mode = 'work';
  }
  const pct = st.total > 0 ? ((st.total - st.remaining) / st.total) * 100 : 0;
  const r = 104, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const modeLabel = { work: '🍅 Làm việc', 'short-break': '☕ Nghỉ ngắn', 'long-break': '🛋️ Nghỉ dài' }[st.mode];
  const tasks = getTasks().filter(t => !t.completedAt);

  const pomoDots = Array.from({length: s.longBreakAfter || 4}, (_, i) => {
    const cls = i < st.pomosInCycle ? 'done' : (i === st.pomosInCycle && st.mode === 'work' && st.running ? 'current' : '');
    return `<div class="pomo-dot ${cls}"></div>`;
  }).join('');

  return `
  <div style="max-width:480px;margin:0 auto">
    <!-- Timer -->
    <div class="pomodoro-timer-wrapper">
      <!-- Mode Selector -->
      <div class="timer-modes">
        <button class="timer-mode-btn ${st.mode==='work'?'active':''}" onclick="switchPomoMode('work')">🍅 Làm việc</button>
        <button class="timer-mode-btn ${st.mode==='short-break'?'active':''}" onclick="switchPomoMode('short-break')">☕ Nghỉ ngắn</button>
        <button class="timer-mode-btn ${st.mode==='long-break'?'active':''}" onclick="switchPomoMode('long-break')">🛋️ Nghỉ dài</button>
      </div>

      <!-- Circle Timer -->
      <div class="timer-circle-container ${st.mode} ${st.running?'running':''}" id="timer-container">
        <svg width="240" height="240" viewBox="0 0 240 240">
          <circle class="circle-track" cx="120" cy="120" r="${r}" stroke-width="8"/>
          <circle class="circle-fill" cx="120" cy="120" r="${r}" stroke-width="8"
            stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
            id="timer-progress-circle"/>
        </svg>
        <div class="timer-display">
          <div class="timer-time" id="pomo-time-display">${formatDuration(st.remaining)}</div>
          <div class="timer-label">${modeLabel}</div>
        </div>
      </div>

      <!-- Pomo Dots -->
      <div class="pomo-dots">${pomoDots}</div>

      <!-- Task Select -->
      <div style="width:100%">
        <select id="pomo-task-select" class="form-select" onchange="onPomoTaskChange()" style="max-width:100%">
          <option value="">— Không gắn task —</option>
          ${tasks.map(t => `<option value="${t.id}" ${st.taskId===t.id?'selected':''}>${escapeHtml(t.title)}</option>`).join('')}
        </select>
      </div>

      <!-- Controls -->
      <div class="timer-controls">
        <button class="timer-btn timer-btn-secondary" title="Reset" onclick="resetPomodoro()">↺</button>
        <button class="timer-btn timer-btn-main" id="pomo-main-btn" onclick="togglePomodoro()">
          ${st.running ? '⏸' : '▶'}
        </button>
        <button class="timer-btn timer-btn-secondary" title="Bỏ qua" onclick="skipPomoPhase()">⏭</button>
      </div>
    </div>

    <!-- Stats Today -->
    <div class="card mb-4">
      <div class="section-title mb-3"><span>📊</span> Hôm nay</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
        <div>
          <div style="font-size:22px;font-weight:700;color:var(--pomodoro)">${pd.todayCount}</div>
          <div class="text-muted text-sm">🍅 Pomodoro</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:700;color:var(--habit)">🔥${pd.streak}</div>
          <div class="text-muted text-sm">Ngày streak</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:700">${formatHours(getTodayWorkedSeconds())}</div>
          <div class="text-muted text-sm">Tổng giờ</div>
        </div>
      </div>
    </div>

    <!-- Settings -->
    <div class="collapsible">
      <div class="collapsible-header">⚙️ Cài đặt Pomodoro <span class="chevron">▼</span></div>
      <div class="collapsible-body">
        <div class="form-group">
          <label class="form-label">Thời gian làm việc: <b id="work-min-val">${s.workMin}</b> phút</label>
          <div class="slider-wrap">
            <span class="text-sm text-muted">5</span>
            <input type="range" class="range-slider" min="5" max="60" value="${s.workMin}" id="work-min-slider"
              oninput="document.getElementById('work-min-val').textContent=this.value">
            <span class="text-sm text-muted">60</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nghỉ ngắn: <b id="sb-val">${s.shortBreakMin}</b> phút</label>
          <div class="slider-wrap">
            <span class="text-sm text-muted">1</span>
            <input type="range" class="range-slider" min="1" max="15" value="${s.shortBreakMin}" id="sb-slider"
              oninput="document.getElementById('sb-val').textContent=this.value">
            <span class="text-sm text-muted">15</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nghỉ dài: <b id="lb-val">${s.longBreakMin}</b> phút</label>
          <div class="slider-wrap">
            <span class="text-sm text-muted">5</span>
            <input type="range" class="range-slider" min="5" max="30" value="${s.longBreakMin}" id="lb-slider"
              oninput="document.getElementById('lb-val').textContent=this.value">
            <span class="text-sm text-muted">30</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Số pomodoro trước nghỉ dài</label>
          <div style="display:flex;gap:8px">
            ${[2,3,4].map(n => `<button class="btn ${(s.longBreakAfter||4)===n?'btn-primary':'btn-ghost'} btn-sm" onclick="setLongBreakAfter(${n})">${n}</button>`).join('')}
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Tự động bắt đầu nghỉ</div></div>
          <label class="toggle-switch"><input type="checkbox" id="auto-break" ${s.autoStartBreak?'checked':''}><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Tự động bắt đầu pomodoro tiếp</div></div>
          <label class="toggle-switch"><input type="checkbox" id="auto-work" ${s.autoStartWork?'checked':''}><span class="toggle-slider"></span></label>
        </div>
        <div class="mt-2">
          <button class="btn btn-primary btn-sm" onclick="savePomoSettings()">Lưu cài đặt</button>
        </div>
      </div>
    </div>
  </div>`;
}

function afterRenderPomodoro() {
  initCollapsibles();
  // Reconnect live timer if running
  if (window._pomodoroState.running) {
    startPomoInterval();
  }
}

function onPomoTaskChange() {
  const sel = document.getElementById('pomo-task-select');
  if (!sel) return;
  const taskId = sel.value || null;
  const task = taskId ? getTaskById(taskId) : null;
  window._pomodoroState.taskId = taskId;
  window._pomodoroState.taskName = task ? task.title : '';
}

function togglePomodoro() {
  const st = window._pomodoroState;
  if (st.running) {
    // Pause
    clearInterval(st._interval);
    st.running = false;
    st.paused = true;
    updatePomoUI();
  } else {
    // Start / Resume
    if (!st.paused) {
      // Fresh start
      const pd = getPomodoroData();
      const secs = {
        work: pd.settings.workMin * 60,
        'short-break': pd.settings.shortBreakMin * 60,
        'long-break': pd.settings.longBreakMin * 60,
      }[st.mode] || pd.settings.workMin * 60;
      st.remaining = secs;
      st.total = secs;
    }
    st.running = true;
    st.paused = false;
    requestNotifPermission();
    startPomoInterval();
    updatePomoUI();
  }
}

function startPomoInterval() {
  const st = window._pomodoroState;
  clearInterval(st._interval);
  st._interval = setInterval(() => {
    if (st.remaining <= 0) {
      clearInterval(st._interval);
      onPomoPhaseEnd();
      return;
    }
    st.remaining--;
    updatePomoUI();
  }, 1000);
}

function updatePomoUI() {
  const st = window._pomodoroState;
  const timeEl = document.getElementById('pomo-time-display');
  if (timeEl) timeEl.textContent = formatDuration(st.remaining);
  const btn = document.getElementById('pomo-main-btn');
  if (btn) btn.textContent = st.running ? '⏸' : '▶';
  // Progress circle
  const circleEl = document.getElementById('timer-progress-circle');
  if (circleEl && st.total > 0) {
    const r = 104, circ = 2 * Math.PI * r;
    const offset = circ * ((st.remaining) / st.total);
    circleEl.setAttribute('stroke-dashoffset', offset.toFixed(2));
  }
  // Container mode class
  const container = document.getElementById('timer-container');
  if (container) {
    container.className = `timer-circle-container ${st.mode} ${st.running ? 'running' : ''}`;
  }
  // Dashboard widget
  const dashTime = document.getElementById('dash-pomo-time');
  if (dashTime) dashTime.textContent = formatDuration(st.remaining);
}

function onPomoPhaseEnd() {
  const st = window._pomodoroState;
  st.running = false;
  st.paused = false;
  const pd = getPomodoroData();

  if (st.mode === 'work') {
    playWorkComplete();
    sendNotification('🍅 Pomodoro hoàn thành!', `Đã đến lúc nghỉ ngơi!`);
    recordPomodoro(st.taskId, null);
    st.pomosInCycle++;
    // Auto switch to break
    const isLongBreak = st.pomosInCycle >= (pd.settings.longBreakAfter || 4);
    const nextMode = isLongBreak ? 'long-break' : 'short-break';
    if (isLongBreak) st.pomosInCycle = 0;
    if (pd.settings.autoStartBreak) {
      st.mode = nextMode;
      st.remaining = (isLongBreak ? pd.settings.longBreakMin : pd.settings.shortBreakMin) * 60;
      st.total = st.remaining;
      st.running = true;
      startPomoInterval();
    } else {
      if (confirm(`🍅 Pomodoro hoàn thành! Bắt đầu ${isLongBreak ? 'nghỉ dài 🛋️' : 'nghỉ ngắn ☕'} không?`)) {
        st.mode = nextMode;
        st.remaining = (isLongBreak ? pd.settings.longBreakMin : pd.settings.shortBreakMin) * 60;
        st.total = st.remaining;
        st.running = true;
        startPomoInterval();
      }
    }
  } else {
    playBreakComplete();
    sendNotification('☕ Hết giờ nghỉ!', 'Sẵn sàng cho pomodoro tiếp theo?');
    if (pd.settings.autoStartWork) {
      st.mode = 'work';
      st.remaining = pd.settings.workMin * 60;
      st.total = st.remaining;
      st.running = true;
      startPomoInterval();
    } else {
      if (confirm('Hết giờ nghỉ! Bắt đầu pomodoro tiếp theo không?')) {
        st.mode = 'work';
        st.remaining = pd.settings.workMin * 60;
        st.total = st.remaining;
        st.running = true;
        startPomoInterval();
      }
    }
  }
  // Re-render if on pomodoro tab
  if (_timeTab === 'pomodoro') {
    const content = document.getElementById('time-tab-content');
    if (content) { content.innerHTML = renderPomodoro(); afterRenderPomodoro(); }
  }
}

function resetPomodoro() {
  const st = window._pomodoroState;
  clearInterval(st._interval);
  st.running = false; st.paused = false;
  const pd = getPomodoroData();
  const secs = { work: pd.settings.workMin*60, 'short-break': pd.settings.shortBreakMin*60, 'long-break': pd.settings.longBreakMin*60 }[st.mode];
  st.remaining = secs; st.total = secs;
  updatePomoUI();
}

function skipPomoPhase() {
  clearInterval(window._pomodoroState._interval);
  window._pomodoroState.remaining = 0;
  onPomoPhaseEnd();
}

function switchPomoMode(mode) {
  const st = window._pomodoroState;
  clearInterval(st._interval);
  st.running = false; st.paused = false; st.mode = mode;
  const pd = getPomodoroData();
  const secs = { work: pd.settings.workMin*60, 'short-break': pd.settings.shortBreakMin*60, 'long-break': pd.settings.longBreakMin*60 }[mode];
  st.remaining = secs; st.total = secs;
  const content = document.getElementById('time-tab-content');
  if (content) { content.innerHTML = renderPomodoro(); afterRenderPomodoro(); }
}

function setLongBreakAfter(n) {
  const pd = getPomodoroData();
  pd.settings.longBreakAfter = n;
  savePomodoroData(pd);
  const content = document.getElementById('time-tab-content');
  if (content) { content.innerHTML = renderPomodoro(); afterRenderPomodoro(); }
}

function savePomoSettings() {
  const pd = getPomodoroData();
  pd.settings.workMin = parseInt(document.getElementById('work-min-slider')?.value) || 25;
  pd.settings.shortBreakMin = parseInt(document.getElementById('sb-slider')?.value) || 5;
  pd.settings.longBreakMin = parseInt(document.getElementById('lb-slider')?.value) || 15;
  pd.settings.autoStartBreak = document.getElementById('auto-break')?.checked || false;
  pd.settings.autoStartWork = document.getElementById('auto-work')?.checked || false;
  savePomodoroData(pd);
  // Reset timer with new settings
  const st = window._pomodoroState;
  if (!st.running) {
    st.remaining = pd.settings.workMin * 60;
    st.total = st.remaining;
  }
  showToast('Đã lưu cài đặt Pomodoro!', 'success');
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🍅' });
  }
}

// ============================================================
// TIME TRACKER
// ============================================================
function renderTracker() {
  const st = window._trackerState;
  const elapsed = st.running ? Math.floor((Date.now() - st.startTime) / 1000) + st.elapsed : st.elapsed;
  const tasks = getTasks().filter(t => !t.completedAt);
  const projects = getProjects();
  const logs = getTimeLogs().sort((a,b) => b.startTime > a.startTime ? 1 : -1);

  // Group logs by date
  const grouped = {};
  logs.forEach(l => { (grouped[l.date] = grouped[l.date] || []).push(l); });

  return `
  <div class="tracker-display">
    <div class="tracker-time ${st.running?'running':''}" id="tracker-time">${formatDuration(elapsed)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:400px">
      <select id="tracker-task" class="form-select" ${st.running?'disabled':''}>
        <option value="">— Chọn task —</option>
        ${tasks.map(t => `<option value="${t.id}" ${st.taskId===t.id?'selected':''}>${escapeHtml(t.title)}</option>`).join('')}
      </select>
      <select id="tracker-project" class="form-select" ${st.running?'disabled':''}>
        <option value="">— Chọn dự án —</option>
        ${projects.map(p => `<option value="${p.id}" ${st.projectId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>
    </div>
    <button class="tracker-start-btn ${st.running?'running':''}" onclick="toggleTracker()">
      ${st.running ? '⏹ DỪNG' : '▶ BẮT ĐẦU'}
    </button>
  </div>

  <div class="card mt-3">
    <div class="section-title mb-3"><span>📋</span> Lịch sử Time Log</div>
    ${Object.keys(grouped).length === 0 ? '<div class="no-data" style="padding:20px 0"><p>Chưa có log nào</p></div>' :
      `<div style="overflow-x:auto">
        <table class="log-table">
          <thead><tr>
            <th>Task</th><th>Dự án</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thời gian</th><th>Loại</th><th></th>
          </tr></thead>
          <tbody>
            ${Object.entries(grouped).map(([date, dayLogs]) => {
              const total = dayLogs.reduce((s,l) => s+l.duration,0);
              return `<tr class="log-group-header"><td colspan="7">${formatViDate(new Date(date))} — Tổng: ${formatHours(total)}</td></tr>
              ${dayLogs.map(l => {
                const task = l.taskId ? getTaskById(l.taskId) : null;
                const proj = l.projectId ? getProjectById(l.projectId) : null;
                return `<tr>
                  <td>${task ? escapeHtml(task.title) : '—'}</td>
                  <td>${proj ? `<span style="color:${safeCssColor(proj.color)}">● ${escapeHtml(proj.name)}</span>` : '—'}</td>
                  <td>${l.startTime ? formatDateTime(l.startTime) : '—'}</td>
                  <td>${l.endTime ? formatDateTime(l.endTime) : '—'}</td>
                  <td><b>${formatDuration(l.duration)}</b></td>
                  <td>${l.type==='pomodoro' ? '🍅' : '⏱️'}</td>
                  <td><button class="btn-icon text-muted" onclick="deleteLogEntry('${l.id}')" title="Xóa">✕</button></td>
                </tr>`;
              }).join('')}`;
            }).join('')}
          </tbody>
        </table>
      </div>`}
  </div>`;
}

function afterRenderTracker() {
  if (window._trackerState.running) startTrackerInterval();
}

function toggleTracker() {
  const st = window._trackerState;
  if (st.running) {
    // Stop
    clearInterval(st._interval);
    const elapsed = Math.floor((Date.now() - st.startTime) / 1000) + st.elapsed;
    const taskId = st.taskId;
    const projectId = st.projectId;
    addTimeLog({
      taskId, projectId,
      startTime: new Date(st.startTime).toISOString(),
      endTime: now(),
      duration: elapsed,
      type: 'manual',
    });
    st.running = false; st.elapsed = 0; st.startTime = null; st.taskId = null; st.projectId = null;
    showToast(`Đã lưu ${formatDuration(elapsed)}!`, 'success');
    const content = document.getElementById('time-tab-content');
    if (content) content.innerHTML = renderTracker();
  } else {
    // Start
    st.taskId = document.getElementById('tracker-task')?.value || null;
    st.projectId = document.getElementById('tracker-project')?.value || null;
    st.startTime = Date.now();
    st.elapsed = 0;
    st.running = true;
    startTrackerInterval();
    const btn = document.querySelector('.tracker-start-btn');
    if (btn) { btn.classList.add('running'); btn.textContent = '⏹ DỪNG'; }
    const timeEl = document.getElementById('tracker-time');
    if (timeEl) timeEl.classList.add('running');
    // Disable selects
    document.getElementById('tracker-task')?.setAttribute('disabled', 'true');
    document.getElementById('tracker-project')?.setAttribute('disabled', 'true');
  }
}

function startTrackerInterval() {
  const st = window._trackerState;
  clearInterval(st._interval);
  st._interval = setInterval(() => {
    const el = document.getElementById('tracker-time');
    if (el) {
      const elapsed = Math.floor((Date.now() - st.startTime) / 1000) + st.elapsed;
      el.textContent = formatDuration(elapsed);
    }
  }, 1000);
}

function deleteLogEntry(id) {
  if (confirm('Xóa log này?')) {
    deleteTimeLog(id);
    const content = document.getElementById('time-tab-content');
    if (content) content.innerHTML = renderTracker();
  }
}

// ============================================================
// WEEKLY SCHEDULE
// ============================================================
let _weekOffset = 0;

function renderSchedule() {
  const settings = getSettings();
  const days = getWeekDays(_weekOffset);
  const todayStr = today();
  const startH = parseInt((settings.workHoursStart||'08:00').split(':')[0]);
  const endH = parseInt((settings.workHoursEnd||'18:00').split(':')[0]);
  const HOURS = Array.from({length:17}, (_, i) => i + 6); // 6-22
  const blocks = getSchedule();
  const allTasks = getTasks().filter(t => !t.completedAt);

  // Tasks without schedule
  const scheduledTaskIds = blocks.map(b => b.taskId);
  const unscheduled = allTasks.filter(t => !scheduledTaskIds.includes(t.id));

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <button class="btn btn-ghost btn-sm" onclick="changeWeek(-1)">← Tuần trước</button>
    <button class="btn btn-ghost btn-sm" onclick="changeWeek(0)">Tuần này</button>
    <button class="btn btn-ghost btn-sm" onclick="changeWeek(1)">Tuần sau →</button>
  </div>
  <div class="weekly-layout">
    <div class="weekly-grid">
      <!-- Header -->
      <div class="weekly-header" style="grid-template-columns:50px repeat(7,1fr)">
        <div style="border-right:1px solid var(--border)"></div>
        ${days.map(d => {
          const ds = toDateStr(d);
          const isToday = ds === todayStr;
          return `<div class="weekly-col-header ${isToday?'today':''}">
            <div style="font-size:11px">${VI_DAYS[d.getDay()]}</div>
            <div style="font-size:16px;font-weight:${isToday?700:400}">${d.getDate()}</div>
          </div>`;
        }).join('')}
      </div>
      <!-- Body -->
      <div style="display:grid;grid-template-columns:50px repeat(7,1fr)">
        ${HOURS.map(h => `
          <div class="weekly-time-col" style="height:48px;line-height:48px">${h}:00</div>
          ${days.map(d => {
            const ds = toDateStr(d);
            const isWork = h >= startH && h < endH;
            const dayBlocks = blocks.filter(b => {
              if (b.date !== ds) return false;
              const bh = new Date(b.startTime).getHours();
              return bh === h;
            });
            return `<div class="weekly-cell ${isWork?'work-hours':''}" data-date="${ds}" data-hour="${h}"
              ondragover="event.preventDefault()" ondrop="onScheduleDrop(event,'${ds}',${h})">
              ${dayBlocks.map(b => {
                const proj = b.projectId ? getProjectById(b.projectId) : null;
                const color = proj ? proj.color : 'var(--primary)';
                const dur = b.duration || 60;
                const heightPx = (dur / 60) * 48;
                return `<div class="weekly-block" style="background:${color};height:${Math.max(24,heightPx)}px"
                  title="${escapeHtml(b.title||'')}" onclick="deleteScheduleBlockUI('${b.id}')">
                  ${escapeHtml(b.title||'')}
                </div>`;
              }).join('')}
            </div>`;
          }).join('')}
        `).join('')}
      </div>
    </div>

    <!-- Unscheduled Tasks -->
    <div class="unscheduled-list">
      <div class="section-title mb-2"><span>📋</span> Chưa lên lịch</div>
      ${unscheduled.length === 0 ? '<p class="text-sm text-muted">Tất cả task đã lên lịch!</p>' :
        unscheduled.map(t => {
          const proj = t.projectId ? getProjectById(t.projectId) : null;
          return `<div class="unscheduled-task" draggable="true" data-task-id="${t.id}"
            ondragstart="onUnscheduledDragStart(event,'${t.id}')" style="border-left:3px solid ${safeCssColor(proj?proj.color:'var(--border)', 'var(--border)')}">
            ${escapeHtml(t.title)}
          </div>`;
        }).join('')}
    </div>
  </div>`;
}

function afterRenderSchedule() {}

function changeWeek(dir) {
  if (dir === 0) _weekOffset = 0;
  else _weekOffset += dir;
  const content = document.getElementById('time-tab-content');
  if (content) content.innerHTML = renderSchedule();
}

let _dragTaskId = null;
function onUnscheduledDragStart(e, taskId) {
  _dragTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
}
function onScheduleDrop(e, date, hour) {
  e.preventDefault();
  if (!_dragTaskId) return;
  const task = getTaskById(_dragTaskId);
  if (!task) return;
  const startTime = new Date(date + 'T' + String(hour).padStart(2,'0') + ':00:00').toISOString();
  const endTime = new Date(date + 'T' + String(hour+1).padStart(2,'0') + ':00:00').toISOString();
  addScheduleBlock({ taskId: _dragTaskId, title: task.title, date, startTime, endTime, duration: 60, projectId: task.projectId });
  _dragTaskId = null;
  const content = document.getElementById('time-tab-content');
  if (content) content.innerHTML = renderSchedule();
  showToast('Đã lên lịch task!', 'success');
}
function deleteScheduleBlockUI(id) {
  if (confirm('Xóa lịch này?')) {
    deleteScheduleBlock(id);
    const content = document.getElementById('time-tab-content');
    if (content) content.innerHTML = renderSchedule();
  }
}
