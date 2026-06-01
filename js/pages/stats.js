/* ============================================
   STATS.JS — Statistics & History
   ============================================ */

let _statsTab = 'overview';
let _historyDate = today();

function renderStats() {
  return `
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">📊 Thống kê</h1>
        <p class="page-subtitle">Phân tích năng suất và lịch sử công việc</p>
      </div>
    </div>
  </div>
  <div class="page-body">
    <!-- Stat Tab bar -->
    <div class="tasks-tab-bar mb-4">
      <button class="tasks-tab-btn ${_statsTab==='overview'?'active':''}" onclick="switchStatsTab('overview')">📈 Tổng quan</button>
      <button class="tasks-tab-btn ${_statsTab==='tasks'?'active':''}" onclick="switchStatsTab('tasks')">✅ Tasks</button>
      <button class="tasks-tab-btn ${_statsTab==='projects'?'active':''}" onclick="switchStatsTab('projects')">📁 Dự án</button>
      <button class="tasks-tab-btn ${_statsTab==='history'?'active':''}" onclick="switchStatsTab('history')">🗓️ Lịch sử ngày</button>
    </div>

    ${_statsTab === 'overview' ? renderStatsOverview() : ''}
    ${_statsTab === 'tasks'    ? renderStatsTasks()    : ''}
    ${_statsTab === 'projects' ? renderStatsProjects() : ''}
    ${_statsTab === 'history'  ? renderStatsHistory()  : ''}
  </div>`;
}

function switchStatsTab(tab) {
  _statsTab = tab;
  renderCurrentPage();
}

/* ---- Overview Tab ---- */
function renderStatsOverview() {
  const tasks    = getTasks();
  const projects = getProjects();
  const logs     = getTimeLogs();
  const habits   = getHabits();
  const pomData  = getPomodoroData();
  const todayStr = today();

  // All-time stats
  const totalTasks   = tasks.length;
  const doneTasks    = tasks.filter(t => t.completedAt).length;
  const totalHoursSec= logs.reduce((s, l) => s + (l.duration||0), 0);
  const totalPomos   = logs.filter(l => l.type==='pomodoro').length;
  const activeProj   = projects.filter(p => p.status==='active').length;

  // This week
  const weekStart = getWeekStart();
  const weekDays  = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(d.getDate()+i); return toDateStr(d);
  });
  const weekDone = tasks.filter(t => t.completedAt && t.completedAt.slice(0,10) >= weekDays[0] && t.completedAt.slice(0,10) <= weekDays[6]).length;
  const weekHoursSec = logs.filter(l => l.date >= weekDays[0] && l.date <= weekDays[6]).reduce((s,l)=>s+(l.duration||0),0);
  const weekPomos = logs.filter(l => l.type==='pomodoro' && l.date >= weekDays[0] && l.date <= weekDays[6]).length;

  // Last 30 days productivity bar chart
  const last30 = Array.from({length:30}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (29-i)); return toDateStr(d);
  });
  const maxDayH = Math.max(0.5, ...last30.map(d => logs.filter(l=>l.date===d).reduce((s,l)=>s+(l.duration||0),0)/3600));

  // Completion rate by week (last 4 weeks)
  const weeklyCompletion = Array.from({length:4}, (_,wk) => {
    const wStart = new Date(); wStart.setDate(wStart.getDate() - (3-wk)*7 - wStart.getDay());
    const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate()+6);
    const ws = toDateStr(wStart), we = toDateStr(wEnd);
    const created   = tasks.filter(t => t.createdAt && t.createdAt.slice(0,10) >= ws && t.createdAt.slice(0,10) <= we).length;
    const completed = tasks.filter(t => t.completedAt && t.completedAt.slice(0,10) >= ws && t.completedAt.slice(0,10) <= we).length;
    return { label: `T${wk+1}`, created, completed };
  });

  return `
  <!-- KPI Cards -->
  <div class="stats-row mb-4" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-info">
        <div class="stat-value">${doneTasks}<span style="font-size:14px;color:var(--text-muted)">/${totalTasks}</span></div>
        <div class="stat-label">Task đã hoàn thành</div>
        <div class="stat-sub">Tỷ lệ: ${totalTasks ? Math.round(doneTasks/totalTasks*100) : 0}%</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⏱️</div>
      <div class="stat-info">
        <div class="stat-value">${formatHours(totalHoursSec)}</div>
        <div class="stat-label">Tổng giờ làm việc</div>
        <div class="stat-sub">🍅 ${totalPomos} pomodoro</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📁</div>
      <div class="stat-info">
        <div class="stat-value">${activeProj}<span style="font-size:14px;color:var(--text-muted)">/${projects.length}</span></div>
        <div class="stat-label">Dự án đang chạy</div>
        <div class="stat-sub">${projects.filter(p=>p.status==='done').length} đã hoàn thành</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🔥</div>
      <div class="stat-info">
        <div class="stat-value">${pomData.streak}</div>
        <div class="stat-label">Streak Pomodoro</div>
        <div class="stat-sub">Tuần này: ${weekPomos} 🍅</div>
      </div>
    </div>
  </div>

  <!-- This Week -->
  <div class="stats-section-title">📅 Tuần này</div>
  <div class="stats-row mb-4" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-info"><div class="stat-value">${weekDone}</div><div class="stat-label">Task hoàn thành tuần này</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⏱️</div>
      <div class="stat-info"><div class="stat-value">${formatHours(weekHoursSec)}</div><div class="stat-label">Giờ làm tuần này</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🍅</div>
      <div class="stat-info"><div class="stat-value">${weekPomos}</div><div class="stat-label">Pomodoro tuần này</div></div>
    </div>
  </div>

  <!-- 30-day chart -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
    <div class="card">
      <div class="stats-chart-title">📊 Giờ làm 30 ngày qua</div>
      <div class="stats-bar-chart">
        ${last30.map((d,i) => {
          const h = logs.filter(l=>l.date===d).reduce((s,l)=>s+(l.duration||0),0)/3600;
          const pct = (h/maxDayH*100);
          const isToday = d === todayStr;
          return `<div class="stats-bar-wrap" title="${d}: ${h.toFixed(1)}h">
            <div class="stats-bar" style="height:${Math.max(2,pct)}%;background:${isToday?'var(--primary)':'var(--primary-light)'}"></div>
            ${i % 5 === 0 ? `<div class="stats-bar-label">${d.slice(8)}</div>` : '<div class="stats-bar-label"></div>'}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Weekly completion -->
    <div class="card">
      <div class="stats-chart-title">📈 Tạo vs Hoàn thành (4 tuần)</div>
      <div class="weekly-completion-chart">
        ${weeklyCompletion.map(w => `
          <div class="wc-row">
            <div class="wc-label">${w.label}</div>
            <div class="wc-bars">
              <div class="wc-bar" style="width:${w.created?Math.min(100,w.created*8):0}%">
                <span class="wc-bar-label">Tạo: ${w.created}</span>
              </div>
              <div class="wc-bar done" style="width:${w.completed?Math.min(100,w.completed*8):0}%">
                <span class="wc-bar-label">Xong: ${w.completed}</span>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ---- Tasks Tab ---- */
function renderStatsTasks() {
  const tasks = getTasks();
  const todayStr = today();

  // By priority
  const byPriority = {
    high:   tasks.filter(t => t.priority==='high'),
    medium: tasks.filter(t => t.priority==='medium'),
    low:    tasks.filter(t => t.priority==='low'),
  };

  // By status (column)
  const cols = getAllColumns();
  const byCol = cols.map(c => ({
    col: c,
    count: tasks.filter(t => t.columnId === c.id).length,
    done:  tasks.filter(t => t.columnId === c.id && t.completedAt).length,
  })).filter(x => x.count > 0);

  // Overdue
  const overdue = tasks.filter(t => !t.completedAt && t.deadline && t.deadline.slice(0,10) < todayStr);
  // Due today
  const dueToday = tasks.filter(t => !t.completedAt && t.deadline && t.deadline.slice(0,10) === todayStr);
  // Completed by month (last 6 months)
  const months = Array.from({length:6}, (_,i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5-i)); d.setDate(1);
    return { ym: toDateStr(d).slice(0,7), label: `T${d.getMonth()+1}` };
  });
  const maxMCount = Math.max(1, ...months.map(m => tasks.filter(t => t.completedAt && t.completedAt.startsWith(m.ym)).length));

  return `
  <!-- Quick stats -->
  <div class="stats-row mb-4" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card">
      <div class="stat-icon">📋</div>
      <div class="stat-info"><div class="stat-value">${tasks.length}</div><div class="stat-label">Tổng số task</div></div>
    </div>
    <div class="stat-card" style="border-color:var(--success)">
      <div class="stat-icon">✅</div>
      <div class="stat-info"><div class="stat-value" style="color:var(--success)">${tasks.filter(t=>t.completedAt).length}</div><div class="stat-label">Đã hoàn thành</div></div>
    </div>
    <div class="stat-card" style="border-color:var(--danger)">
      <div class="stat-icon">⚠️</div>
      <div class="stat-info"><div class="stat-value" style="color:var(--danger)">${overdue.length}</div><div class="stat-label">Trễ hạn</div></div>
    </div>
    <div class="stat-card" style="border-color:var(--warning)">
      <div class="stat-icon">⏰</div>
      <div class="stat-info"><div class="stat-value" style="color:var(--warning)">${dueToday.length}</div><div class="stat-label">Đến hạn hôm nay</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
    <!-- By priority -->
    <div class="card">
      <div class="stats-chart-title">🎯 Phân bố theo ưu tiên</div>
      ${[['high','🔴 Cao','var(--danger)'],['medium','🟡 Trung bình','var(--warning)'],['low','🟢 Thấp','var(--success)']].map(([k,label,color]) => {
        const arr = byPriority[k];
        const done = arr.filter(t=>t.completedAt).length;
        const pct = arr.length ? Math.round(done/arr.length*100) : 0;
        return `<div class="stats-priority-row">
          <div class="stats-priority-label">${label}</div>
          <div class="stats-priority-bar-wrap">
            <div class="stats-priority-bar" style="width:${arr.length ? Math.min(100,arr.length*10) : 0}%;background:${color}20;border:1px solid ${color}">
              <div style="width:${pct}%;background:${color};height:100%;border-radius:inherit;transition:width 0.5s"></div>
            </div>
          </div>
          <span class="stats-priority-count">${done}/${arr.length}</span>
        </div>`;
      }).join('')}
    </div>

    <!-- By col -->
    <div class="card">
      <div class="stats-chart-title">🗂️ Phân bố theo cột</div>
      ${byCol.slice(0,6).map(x => {
        const pct = x.count ? Math.round(x.done/x.count*100) : 0;
        return `<div class="stats-priority-row">
          <div class="stats-priority-label" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${x.col.title}</div>
          <div class="stats-priority-bar-wrap">
            <div class="stats-priority-bar" style="background:var(--bg-card2)">
              <div style="width:${x.count?Math.min(100,x.count*10):0}%;background:var(--primary);height:100%;border-radius:inherit;transition:width 0.5s"></div>
            </div>
          </div>
          <span class="stats-priority-count">${x.count}</span>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Monthly completion -->
  <div class="card">
    <div class="stats-chart-title">📅 Task hoàn thành theo tháng (6 tháng gần nhất)</div>
    <div class="stats-bar-chart" style="height:120px">
      ${months.map(m => {
        const count = tasks.filter(t => t.completedAt && t.completedAt.startsWith(m.ym)).length;
        const pct = (count/maxMCount*100);
        return `<div class="stats-bar-wrap" style="flex:1;min-width:40px" title="${m.ym}: ${count} task">
          <div class="stats-bar" style="height:${Math.max(2,pct)}%;background:var(--primary)"></div>
          <div class="stats-bar-label" style="font-size:12px">${m.label}<br><b>${count}</b></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ---- Projects Tab ---- */
function renderStatsProjects() {
  const projects = getProjects();
  const tasks    = getTasks();
  const logs     = getTimeLogs();

  if (projects.length === 0) {
    return `<div class="recurring-empty"><div class="recurring-empty-icon">📁</div><h3>Chưa có dự án nào</h3></div>`;
  }

  // Project stats table
  const rows = projects.map(p => {
    const stats = getProjectStats(p.id);
    const workedH = (stats.workedSec / 3600).toFixed(1);
    const dl = p.deadline ? daysUntil(p.deadline) : null;
    return { p, stats, workedH, dl };
  }).sort((a, b) => b.stats.total - a.stats.total);

  // Donut-like breakdown of hours by project
  const totalProjH = rows.reduce((s,r) => s + r.stats.workedSec, 0);

  return `
  <!-- Summary row -->
  <div class="stats-row mb-4" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card">
      <div class="stat-icon">📁</div>
      <div class="stat-info"><div class="stat-value">${projects.length}</div><div class="stat-label">Tổng dự án</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🟢</div>
      <div class="stat-info"><div class="stat-value">${projects.filter(p=>p.status==='active').length}</div><div class="stat-label">Đang chạy</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-info"><div class="stat-value">${projects.filter(p=>p.status==='done').length}</div><div class="stat-label">Đã hoàn thành</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⏱️</div>
      <div class="stat-info"><div class="stat-value">${formatHours(totalProjH)}</div><div class="stat-label">Tổng giờ dự án</div></div>
    </div>
  </div>

  <!-- Hours by project bar -->
  <div class="card mb-4">
    <div class="stats-chart-title">⏱️ Giờ làm việc theo dự án</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
      ${rows.filter(r=>r.stats.workedSec>0).slice(0,8).map(r => {
        const pct = totalProjH ? (r.stats.workedSec/totalProjH*100) : 0;
        return `<div style="display:flex;align-items:center;gap:12px">
          <div style="width:12px;height:12px;border-radius:50%;background:${r.p.color};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.p.name}</div>
            <div class="progress-bar-wrap" style="margin:0"><div class="progress-bar-fill" style="width:${pct}%;background:${r.p.color}"></div></div>
          </div>
          <span style="font-size:12px;color:var(--text-muted);flex-shrink:0">${r.workedH}h</span>
        </div>`;
      }).join('')}
      ${rows.filter(r=>r.stats.workedSec>0).length === 0 ? '<p style="color:var(--text-muted);font-size:13px">Chưa có log thời gian nào</p>' : ''}
    </div>
  </div>

  <!-- Projects table -->
  <div class="card">
    <div class="stats-chart-title">📋 Chi tiết dự án</div>
    <div class="stats-table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>Dự án</th><th>Trạng thái</th><th>Tiến độ</th><th>Task</th><th>Deadline</th><th>Giờ làm</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr onclick="navigateTo('projects');setTimeout(()=>openProjectDetail('${r.p.id}'),50)" style="cursor:pointer">
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:10px;height:10px;border-radius:50%;background:${r.p.color}"></div>
                <span style="font-weight:600">${r.p.name}</span>
              </div>
              ${r.p.client ? `<div style="font-size:11px;color:var(--text-muted)">👤 ${r.p.client}</div>` : ''}
            </td>
            <td>${statusBadge(r.p.status)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;min-width:100px">
                <div class="progress-bar-wrap" style="flex:1;margin:0"><div class="progress-bar-fill" style="width:${r.stats.pct}%;background:${r.p.color}"></div></div>
                <span style="font-size:12px;font-weight:600;flex-shrink:0">${r.stats.pct}%</span>
              </div>
            </td>
            <td style="text-align:center">${r.stats.done}/${r.stats.total}</td>
            <td style="font-size:12px">${r.dl !== null ? (r.dl < 0 ? `<span style="color:var(--danger)">⚠️ Trễ ${Math.abs(r.dl)}d</span>` : r.dl === 0 ? `<span style="color:var(--warning)">⏰ Hôm nay</span>` : `📅 Còn ${r.dl}d`) : '—'}</td>
            <td style="font-size:12px;font-family:'JetBrains Mono',monospace">${r.workedH}h</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ---- History Tab ---- */
function renderStatsHistory() {
  const selectedDate = _historyDate;
  const tasks   = getTasks();
  const logs    = getTimeLogs();
  const habits  = getHabits();
  const review  = getReviewByDate(selectedDate);

  // Tasks with deadline on that date OR completed on that date
  const deadlineTasks   = tasks.filter(t => t.deadline && t.deadline.slice(0,10) === selectedDate);
  const completedTasks  = tasks.filter(t => t.completedAt && t.completedAt.slice(0,10) === selectedDate);
  const dayLogs         = logs.filter(l => l.date === selectedDate);
  const dayPomos        = dayLogs.filter(l => l.type === 'pomodoro').length;
  const dayHoursSec     = dayLogs.reduce((s,l) => s + (l.duration||0), 0);
  const dayHabits       = habits.filter(h => h.completedDates.includes(selectedDate));

  // Unique tasks (union of deadline + completed)
  const allDayTasks = [...new Map([...deadlineTasks, ...completedTasks].map(t => [t.id, t])).values()];

  return `
  <div class="history-header">
    <div class="history-date-nav">
      <button class="btn btn-ghost btn-sm" onclick="changeHistoryDate(-1)">← Trước</button>
      <input type="date" class="form-input" style="max-width:160px;text-align:center"
        value="${selectedDate}" onchange="setHistoryDate(this.value)" max="${today()}">
      <button class="btn btn-ghost btn-sm" onclick="changeHistoryDate(1)" ${selectedDate >= today() ? 'disabled' : ''}>Sau →</button>
    </div>
    <div class="history-day-label">${formatViDateStr(selectedDate)}</div>
  </div>

  <!-- Day KPIs -->
  <div class="stats-row mb-4" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card">
      <div class="stat-icon">📋</div>
      <div class="stat-info"><div class="stat-value">${deadlineTasks.length}</div><div class="stat-label">Task deadline ngày này</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-info"><div class="stat-value">${completedTasks.length}</div><div class="stat-label">Đã hoàn thành</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⏱️</div>
      <div class="stat-info"><div class="stat-value">${formatHours(dayHoursSec)}</div><div class="stat-label">Giờ làm việc</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🍅</div>
      <div class="stat-info"><div class="stat-value">${dayPomos}</div><div class="stat-label">Pomodoro</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <!-- Task list -->
    <div class="card">
      <div class="stats-chart-title">📋 Tasks ngày ${selectedDate}</div>
      ${allDayTasks.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;padding:12px 0">Không có task nào được ghi nhận trong ngày này.</p>' :
        allDayTasks.map(t => {
          const project = t.projectId ? getProjectById(t.projectId) : null;
          const isDone = !!(t.completedAt && t.completedAt.slice(0,10) === selectedDate);
          const wasDeadline = t.deadline && t.deadline.slice(0,10) === selectedDate;
          return `<div class="history-task-item" onclick="openTaskModal('${t.id}')">
            <div class="history-task-status ${isDone?'done':'pending'}">
              ${isDone ? '✓' : '○'}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;${isDone?'text-decoration:line-through;opacity:0.6':''}">${t.title}</div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:3px">
                ${project ? `<span class="task-project-dot" style="background:${project.color}">${project.name}</span>` : ''}
                ${priorityBadge(t.priority)}
                ${wasDeadline ? '<span style="font-size:11px;color:var(--text-muted)">📅 Deadline</span>' : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
    </div>

    <!-- Right: habits + time logs + review -->
    <div style="display:flex;flex-direction:column;gap:12px">
      <!-- Habits -->
      <div class="card">
        <div class="stats-chart-title">🌱 Thói quen</div>
        ${dayHabits.length === 0 ? '<p style="color:var(--text-muted);font-size:12px">Không có thói quen nào được ghi nhận.</p>' :
          dayHabits.map(h => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
            <span style="font-size:18px">${h.icon}</span>
            <span style="font-size:13px;font-weight:500">${h.name}</span>
            <span style="margin-left:auto;color:var(--success);font-weight:700">✓</span>
          </div>`).join('')}
      </div>

      <!-- Time logs -->
      <div class="card">
        <div class="stats-chart-title">⏱️ Thời gian làm việc (${dayLogs.length} phiên)</div>
        ${dayLogs.length === 0 ? '<p style="color:var(--text-muted);font-size:12px">Không có log thời gian nào.</p>' :
          dayLogs.slice(0,8).map(l => {
            const task = l.taskId ? getTaskById(l.taskId) : null;
            return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
              <span>${l.type==='pomodoro'?'🍅':'⏱️'}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${task ? task.title : (l.title || 'Không rõ')}</span>
              <span style="color:var(--text-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0">${formatDuration(l.duration||0)}</span>
            </div>`;
          }).join('')}
        ${dayLogs.length > 8 ? `<div style="font-size:12px;color:var(--text-muted);padding-top:4px">+ ${dayLogs.length-8} phiên khác...</div>` : ''}
      </div>

      <!-- Daily review snippet -->
      ${review ? `<div class="card">
        <div class="stats-chart-title">📓 Nhật ký ngày này</div>
        ${review.morningIntention ? `<div style="font-size:12px;margin-bottom:6px"><b>Kế hoạch sáng:</b> ${review.morningIntention}</div>` : ''}
        ${review.doneToday ? `<div style="font-size:12px;margin-bottom:6px"><b>Đã làm:</b> ${review.doneToday}</div>` : ''}
        ${review.lessons ? `<div style="font-size:12px"><b>Bài học:</b> ${review.lessons}</div>` : ''}
        ${review.score ? `<div style="margin-top:8px;font-size:12px;color:var(--primary)">⭐ Điểm ngày: ${review.score}/10</div>` : ''}
      </div>` : ''}
    </div>
  </div>`;
}

/* ---- History navigation helpers ---- */
function changeHistoryDate(delta) {
  const d = new Date(_historyDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  if (toDateStr(d) > today()) return;
  _historyDate = toDateStr(d);
  renderCurrentPage();
}
function setHistoryDate(val) {
  if (!val) return;
  if (val > today()) { showToast('Không thể xem ngày trong tương lai!', 'error'); return; }
  _historyDate = val;
  renderCurrentPage();
}

/* ---- utility ---- */
function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatViDateStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][d.getDay()];
  return `${dow}, ${d.getDate()} tháng ${d.getMonth()+1} năm ${d.getFullYear()}`;
}
