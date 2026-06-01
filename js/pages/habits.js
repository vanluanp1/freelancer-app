/* ============================================
   HABITS.JS — Habit Tracker
   ============================================ */

let _habitView = 'today'; // 'today' | 'stats' | 'manage'

function renderHabits() {
  return `
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">🌱 Thói quen</h1>
        <p class="page-subtitle">Xây dựng thói quen tốt mỗi ngày</p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="switchHabitView('manage')">⚙️ Quản lý</button>
    </div>
  </div>
  <div class="page-body">
    <div class="tabs mb-4">
      <button class="tab-btn ${_habitView==='today'?'active':''}" onclick="switchHabitView('today')">📅 Hôm nay</button>
      <button class="tab-btn ${_habitView==='stats'?'active':''}" onclick="switchHabitView('stats')">📊 Thống kê</button>
      <button class="tab-btn ${_habitView==='manage'?'active':''}" onclick="switchHabitView('manage')">⚙️ Quản lý</button>
    </div>
    <div id="habit-view-content">
      ${renderHabitViewContent()}
    </div>
  </div>`;
}

function renderHabitViewContent() {
  if (_habitView === 'today') return renderHabitToday();
  if (_habitView === 'stats') return renderHabitStats();
  return renderHabitManage();
}

function switchHabitView(v) {
  _habitView = v;
  const el = document.getElementById('habit-view-content');
  if (el) {
    el.innerHTML = renderHabitViewContent();
    document.querySelectorAll('.tabs .tab-btn').forEach((b, i) => {
      b.classList.toggle('active', ['today','stats','manage'][i] === v);
    });
    if (v === 'manage') initHabitSortable();
  } else {
    renderCurrentPage();
  }
}

// ---- Today View ----
function renderHabitToday() {
  const habits = getHabits().filter(h => !h.archived && isHabitDueToday(h));
  const todayStr = today();
  const done = habits.filter(h => h.completedDates.includes(todayStr)).length;

  return `
  <div class="flex items-center justify-between mb-4">
    <div>
      <span class="font-bold" style="font-size:16px">${done}/${habits.length} hoàn thành hôm nay</span>
      ${done === habits.length && habits.length > 0 ? ' 🎉' : ''}
    </div>
    <button class="btn btn-primary btn-sm" onclick="openAddHabitModal()">+ Thêm thói quen</button>
  </div>

  ${habits.length === 0 ? `
    <div class="no-data">
      <div class="no-data-icon">🌱</div>
      <p>Chưa có thói quen nào cho hôm nay</p>
      <br><button class="btn btn-primary" onclick="openAddHabitModal()">Thêm thói quen đầu tiên</button>
    </div>` :
    `<div class="habit-grid" id="habit-today-grid">
      ${habits.map(h => renderHabitButton(h, todayStr)).join('')}
    </div>`}

  <hr class="divider">
  ${renderHeatmap()}`;
}

function renderHabitButton(h, todayStr) {
  const done = h.completedDates.includes(todayStr);
  const streak = getHabitStreak(h);
  return `<button class="habit-btn ${done?'done':''}"
    id="habit-btn-${h.id}"
    style="${done ? `background:${h.color}25;border-color:${h.color}` : ''}"
    onclick="onHabitTick('${h.id}',this)">
    <span class="habit-emoji">${h.icon}</span>
    <span class="habit-name">${h.name}</span>
    <span class="habit-streak">🔥 ${streak} ngày</span>
  </button>`;
}

function onHabitTick(id, btnEl) {
  addRipple(btnEl, event);
  const habit = toggleHabit(id);
  if (!habit) return;
  const done = habit.completedDates.includes(today());
  if (done) {
    playHabitTick();
    showToast(`${habit.icon} ${habit.name} — Hoàn thành! 🎉`, 'success');
    btnEl.classList.add('done');
    btnEl.style.background = `${habit.color}25`;
    btnEl.style.borderColor = habit.color;
  } else {
    btnEl.classList.remove('done');
    btnEl.style.background = '';
    btnEl.style.borderColor = '';
    showToast(`${habit.icon} ${habit.name} — Đã bỏ tick`, 'info');
  }
  // Update streak
  const streak = getHabitStreak(habit);
  const streakEl = btnEl.querySelector('.habit-streak');
  if (streakEl) streakEl.textContent = `🔥 ${streak} ngày`;
  // Update done state indicator
  if (done) {
    if (!btnEl.querySelector('.done-check')) {
      const chk = document.createElement('span');
      chk.textContent = '✓';
      chk.style.cssText = 'position:absolute;top:8px;right:10px;font-size:14px;font-weight:700;color:'+habit.color;
      chk.className = 'done-check';
      btnEl.appendChild(chk);
    }
  } else {
    const chk = btnEl.querySelector('.done-check');
    if (chk) chk.remove();
  }
}

// ---- Heatmap ----
function renderHeatmap() {
  const habits = getHabits().filter(h => !h.archived);
  const today2 = new Date();
  // Current month
  const year = today2.getFullYear(), month = today2.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const habitColor = '#6C63FF';

  // Build calendar grid
  const cells = [];
  // Empty cells for start
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const total = habits.filter(h => isHabitDueOnDate(h, ds)).length;
    const done = habits.filter(h => h.completedDates.includes(ds)).length;
    const pct = total > 0 ? done / total : 0;
    const level = pct === 0 ? 0 : pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 1 ? 3 : 4;
    cells.push({ d, ds, level, done, total, pct });
  }

  const weekLabels = ['CN','T2','T3','T4','T5','T6','T7'];

  return `<div class="card">
    <div class="section-title mb-3"><span>🗓️</span> Tháng ${month+1}/${year}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:8px">
      ${weekLabels.map(l => `<div style="text-align:center;font-size:10px;color:var(--text-muted);font-weight:600">${l}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">
      ${cells.map(cell => {
        if (!cell) return `<div></div>`;
        const isToday = cell.ds === today();
        return `<div class="heatmap-cell" data-level="${cell.level}"
          style="background:${cell.level > 0 ? habitColor : 'var(--bg-card2)'};${isToday?'outline:2px solid var(--primary);':''}height:32px;border-radius:4px"
          title="${cell.ds}: ${cell.done}/${cell.total} thói quen">
          <div style="text-align:center;font-size:10px;line-height:32px;color:${cell.level>=3?'#fff':'var(--text-muted)'};font-weight:${isToday?700:400}">${cell.d}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:12px;font-size:11px;color:var(--text-muted)">
      <span>Ít</span>
      ${[0,1,2,3,4].map(l => `<div style="width:12px;height:12px;border-radius:2px;background:${l===0?'var(--bg-card2)':habitColor};opacity:${l===0?1:[0.25,0.5,0.75,1][l-1]}"></div>`).join('')}
      <span>Nhiều</span>
    </div>
  </div>`;
}

function isHabitDueOnDate(habit, dateStr) {
  if (habit.frequency === 'daily') return true;
  const dow = new Date(dateStr).getDay();
  return (habit.weekDays || []).includes(dow);
}

// ---- Stats View ----
function renderHabitStats() {
  const habits = getHabits().filter(h => !h.archived);
  const today2 = new Date();

  return `
  ${habits.length === 0 ? '<div class="no-data"><div class="no-data-icon">📊</div><p>Chưa có dữ liệu</p></div>' :
    habits.map(h => {
      const last7 = Array.from({length:7}, (_, i) => {
        const d = new Date(today2); d.setDate(today2.getDate() - (6-i));
        return toDateStr(d);
      });
      const done7 = last7.filter(ds => h.completedDates.includes(ds) && isHabitDueOnDate(h, ds)).length;
      const due7 = last7.filter(ds => isHabitDueOnDate(h, ds)).length;
      const pct7 = due7 > 0 ? Math.round(done7 / due7 * 100) : 0;
      const streak = getHabitStreak(h);
      const color = h.color || 'var(--primary)';

      return `<div class="card mb-3">
        <div class="flex items-center gap-3 mb-3">
          <span style="font-size:28px">${h.icon}</span>
          <div class="flex-1">
            <div class="font-bold" style="font-size:14px">${h.name}</div>
            <div class="text-sm text-muted">Streak hiện tại: 🔥 ${streak} ngày</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:700;color:${color}">${pct7}%</div>
            <div class="text-sm text-muted">7 ngày qua</div>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct7}%;background:${color}"></div>
        </div>
        <div class="flex gap-2 mt-2">
          ${last7.map(ds => {
            const done = h.completedDates.includes(ds) && isHabitDueOnDate(h, ds);
            const due = isHabitDueOnDate(h, ds);
            return `<div style="flex:1;height:28px;border-radius:4px;background:${done?color:due?'var(--bg-card2)':'transparent'};border:1px solid ${due?'var(--border)':'transparent'}" title="${ds}"></div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}`;
}

// ---- Manage View ----
function renderHabitManage() {
  const habits = getHabits();
  return `
  <div class="flex items-center justify-between mb-4">
    <h3 class="section-title" style="margin:0"><span>⚙️</span> Quản lý thói quen</h3>
    <button class="btn btn-primary btn-sm" onclick="openAddHabitModal()">+ Thêm thói quen</button>
  </div>
  <div id="habit-manage-list">
    ${habits.length === 0 ? '<div class="no-data"><p>Chưa có thói quen nào</p></div>' :
      habits.map(h => `
        <div class="card mb-2 flex items-center gap-3" draggable="true" data-id="${h.id}">
          <span style="font-size:24px;cursor:grab">⠿</span>
          <span style="font-size:24px">${h.icon}</span>
          <div class="flex-1">
            <div class="font-bold" style="font-size:13px">${h.name}</div>
            <div class="text-sm text-muted">${h.frequency === 'daily' ? 'Hàng ngày' : `${h.weekDays?.length || 0} ngày/tuần`}${h.archived ? ' — 📦 Đã archive' : ''}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" onclick="openEditHabitModal('${h.id}')">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleArchiveHabit('${h.id}')">${h.archived ? '↩️' : '📦'}</button>
            <button class="btn btn-ghost btn-sm" onclick="confirmDeleteHabit('${h.id}')">🗑️</button>
          </div>
        </div>`).join('')}
  </div>`;
}

function initHabitSortable() {
  const list = document.getElementById('habit-manage-list');
  if (!list) return;
  initSortable(list, ids => {
    const habits = getHabits();
    const sorted = ids.map((id, i) => { const h = habits.find(h => h.id === id); if (h) h.order = i; return h; }).filter(Boolean);
    saveHabits(sorted);
    showToast('Đã sắp xếp lại!', 'success');
  });
}

function toggleArchiveHabit(id) {
  const h = getHabits().find(h => h.id === id);
  if (h) { updateHabit(id, { archived: !h.archived }); }
  switchHabitView('manage');
  showToast(h?.archived ? 'Đã khôi phục thói quen!' : 'Đã archive thói quen!', 'info');
}

function confirmDeleteHabit(id) {
  if (confirm('Xóa thói quen này? Toàn bộ lịch sử cũng sẽ bị xóa.')) {
    deleteHabit(id);
    switchHabitView('manage');
    showToast('Đã xóa thói quen!', 'info');
  }
}

// ---- Add/Edit Habit Modal ----
function openAddHabitModal() { openHabitModal(null); }
function openEditHabitModal(id) { openHabitModal(id); }

const HABIT_ICONS = ['💧','🏃','📚','🧘','💪','🥗','😴','✍️','🎯','💻','🎨','🎵','📓','🌿','🧹','💊','🧠','☀️','🚶','🛁'];
const HABIT_COLORS = ['#6C63FF','#FF6B6B','#FFA502','#2ED573','#54A0FF','#FF9F43','#48DBFB','#1DD1A1'];

function openHabitModal(id) {
  const h = id ? getHabits().find(h => h.id === id) : null;
  const dow = [0,1,2,3,4,5,6];
  const dowNames = ['CN','T2','T3','T4','T5','T6','T7'];
  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">${id ? '✏️ Sửa thói quen' : '🌱 Thêm thói quen'}</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Tên thói quen *</label>
        <input id="hm-name" class="form-input" value="${h?.name||''}" placeholder="VD: Uống 2L nước...">
      </div>
      <div class="form-group">
        <label class="form-label">Icon</label>
        <div id="hm-icon-picker" class="emoji-selector" data-selected="${h?.icon||HABIT_ICONS[0]}">
          ${HABIT_ICONS.map(ic => `<span class="emoji-option ${(h?.icon||HABIT_ICONS[0])===ic?'selected':''}" data-icon="${ic}" onclick="selectHabitIcon('${ic}')">${ic}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Màu sắc</label>
        <div id="hm-color-swatches" data-selected="${h?.color||HABIT_COLORS[0]}">
          ${HABIT_COLORS.map(c => `<div class="color-swatch ${(h?.color||HABIT_COLORS[0])===c?'selected':''}" style="background:${c}" data-color="${c}" onclick="selectHabitColor('${c}',this)"></div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tần suất</label>
        <select id="hm-freq" class="form-select" onchange="onHabitFreqChange()">
          <option value="daily" ${(!h||h.frequency==='daily')?'selected':''}>Hàng ngày</option>
          <option value="weekly" ${h?.frequency==='weekly'?'selected':''}>Chọn ngày trong tuần</option>
        </select>
      </div>
      <div id="hm-weekdays" style="${(!h||h.frequency==='daily')?'display:none':''};display:flex;gap:6px;flex-wrap:wrap">
        ${dow.map(d => `<label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
          <input type="checkbox" ${(h?.weekDays||[]).includes(d)?'checked':''} value="${d}" class="hm-dow">
          <span class="text-sm">${dowNames[d]}</span>
        </label>`).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitHabitModal('${id||''}')">
        ${id ? 'Lưu' : 'Thêm'}
      </button>
    </div>
  </div>`);

  document.querySelectorAll('#hm-color-swatches .color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#hm-color-swatches .color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      document.getElementById('hm-color-swatches').dataset.selected = sw.dataset.color;
    });
  });
}

function selectHabitIcon(icon) {
  document.querySelectorAll('#hm-icon-picker .emoji-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.icon === icon);
  });
  document.getElementById('hm-icon-picker').dataset.selected = icon;
}

function selectHabitColor(color, el) {
  document.querySelectorAll('#hm-color-swatches .color-swatch').forEach(sw => sw.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('hm-color-swatches').dataset.selected = color;
}

function onHabitFreqChange() {
  const freq = document.getElementById('hm-freq')?.value;
  const wd = document.getElementById('hm-weekdays');
  if (wd) wd.style.display = freq === 'weekly' ? 'flex' : 'none';
}

function submitHabitModal(id) {
  const name = document.getElementById('hm-name')?.value.trim();
  if (!name) { showToast('Vui lòng nhập tên!', 'error'); return; }
  const icon = document.getElementById('hm-icon-picker')?.dataset.selected || '🌱';
  const color = document.getElementById('hm-color-swatches')?.dataset.selected || HABIT_COLORS[0];
  const frequency = document.getElementById('hm-freq')?.value || 'daily';
  const weekDays = [...document.querySelectorAll('.hm-dow:checked')].map(el => parseInt(el.value));
  const data = { name, icon, color, frequency, weekDays };
  if (id) { updateHabit(id, data); showToast('Đã cập nhật!', 'success'); }
  else { addHabit(data); showToast('Đã thêm thói quen!', 'success'); }
  closeModal();
  renderCurrentPage();
}
