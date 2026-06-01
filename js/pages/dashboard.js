/* ============================================
   DASHBOARD.JS
   ============================================ */

function renderDashboard() {
  // Chạy recurring engine trước để đảm bảo task lặp lại hôm nay luôn tồn tại
  processRecurringTasks();

  const settings = getSettings();
  const tasks = getTasks();
  const projects = getProjects().filter(p => p.status === 'active');
  const habits = getHabits().filter(h => !h.archived && isHabitDueToday(h));
  const pomData = getPomodoroData();
  const todayStr = today();

  // Stats
  const todayTasks = tasks.filter(t => t.deadline && t.deadline.slice(0,10) === todayStr);
  const doneTodayTasks = todayTasks.filter(t => t.completedAt && t.completedAt.slice(0,10) === todayStr);
  const todayHabitsDone = habits.filter(h => h.completedDates.includes(todayStr)).length;
  const workedSec = getTodayWorkedSeconds();
  const finSummary = (typeof getFinanceSummaryThisMonth === 'function') ? getFinanceSummaryThisMonth() : { inc:0, exp:0, balance:0 };

  // "Cần làm hôm nay": tổng hợp 3 nguồn, sắp xếp theo độ ưu tiên
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const upcomingTasks = tasks
    .filter(t => !t.completedAt && (
      (t.deadline && t.deadline.slice(0,10) === todayStr) ||   // deadline hôm nay
      (t.recurringDate && t.recurringDate === todayStr) ||      // task lặp lại hôm nay (kể cả trong dự án)
      (!t.deadline && !t.recurringDate)                         // không có deadline (task cũ/backlog)
    ))
    .sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1))
    .slice(0, 15);

  // Current pomodoro state
  const pomoWidget = window._pomodoroState;
  const pomoWidgetHTML = renderPomoDashWidget();

  // Timeline
  const scheduleBlocks = getSchedule().filter(b => b.date === todayStr);
  const timelineHTML = renderTimeline(scheduleBlocks, settings);

  return `
  <div class="page-header">
    <div class="greeting-header">
      <div class="greeting-text">${getGreeting(settings.userName)}</div>
      <div class="greeting-date">${formatViDate()}</div>
    </div>
  </div>
  <div class="page-body">

    <!-- Stat Cards -->
    <div class="stats-row mb-4" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card">
        ${buildCircularProgress(todayTasks.length ? Math.round(doneTodayTasks.length/todayTasks.length*100) : 0, 'var(--primary)')}
        <div class="stat-info">
          <div class="stat-value">${doneTodayTasks.length}/${todayTasks.length}</div>
          <div class="stat-label">Task hôm nay</div>
          <div class="stat-sub">${todayTasks.length - doneTodayTasks.length} còn lại</div>
        </div>
      </div>
      <div class="stat-card">
        ${buildCircularProgress(Math.min(pomData.todayCount / (pomData.settings.longBreakAfter || 4) * 100, 100), 'var(--pomodoro)')}
        <div class="stat-info">
          <div class="stat-value">${pomData.todayCount} 🍅</div>
          <div class="stat-label">Pomodoro hôm nay</div>
          <div class="stat-sub">🔥 Streak ${pomData.streak} ngày</div>
        </div>
      </div>
      <div class="stat-card">
        ${buildCircularProgress(habits.length ? Math.round(todayHabitsDone/habits.length*100) : 0, 'var(--habit)')}
        <div class="stat-info">
          <div class="stat-value">${todayHabitsDone}/${habits.length} 🌱</div>
          <div class="stat-label">Thói quen hôm nay</div>
          <div class="stat-sub">${formatHours(workedSec)} làm việc</div>
        </div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('finance')">
        <div class="stat-icon" style="font-size:28px">💰</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:15px;color:${finSummary.balance>=0?'var(--success)':'var(--danger)'}">${finSummary.balance>=0?'+':''}${finSummary.balance>=1000000?(finSummary.balance/1000000).toFixed(1)+'tr':(finSummary.balance/1000).toFixed(0)+'k'} ₫</div>
          <div class="stat-label">📅 Tài chính tháng</div>
          <div class="stat-sub" style="color:var(--success)">+${finSummary.inc>=1000000?(finSummary.inc/1000000).toFixed(1)+'tr':(finSummary.inc/1000).toFixed(0)+'k'} • <span style="color:var(--danger)">-${finSummary.exp>=1000000?(finSummary.exp/1000000).toFixed(1)+'tr':(finSummary.exp/1000).toFixed(0)+'k'}</span></div>
        </div>
      </div>
    </div>

    <!-- Pomodoro Mini Widget -->
    ${pomoWidgetHTML}

    <!-- Tasks + Projects -->
    <div class="dashboard-grid-2 mb-4">
      <!-- Today Tasks -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="section-title" style="margin:0"><span>📋</span> Cần làm hôm nay</div>
          <button class="btn btn-primary btn-sm" onclick="openAddTaskModal()">+ Thêm</button>
        </div>
        ${upcomingTasks.length === 0 ? `<div class="no-data" style="padding:20px 0"><div class="no-data-icon">🎉</div><p>Không có task nào!</p></div>` :
          upcomingTasks.map(t => {
            const project = t.projectId ? getProjectById(t.projectId) : null;
            const isDone = !!t.completedAt;
            return `<div class="today-task-item">
              <div class="today-task-check ${isDone?'done':''}" onclick="dashToggleTask('${t.id}')" title="${isDone?'Bỏ tick':'Tick xong'}">
                ${isDone ? '✓' : ''}
              </div>
              <span class="today-task-name ${isDone?'done':''}">${t.title}</span>
              ${project ? `<span class="task-project-dot" style="background:${project.color}">${project.name}</span>` : ''}
              ${priorityBadge(t.priority)}
            </div>`;
          }).join('')}
      </div>

      <!-- Active Projects -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="section-title" style="margin:0"><span>📁</span> Dự án đang chạy</div>
          <button class="btn btn-primary btn-sm" onclick="openAddProjectModal()">+ Thêm</button>
        </div>
        ${projects.length === 0 ? `<div class="no-data" style="padding:20px 0"><div class="no-data-icon">📁</div><p>Chưa có dự án nào</p></div>` :
          projects.slice(0, 3).map(p => {
            const stats = getProjectStats(p.id);
            const dl = p.deadline ? daysUntil(p.deadline) : null;
            return `<div class="mb-3" style="cursor:pointer" onclick="navigateTo('projects');setTimeout(()=>openProjectDetail('${p.id}'),50)">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div style="width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0"></div>
                  <span class="font-bold" style="font-size:13px">${p.name}</span>
                </div>
                <span class="text-sm text-muted">${stats.done}/${stats.total} task</span>
              </div>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" style="width:${stats.pct}%;background:${p.color}"></div>
              </div>
              ${dl !== null ? `<div class="text-sm text-muted mt-2">${dl < 0 ? `⚠️ Trễ ${Math.abs(dl)} ngày` : dl === 0 ? '⏰ Hết hạn hôm nay' : `📅 Còn ${dl} ngày`}</div>` : ''}
            </div>`;
          }).join('')}
      </div>
    </div>

    <!-- Habits Quick Tick -->
    <div class="card mb-4">
      <div class="section-title mb-3"><span>🌱</span> Thói quen hôm nay</div>
      ${habits.length === 0 ? `<div class="no-data" style="padding:16px 0"><div class="no-data-icon">🌱</div><p>Thêm thói quen để theo dõi</p></div>` :
        `<div class="habit-grid">
          ${habits.map(h => {
            const done = h.completedDates.includes(todayStr);
            const streak = getHabitStreak(h);
            return `<button class="habit-btn ${done?'done':''}"
              style="${done ? `background:${h.color}20;border-color:${h.color}` : ''}"
              onclick="dashToggleHabit('${h.id}',this)" id="dash-habit-${h.id}">
              <span class="habit-emoji">${h.icon}</span>
              <span class="habit-name">${h.name}</span>
              <span class="habit-streak">🔥 ${streak} ngày</span>
            </button>`;
          }).join('')}
        </div>`}
    </div>

    <!-- Timeline -->
    <div class="card">
      <div class="section-title mb-3"><span>📅</span> Timeline hôm nay</div>
      ${timelineHTML}
    </div>

  </div>`;
}

function renderPomoDashWidget() {
  const state = window._pomodoroState;
  if (!state || !state.running) {
    return `<div class="pomo-widget mb-4">
      <div class="pomo-widget-time">--:--</div>
      <div class="pomo-widget-info">
        <div class="pomo-widget-task">Chưa có phiên Pomodoro nào</div>
        <div class="pomo-widget-status">Bắt đầu một phiên để tập trung</div>
      </div>
      <div class="pomo-widget-controls">
        <button class="btn btn-primary" onclick="navigateTo('time');setTimeout(()=>switchTimeTab('pomodoro'),50)">🍅 Bắt đầu Pomodoro</button>
      </div>
    </div>`;
  }
  const { remaining, mode, taskName } = state;
  const modeLabel = { work: '🍅 Làm việc', 'short-break': '☕ Nghỉ ngắn', 'long-break': '🛋️ Nghỉ dài' }[mode] || '';
  return `<div class="pomo-widget mb-4">
    <div class="pomo-widget-time" id="dash-pomo-time">${formatDuration(remaining)}</div>
    <div class="pomo-widget-info">
      <div class="pomo-widget-task">${taskName || 'Không gắn task'}</div>
      <div class="pomo-widget-status">${modeLabel}</div>
    </div>
    <div class="pomo-widget-controls">
      <button class="btn btn-ghost btn-sm" onclick="navigateTo('time');setTimeout(()=>switchTimeTab('pomodoro'),50)">Xem chi tiết</button>
    </div>
  </div>`;
}

function renderTimeline(blocks, settings) {
  const startH = parseInt((settings.workHoursStart || '08:00').split(':')[0]);
  const endH = parseInt((settings.workHoursEnd || '18:00').split(':')[0]);
  const TOTAL_START = 6, TOTAL_END = 23;
  const TOTAL_SPAN = TOTAL_END - TOTAL_START;
  const nowH = new Date().getHours() + new Date().getMinutes() / 60;
  const nowPct = Math.max(0, Math.min(100, ((nowH - TOTAL_START) / TOTAL_SPAN) * 100));
  const workStartPct = ((startH - TOTAL_START) / TOTAL_SPAN) * 100;
  const workWidthPct = ((endH - startH) / TOTAL_SPAN) * 100;

  const labels = [6, 8, 10, 12, 14, 16, 18, 20, 22];

  return `<div class="timeline-bar mb-2">
    <div class="timeline-work-zone" style="left:${workStartPct}%;width:${workWidthPct}%"></div>
    ${blocks.map(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const bStartH = bStart.getHours() + bStart.getMinutes()/60;
      const bEndH = bEnd.getHours() + bEnd.getMinutes()/60;
      const left = Math.max(0, ((bStartH - TOTAL_START) / TOTAL_SPAN) * 100);
      const width = Math.max(1, ((bEndH - bStartH) / TOTAL_SPAN) * 100);
      const project = b.projectId ? getProjectById(b.projectId) : null;
      const color = project ? project.color : 'var(--primary)';
      return `<div class="timeline-block" style="left:${left}%;width:${width}%;background:${color}">
        <span>${b.title || ''}</span>
      </div>`;
    }).join('')}
    ${nowH >= TOTAL_START && nowH <= TOTAL_END ? `<div class="timeline-now" style="left:${nowPct}%"></div>` : ''}
  </div>
  <div class="timeline-labels">
    ${labels.map(h => `<span style="position:relative;flex:none;width:${100/(labels.length)}%">${h}:00</span>`).join('')}
  </div>`;
}

function dashToggleTask(id) {
  const task = getTaskById(id);
  if (!task) return;

  const cols = getColumns(task.projectId || null);

  if (task.completedAt) {
    const todoCol = cols.find(c => c.title.includes('Cần làm')) || cols[0];
    updateTask(id, { 
      completedAt: null, 
      status: 'todo',
      columnId: todoCol ? todoCol.id : task.columnId
    });
  } else {
    const doneCol = cols.find(c => c.title.includes('Hoàn thành')) || cols[cols.length - 1];
    updateTask(id, { 
      completedAt: now(), 
      status: 'done',
      columnId: doneCol ? doneCol.id : task.columnId
    });
    launchConfetti();
    playTaskComplete();
    showToast('Task hoàn thành! 🎉', 'success');
  }
  renderCurrentPage();
}

function dashToggleHabit(id, btnEl) {
  if (btnEl) addRipple(btnEl, event);
  const habit = toggleHabit(id);
  if (habit) {
    const done = habit.completedDates.includes(today());
    if (done) { playHabitTick(); showToast(`${habit.icon} ${habit.name} đã hoàn thành!`, 'success'); }
    renderCurrentPage();
  }
}

function openAddTaskModal(prefill = {}) {
  const projects = getProjects();
  const cols = getAllColumns().filter(c => !c.projectId);
  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">✅ Thêm Task mới</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Tên task *</label>
        <input id="mt-title" class="form-input" placeholder="Nhập tên task..." value="${prefill.title||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Dự án</label>
        <select id="mt-project" class="form-select">
          <option value="">— Không thuộc dự án —</option>
          ${projects.map(p => `<option value="${p.id}" ${prefill.projectId===p.id?'selected':''}>${p.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Độ ưu tiên</label>
          <select id="mt-priority" class="form-select">
            <option value="high" ${prefill.priority==='high'?'selected':''}>🔴 Cao</option>
            <option value="medium" ${!prefill.priority||prefill.priority==='medium'?'selected':''}>🟡 Trung bình</option>
            <option value="low" ${prefill.priority==='low'?'selected':''}>🟢 Thấp</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Deadline</label>
          <input id="mt-deadline" type="date" class="form-input" value="${prefill.deadline||''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ước tính (giờ)</label>
        <input id="mt-hours" type="number" min="0" step="0.5" class="form-input" value="${prefill.estimatedHours||0}" style="max-width:120px">
      </div>
      <div class="form-group">
        <label class="form-label">Ghi chú</label>
        <textarea id="mt-note" class="form-textarea" placeholder="Ghi chú...">${prefill.note||''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitAddTask()">Thêm Task</button>
    </div>
  </div>`);
  document.getElementById('mt-title').focus();
}

function submitAddTask() {
  const title = document.getElementById('mt-title').value.trim();
  if (!title) { showToast('Vui lòng nhập tên task!', 'error'); return; }
  const projectId = document.getElementById('mt-project').value || null;
  const priority = document.getElementById('mt-priority').value;
  const deadline = document.getElementById('mt-deadline').value || null;
  const estimatedHours = parseFloat(document.getElementById('mt-hours').value) || 0;
  const note = document.getElementById('mt-note').value;

  // Find appropriate column
  const cols = getColumns(projectId);
  const firstCol = cols[0];

  addTask({ title, projectId, priority, deadline, estimatedHours, note, columnId: firstCol ? firstCol.id : 'col-todo' });
  closeModal();
  showToast('Đã thêm task mới!', 'success');
  renderCurrentPage();
}
