/* ============================================
   TASKS.JS — Kanban Board + Recurring Tasks
   ============================================ */

let _taskFilter = { project: '', priority: '', deadline: '', search: '' };
let _tasksTab = 'kanban'; // 'kanban' | 'recurring'
let _expandedDailyGroups = new Set();

function renderTasks() {
  const columns = getColumns(null);
  const projects = getProjects();
  return `
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">✅ Tasks</h1>
        <p class="page-subtitle">Quản lý toàn bộ công việc của bạn</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="openAddRecurringModal()" title="Tạo task lặp lại">🔁 Task lặp lại</button>
        <button class="btn btn-primary" onclick="openAddTaskModal()">+ Thêm Task</button>
      </div>
    </div>
  </div>
  <div class="page-body">
    <!-- Tab bar -->
    <div class="tasks-tab-bar">
      <button class="tasks-tab-btn ${_tasksTab==='kanban'?'active':''}" onclick="switchTasksTab('kanban')">📋 Kanban Board</button>
      <button class="tasks-tab-btn ${_tasksTab==='recurring'?'active':''}" onclick="switchTasksTab('recurring')">🔁 Task lặp lại <span class="recurring-count-badge">${getRecurring().length}</span></button>
    </div>

    <!-- Kanban tab -->
    <div class="tasks-tab-content ${_tasksTab==='kanban'?'active':''}">
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-search">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Tìm kiếm task..." id="task-search" value="${escapeHtml(_taskFilter.search)}" oninput="onTaskFilterChange()">
        </div>
        <select class="filter-select" id="task-filter-project" onchange="onTaskFilterChange()">
          <option value="">Tất cả dự án</option>
          ${projects.map(p => `<option value="${p.id}" ${_taskFilter.project===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
        <select class="filter-select" id="task-filter-priority" onchange="onTaskFilterChange()">
          <option value="">Tất cả ưu tiên</option>
          <option value="high" ${_taskFilter.priority==='high'?'selected':''}>🔴 Cao</option>
          <option value="medium" ${_taskFilter.priority==='medium'?'selected':''}>🟡 Trung bình</option>
          <option value="low" ${_taskFilter.priority==='low'?'selected':''}>🟢 Thấp</option>
        </select>
        <select class="filter-select" id="task-filter-deadline" onchange="onTaskFilterChange()">
          <option value="">Tất cả deadline</option>
          <option value="today" ${_taskFilter.deadline==='today'?'selected':''}>Hôm nay</option>
          <option value="week" ${_taskFilter.deadline==='week'?'selected':''}>Tuần này</option>
        </select>
      </div>
      <!-- Kanban Board -->
      <div class="kanban-wrapper">
        <div class="kanban-board" id="kanban-board">
          ${columns.map(col => renderColumn(col, null)).join('')}
          <div style="display:flex;align-items:flex-start;padding-top:8px">
            <button class="btn btn-ghost btn-sm" onclick="openAddColumnModal(null)" style="white-space:nowrap">+ Thêm cột</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recurring tab -->
    <div class="tasks-tab-content ${_tasksTab==='recurring'?'active':''}">
      ${renderRecurringSection()}
    </div>
  </div>`;
}

function switchTasksTab(tab) {
  _tasksTab = tab;
  renderCurrentPage();
  if (tab === 'kanban') setTimeout(() => initTasksDnD(), 50);
}


function renderColumn(col, projectId) {
  const allTasks = getTasksByColumn(col.id);
  const isFiltering = _taskFilter.project || _taskFilter.priority || _taskFilter.deadline || _taskFilter.search;
  const filteredIds = isFiltering ? filterTasks(allTasks).map(t => t.id) : null;
  const cardsHtml = renderColumnCards(col.id, projectId, allTasks, filteredIds, isFiltering);

  return `<div class="kanban-col" data-col-id="${col.id}" id="col-${col.id}">
    <div class="col-header" oncontextmenu="showColMenu(event,'${col.id}')">
      <span class="col-title">${escapeHtml(col.title)}</span>
      <span class="col-count">${allTasks.length}</span>
      <button class="col-menu-btn" onclick="event.stopPropagation();showColMenu(event,'${col.id}')">···</button>
    </div>
    <div class="col-cards" id="cards-${col.id}" data-col-id="${col.id}">
      ${cardsHtml}
    </div>
    <div class="col-add-btn">
      <button onclick="showQuickAdd('${col.id}','${projectId||''}')">
        <span>+</span> Thêm card
      </button>
    </div>
  </div>`;
}

function renderColumnCards(colId, projectId, tasks, filteredIds = null, isFiltering = false) {
  if (isFiltering) return tasks.map(t => renderTaskCard(t, filteredIds)).join('');
  const dailyTasks = tasks.filter(isTodayDailyRecurringTask);
  if (dailyTasks.length < 2) return tasks.map(t => renderTaskCard(t, filteredIds)).join('');

  const groupedIds = new Set(dailyTasks.map(t => t.id));
  const otherTasks = tasks.filter(t => !groupedIds.has(t.id));
  return `${renderDailyTaskGroupCard(colId, dailyTasks)}${otherTasks.map(t => renderTaskCard(t, filteredIds)).join('')}`;
}

function isTodayDailyRecurringTask(task) {
  if (!task || task.completedAt || !task.recurringId || task.recurringDate !== today()) return false;
  const template = getRecurringById(task.recurringId);
  return !!template && template.active !== false && template.repeatType === 'daily';
}

function renderDailyTaskGroupCard(colId, tasks) {
  const expanded = _expandedDailyGroups.has(colId);
  const total = tasks.length;
  const estimated = tasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0);
  const priorities = tasks.reduce((acc, task) => {
    acc[task.priority || 'medium'] = (acc[task.priority || 'medium'] || 0) + 1;
    return acc;
  }, {});
  const priorityText = [
    priorities.high ? `${priorities.high} cao` : '',
    priorities.medium ? `${priorities.medium} TB` : '',
    priorities.low ? `${priorities.low} thấp` : '',
  ].filter(Boolean).join(' · ');

  return `<div class="daily-task-group-card ${expanded ? 'expanded' : ''}" id="daily-group-${colId}">
    <button class="daily-task-group-head" onclick="toggleDailyTaskGroup('${colId}')">
      <span class="daily-task-group-icon">🔁</span>
      <span class="daily-task-group-main">
        <span class="daily-task-group-title">Task hằng ngày</span>
        <span class="daily-task-group-sub">${total} việc cần tick${estimated ? ` · ${estimated}h` : ''}${priorityText ? ` · ${priorityText}` : ''}</span>
      </span>
      <span class="daily-task-group-count">${total}</span>
      <span class="daily-task-group-caret">${expanded ? '⌃' : '⌄'}</span>
    </button>
    <div class="daily-task-group-list">
      ${tasks.map(task => renderDailyTaskGroupItem(task)).join('')}
    </div>
  </div>`;
}

function renderDailyTaskGroupItem(task) {
  const project = task.projectId ? getProjectById(task.projectId) : null;
  return `<label class="daily-task-group-item" onclick="event.stopPropagation()">
    <input type="checkbox" onchange="completeDailyTaskFromGroup(event,'${task.id}')">
    <span class="daily-task-check-ui"></span>
    <span class="daily-task-group-item-body">
      <span class="daily-task-group-item-title">${escapeHtml(task.title)}</span>
      <span class="daily-task-group-item-meta">
        ${project ? `<span class="daily-task-project" style="background:${safeCssColor(project.color)}">${escapeHtml(project.name)}</span>` : ''}
        ${priorityText(task.priority)}
        ${task.estimatedHours ? `<span>⏱️ ${task.estimatedHours}h</span>` : ''}
      </span>
    </span>
    <button type="button" class="daily-task-open-btn" onclick="event.stopPropagation();openTaskModal('${task.id}')" title="Mở chi tiết">Chi tiết</button>
  </label>`;
}

function priorityText(priority) {
  if (priority === 'high') return '<span>🔴 Cao</span>';
  if (priority === 'low') return '<span>🟢 Thấp</span>';
  return '<span>🟡 Trung bình</span>';
}

function filterTasks(tasks) {
  return tasks.filter(t => {
    if (_taskFilter.project && t.projectId !== _taskFilter.project) return false;
    if (_taskFilter.priority && t.priority !== _taskFilter.priority) return false;
    if (_taskFilter.deadline === 'today') {
      if (!t.deadline || t.deadline.slice(0,10) !== today()) return false;
    } else if (_taskFilter.deadline === 'week') {
      if (!t.deadline) return false;
      const d = daysUntil(t.deadline);
      if (d < 0 || d > 7) return false;
    }
    if (_taskFilter.search) {
      if (!t.title.toLowerCase().includes(_taskFilter.search.toLowerCase())) return false;
    }
    return true;
  });
}

function renderTaskCard(task, filteredIds = null) {
  const project = task.projectId ? getProjectById(task.projectId) : null;
  const dl = task.deadline ? daysUntil(task.deadline) : null;
  const isOverdue = dl !== null && dl < 0 && !task.completedAt;
  const isWarning = dl !== null && dl >= 0 && dl <= 3 && !task.completedAt;
  const isDone = !!task.completedAt;
  const dimmed = filteredIds && !filteredIds.includes(task.id);
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter(s => s.done).length;
  const subTotal = subtasks.length;
  let borderStyle = '';
  if (isOverdue) borderStyle = 'border-color:var(--danger);';
  else if (isWarning) borderStyle = 'border-color:var(--warning);';
  return `<div class="task-card ${isOverdue?'overdue':''} ${isWarning?'warning':''} ${isDone?'done':''}"
    draggable="true"
    data-id="${task.id}"
    style="${dimmed ? 'opacity:0.3;' : ''}${borderStyle}"
    onclick="openTaskModal('${task.id}')">
    ${task.recurringId ? `<span class="task-recurring-badge" title="Task lặp lại">🔁</span>` : ''}
    ${isOverdue ? `<span class="task-overdue-badge" title="Trễ hạn">⚠️</span>` : ''}
    ${isWarning && !isOverdue ? `<span class="task-overdue-badge" title="Sắp đến hạn">🔔</span>` : ''}
    <div class="task-title">${escapeHtml(task.title)}</div>
    ${subTotal > 0 ? `<div class="subtask-progress-bar">
      <div style="width:${Math.round(subDone/subTotal*100)}%;background:var(--primary)"></div>
    </div>
    <div class="task-hours">${subDone}/${subTotal} subtask</div>` : ''}
    <div class="task-meta">
      ${project ? `<span class="task-project-dot" style="background:${safeCssColor(project.color)}">${escapeHtml(project.name)}</span>` : ''}
      ${priorityBadge(task.priority)}
      ${task.deadline ? `<span class="task-deadline ${isOverdue?'overdue':isWarning?'warning':''}" title="${formatDate(task.deadline)}">📅 ${deadlineLabel(task.deadline)}</span>` : ''}
      ${task.estimatedHours ? `<span class="task-hours">⏱️ ${task.estimatedHours}h</span>` : ''}
    </div>
  </div>`;
}

function onTaskFilterChange() {
  _taskFilter.search = document.getElementById('task-search')?.value || '';
  _taskFilter.project = document.getElementById('task-filter-project')?.value || '';
  _taskFilter.priority = document.getElementById('task-filter-priority')?.value || '';
  _taskFilter.deadline = document.getElementById('task-filter-deadline')?.value || '';
  renderCurrentPage();
}

function showQuickAdd(colId, projectId) {
  const colEl = document.getElementById(`col-${colId}`);
  const btn = colEl.querySelector('.col-add-btn');
  btn.innerHTML = `<div class="quick-add-form">
    <input id="qa-input-${colId}" class="form-input" placeholder="Tên task..." autofocus>
    <div class="quick-add-actions">
      <button class="btn btn-primary btn-sm" onclick="submitQuickAdd('${colId}','${projectId}')">Thêm</button>
      <button class="btn btn-ghost btn-sm" onclick="cancelQuickAdd('${colId}')">Hủy</button>
    </div>
  </div>`;
  const input = document.getElementById(`qa-input-${colId}`);
  if (input) {
    input.focus();
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitQuickAdd(colId, projectId);
      if (e.key === 'Escape') cancelQuickAdd(colId);
    });
  }
}

function submitQuickAdd(colId, projectId) {
  const input = document.getElementById(`qa-input-${colId}`);
  if (!input) return;
  const title = input.value.trim();
  if (!title) { cancelQuickAdd(colId); return; }
  addTask({ title, columnId: colId, projectId: projectId || null });
  showToast('Đã thêm task!', 'success');
  renderCurrentPage();
  // Re-init DnD
  setTimeout(() => initTasksDnD(), 50);
}

function cancelQuickAdd(colId) {
  const colEl = document.getElementById(`col-${colId}`);
  if (!colEl) return;
  const btn = colEl.querySelector('.col-add-btn');
  btn.innerHTML = `<button onclick="showQuickAdd('${colId}','')"><span>+</span> Thêm card</button>`;
}

function showColMenu(e, colId) {
  e.preventDefault();
  e.stopPropagation();
  showContextMenu(e.clientX, e.clientY, [
    { icon: '✏️', label: 'Đổi tên cột', action: () => promptRenameColumn(colId) },
    { icon: '🗜️', label: 'Thu gọn cột', action: () => toggleColCollapse(colId) },
    'divider',
    { icon: '🗑️', label: 'Xóa cột', danger: true, action: () => confirmDeleteColumn(colId) },
  ]);
}

function promptRenameColumn(colId) {
  const col = getAllColumns().find(c => c.id === colId);
  if (!col) return;
  const newName = prompt('Nhập tên mới cho cột:', col.title);
  if (newName && newName.trim()) {
    updateColumn(colId, { title: newName.trim() });
    renderCurrentPage();
    setTimeout(() => initTasksDnD(), 50);
    showToast('Đã đổi tên cột!', 'success');
  }
}

function toggleColCollapse(colId) {
  const el = document.getElementById(`col-${colId}`);
  if (el) el.classList.toggle('collapsed');
}

function confirmDeleteColumn(colId) {
  if (confirm('Xóa cột này? Các task trong cột sẽ được chuyển sang cột đầu tiên.')) {
    deleteColumn(colId);
    renderCurrentPage();
    showToast('Đã xóa cột!', 'info');
  }
}

function openAddColumnModal(projectId) {
  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">+ Thêm cột mới</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Tên cột</label>
        <input id="col-name-input" class="form-input" placeholder="VD: Chờ khách phản hồi..." autofocus>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitAddColumn('${projectId||''}')">Tạo cột</button>
    </div>
  </div>`);
}

function submitAddColumn(projectId) {
  const name = document.getElementById('col-name-input')?.value.trim();
  if (!name) { showToast('Vui lòng nhập tên cột!', 'error'); return; }
  addColumn({ title: name, projectId: projectId || null });
  closeModal();
  renderCurrentPage();
  setTimeout(() => initTasksDnD(), 50);
  showToast('Đã thêm cột mới!', 'success');
}

function openTaskModal(taskId) {
  const task = getTaskById(taskId);
  if (!task) return;

  const projects = getProjects();
  const cols = getAllColumns();
  const project = task.projectId ? getProjectById(task.projectId) : null;
  const dl = task.deadline ? daysUntil(task.deadline) : null;
  const isOverdue = dl !== null && dl < 0 && !task.completedAt;
  const isWarning = dl !== null && dl >= 0 && dl <= 3 && !task.completedAt;
  const taskLogs = getTimeLogs().filter(l => l.taskId === taskId);
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter(s => s.done).length;

  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">${isOverdue ? '⚠️' : isWarning ? '🔔' : project ? `<span style="color:${safeCssColor(project.color)}">●</span>` : '📋'} Chi tiết Task</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Tên task</label>
        <input id="edit-task-title" class="form-input" value="${escapeHtml(task.title)}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Dự án</label>
          <select id="edit-task-project" class="form-select">
            <option value="">— Không thuộc dự án —</option>
            ${projects.map(p => `<option value="${p.id}" ${task.projectId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Độ ưu tiên</label>
          <select id="edit-task-priority" class="form-select">
            <option value="high" ${task.priority==='high'?'selected':''}>🔴 Cao</option>
            <option value="medium" ${task.priority==='medium'?'selected':''}>🟡 Trung bình</option>
            <option value="low" ${task.priority==='low'?'selected':''}>🟢 Thấp</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Deadline ${isOverdue?'<span style="color:var(--danger)">● Trễ hạn</span>':isWarning?`<span style="color:var(--warning)">● Còn ${dl} ngày</span>`:''}</label>
          <input id="edit-task-deadline" type="date" class="form-input ${isOverdue?'border-danger':isWarning?'border-warning':''}" value="${task.deadline ? task.deadline.slice(0,10) : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Ưc tính (giờ)</label>
          <input id="edit-task-hours" type="number" min="0" step="0.5" class="form-input" value="${task.estimatedHours||0}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cột (Trạng thái)</label>
        <select id="edit-task-col" class="form-select">
          ${cols.map(c => `<option value="${c.id}" ${task.columnId===c.id?'selected':''}>${escapeHtml(c.title)}</option>`).join('')}
        </select>
      </div>

      <!-- Subtasks -->
      <div class="form-group">
        <label class="form-label">✅ Subtasks
          ${subtasks.length > 0 ? `<span style="color:var(--text-muted);font-weight:400;font-size:11px"> ${subDone}/${subtasks.length} xong</span>` : ''}
        </label>
        <div id="subtask-list" class="subtask-list">
          ${subtasks.map(s => `
            <div class="subtask-item" id="sub-${s.id}">
              <label class="subtask-check-label">
                <input type="checkbox" ${s.done?'checked':''} onchange="onSubtaskToggle('${taskId}','${s.id}',this)">
                <span class="subtask-text ${s.done?'done':''}">${escapeHtml(s.text)}</span>
              </label>
              <button class="subtask-del" onclick="onSubtaskDelete('${taskId}','${s.id}')" title="Xóa">✕</button>
            </div>`).join('')}
        </div>
        <div class="subtask-add-row">
          <input id="new-subtask-input" class="form-input" placeholder="Thêm bước..." style="font-size:12px;padding:6px 10px"
            onkeydown="if(event.key==='Enter')addSubtaskUI('${taskId}')">
          <button class="btn btn-ghost btn-sm" onclick="addSubtaskUI('${taskId}')">+</button>
        </div>
        ${subtasks.length > 0 ? `<div class="subtask-progress-wrap"><div class="subtask-progress-fill" style="width:${Math.round(subDone/subtasks.length*100)}%"></div></div>` : ''}
      </div>

      <div class="form-group">
        <label class="form-label">Ghi chú</label>
        <textarea id="edit-task-note" class="form-textarea">${escapeHtml(task.note||'')}</textarea>
      </div>
      ${taskLogs.length > 0 ? `
        <div class="form-group">
          <label class="form-label">📊 Lịch sử thời gian</label>
          <div style="font-size:12px;color:var(--text-muted)">
            ${taskLogs.slice(0,5).map(l => `<div style="padding:4px 0;border-bottom:1px solid var(--border)">${l.type === 'pomodoro' ? '🍅' : '⏱️'} ${formatDate(l.startTime)} — ${formatDuration(l.duration)}</div>`).join('')}
            ${taskLogs.length > 5 ? `<div style="padding:4px 0;color:var(--text-muted)">+ ${taskLogs.length-5} mục khác...</div>` : ''}
          </div>
        </div>` : ''}
      <div class="flex items-center gap-2 mt-2">
        <button class="btn btn-primary btn-sm" onclick="startPomodoroForTask('${taskId}')">🍅 Bắt đầu Pomodoro</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteTask('${taskId}')">🗑️ Xóa</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitEditTask('${taskId}')">Lưu thay đổi</button>
    </div>
  </div>`);
}

// Subtask UI handlers (live in modal, no full re-render)
function addSubtaskUI(taskId) {
  const input = document.getElementById('new-subtask-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  addSubtask(taskId, text);
  input.value = '';
  const task = getTaskById(taskId);
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter(s => s.done).length;
  // Refresh subtask list only
  const list = document.getElementById('subtask-list');
  if (list) list.innerHTML = subtasks.map(s => `
    <div class="subtask-item" id="sub-${s.id}">
      <label class="subtask-check-label">
        <input type="checkbox" ${s.done?'checked':''} onchange="onSubtaskToggle('${taskId}','${s.id}',this)">
        <span class="subtask-text ${s.done?'done':''}">${escapeHtml(s.text)}</span>
      </label>
      <button class="subtask-del" onclick="onSubtaskDelete('${taskId}','${s.id}')" title="Xóa">✕</button>
    </div>`).join('');
  input.focus();
}
function onSubtaskToggle(taskId, subId, checkbox) {
  toggleSubtask(taskId, subId);
  const span = checkbox.nextElementSibling;
  if (span) span.classList.toggle('done', checkbox.checked);
  const task = getTaskById(taskId);
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter(s => s.done).length;
  const fill = document.querySelector('.subtask-progress-fill');
  if (fill) fill.style.width = `${Math.round(subDone/subtasks.length*100)}%`;
}
function onSubtaskDelete(taskId, subId) {
  deleteSubtask(taskId, subId);
  const el = document.getElementById(`sub-${subId}`);
  if (el) el.remove();
}


function submitEditTask(taskId) {
  const title = document.getElementById('edit-task-title')?.value.trim();
  if (!title) { showToast('Tên task không được để trống!', 'error'); return; }
  const projectId = document.getElementById('edit-task-project')?.value || null;
  const priority = document.getElementById('edit-task-priority')?.value;
  const deadline = document.getElementById('edit-task-deadline')?.value || null;
  const estimatedHours = parseFloat(document.getElementById('edit-task-hours')?.value) || 0;
  const columnId = document.getElementById('edit-task-col')?.value;
  const note = document.getElementById('edit-task-note')?.value;
  const task = getTaskById(taskId);
  const col = getAllColumns().find(c => c.id === columnId);
  const completedAt = col && col.title.includes('Hoàn thành') && !task?.completedAt ? now() : (col && !col.title.includes('Hoàn thành') ? null : task?.completedAt);
  updateTask(taskId, { title, projectId, priority, deadline, estimatedHours, columnId, note, completedAt });
  closeModal();
  showToast('Đã cập nhật task!', 'success');
  renderCurrentPage();
}

function confirmDeleteTask(taskId) {
  if (confirm('Xóa task này?')) {
    deleteTask(taskId);
    closeModal();
    showToast('Đã xóa task!', 'info');
    renderCurrentPage();
  }
}

function startPomodoroForTask(taskId) {
  const task = getTaskById(taskId);
  closeModal();
  navigateTo('time');
  setTimeout(() => {
    switchTimeTab('pomodoro');
    if (task && window._pomodoroState) {
      window._pomodoroState.taskId = taskId;
      window._pomodoroState.taskName = task.title;
    }
    const taskSel = document.getElementById('pomo-task-select');
    if (taskSel) taskSel.value = taskId;
  }, 100);
}

function toggleDailyTaskGroup(colId) {
  if (_expandedDailyGroups.has(colId)) _expandedDailyGroups.delete(colId);
  else _expandedDailyGroups.add(colId);
  const card = document.getElementById(`daily-group-${colId}`);
  if (!card) return;
  card.classList.toggle('expanded', _expandedDailyGroups.has(colId));
  const caret = card.querySelector('.daily-task-group-caret');
  if (caret) caret.textContent = _expandedDailyGroups.has(colId) ? '⌃' : '⌄';
}

function completeDailyTaskFromGroup(event, taskId) {
  event.stopPropagation();
  const checkbox = event.target;
  if (!checkbox.checked) return;
  const task = getTaskById(taskId);
  if (!task) return;

  const doneCol = getColumns(task.projectId || null).find(c => c.title.includes('Hoàn thành'))
    || getAllColumns().find(c => c.title.includes('Hoàn thành'));
  const nextOrder = doneCol ? getTasksByColumn(doneCol.id).length : task.order;
  updateTask(taskId, {
    completedAt: now(),
    status: 'done',
    columnId: doneCol ? doneCol.id : task.columnId,
    order: nextOrder,
  });

  playTaskComplete();
  showToast('Đã tick xong task hằng ngày!', 'success');
  renderCurrentPage();
  if (_tasksTab === 'kanban') setTimeout(() => initTasksDnD(), 50);
}

function initTasksDnD() {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  // Make all cards draggable
  board.querySelectorAll('.task-card').forEach(card => { card.setAttribute('draggable', 'true'); });
  initKanbanDnD(board, (taskId, colId, order) => {
    const task = moveTask(taskId, colId, order);
    if (task && task.completedAt && !task._confettied) {
      task._confettied = true;
      launchConfetti();
      playTaskComplete();
      showToast('Task hoàn thành! 🎉', 'success');
    }
    // Re-render cards only
    const col = getAllColumns().find(c => c.id === colId);
    if (col) {
      const cardsEl = document.getElementById(`cards-${colId}`);
      if (cardsEl) {
        const tasks = getTasksByColumn(colId);
        cardsEl.innerHTML = renderColumnCards(colId, col.projectId || null, tasks, null, false);
        cardsEl.querySelectorAll('.task-card').forEach(c => c.setAttribute('draggable','true'));
      }
      // Update count
      const countEl = document.querySelector(`#col-${colId} .col-count`);
      if (countEl) countEl.textContent = getTasksByColumn(colId).length;
    }
    setTimeout(() => initTasksDnD(), 50);
  });
}

// Called after tasks page is rendered
function afterRenderTasks() {
  if (_tasksTab === 'kanban') setTimeout(() => initTasksDnD(), 50);
}

/* ============================================
   RECURRING TASKS — Management Section
   ============================================ */

const WEEKDAY_NAMES = ['CN','T2','T3','T4','T5','T6','T7'];
const WEEKDAY_FULL  = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

function renderRecurringSection() {
  const templates = getRecurring();
  if (templates.length === 0) {
    return `<div class="recurring-empty">
      <div class="recurring-empty-icon">🔁</div>
      <h3>Chưa có task lặp lại nào</h3>
      <p>Tạo template để app tự động sinh task mỗi ngày hoặc theo lịch.</p>
      <button class="btn btn-primary" onclick="openAddRecurringModal()">+ Tạo task lặp lại</button>
    </div>`;
  }
  return `
  <div class="recurring-header-row">
    <span style="font-size:13px;color:var(--text-muted)">${templates.length} template – App tự tạo task theo lịch mỗi ngày khi mở.</span>
    <button class="btn btn-primary btn-sm" onclick="openAddRecurringModal()">+ Thêm mới</button>
  </div>
  <div class="recurring-list">
    ${templates.map(t => renderRecurringCard(t)).join('')}
  </div>`;
}

function renderRecurringCard(t) {
  const project = t.projectId ? getProjectById(t.projectId) : null;
  const repeatLabel = getRepeatLabel(t);
  const instanceCount = getTasks().filter(tk => tk.recurringId === t.id).length;
  const subtaskCount = (t.subtasks || []).length;
  return `<div class="recurring-card ${t.active?'':'paused'}">
    <div class="recurring-card-left">
      <div class="recurring-card-indicator ${t.active?'active':'paused'}"></div>
    </div>
    <div class="recurring-card-body">
      <div class="recurring-card-title">${escapeHtml(t.title)}</div>
      <div class="recurring-card-meta">
        <span class="recurring-repeat-badge">🔁 ${repeatLabel}</span>
        ${t.startDate ? `<span>📅 Từ ${t.startDate}</span>` : ''}
        ${t.endDate   ? `<span>→ ${t.endDate}</span>` : '<span style="color:var(--text-muted)">Vô thời hạn</span>'}
        ${project ? `<span class="task-project-dot" style="background:${safeCssColor(project.color)}">${escapeHtml(project.name)}</span>` : ''}
        ${priorityBadge(t.priority)}
        ${subtaskCount ? `<span style="color:var(--text-muted);font-size:11px">✅ ${subtaskCount} task con</span>` : ''}
        <span style="color:var(--text-muted);font-size:11px">📝 ${instanceCount} task đã tạo</span>
      </div>
    </div>
    <div class="recurring-card-actions">
      <button class="btn btn-ghost btn-sm" onclick="toggleRecurringActive('${t.id}')" title="${t.active?'Tạm dừng':'Kích hoạt'}">${t.active?'⏸':'▶️'}</button>
      <button class="btn btn-ghost btn-sm" onclick="openEditRecurringModal('${t.id}')" title="Chỉnh sửa">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteRecurring('${t.id}')" title="Xóa">🗑️</button>
    </div>
  </div>`;
}

function getRepeatLabel(t) {
  if (t.repeatType === 'daily') return 'Mỗi ngày';
  if (t.repeatType === 'interval') return `Mỗi ${t.intervalDays} ngày`;
  if (t.repeatType === 'weekly') {
    const days = (t.weekDays || []).map(d => WEEKDAY_NAMES[d]).join(', ');
    return `Hàng tuần (${days})`;
  }
  return 'Không xác định';
}

function toggleRecurringActive(id) {
  const t = getRecurringById(id);
  if (!t) return;
  updateRecurring(id, { active: !t.active });
  showToast(t.active ? '⏸ Đã tạm dừng template' : '▶️ Đã kích hoạt template', 'info');
  renderCurrentPage();
}

function confirmDeleteRecurring(id) {
  const t = getRecurringById(id);
  if (!t) return;
  const instanceCount = getTasks().filter(tk => tk.recurringId === id).length;
  const msg = instanceCount > 0
    ? `Xóa template "${t.title}"? ${instanceCount} task đã tạo sẽ KHÔNG bị xóa.`
    : `Xóa template "${t.title}"?`;
  if (confirm(msg)) {
    deleteRecurring(id);
    showToast('Đã xóa template!', 'info');
    renderCurrentPage();
  }
}

/* ---- Add / Edit Recurring Modal ---- */

function openAddRecurringModal() {
  _tasksTab = 'recurring';
  openRecurringModal(null);
}

function openEditRecurringModal(id) {
  openRecurringModal(id);
}

function openRecurringModal(id) {
  const isEdit = !!id;
  const t = isEdit ? getRecurringById(id) : null;
  const projects = getProjects();
  const cols = getAllColumns().filter(c => !c.projectId);

  const repeatType   = t?.repeatType   || 'daily';
  const intervalDays = t?.intervalDays || 1;
  const weekDays     = t?.weekDays     || [1,2,3,4,5];
  const subtasks     = t?.subtasks || [];

  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">${isEdit?'✏️ Chỉnh sửa':'🔁 Tạo'} Task lặp lại</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Tên task</label>
        <input id="rec-title" class="form-input" placeholder="VD: Gửi báo cáo hàng ngày" value="${escapeHtml(t?.title||'')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Dự án</label>
          <select id="rec-project" class="form-select">
            <option value="">— Không thuộc dự án —</option>
            ${projects.map(p => `<option value="${p.id}" ${t?.projectId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Độ ưu tiên</label>
          <select id="rec-priority" class="form-select">
            <option value="high"   ${t?.priority==='high'  ?'selected':''}>🔴 Cao</option>
            <option value="medium" ${t?.priority==='medium'?'selected':''}>🟡 Trung bình</option>
            <option value="low"    ${t?.priority==='low'   ?'selected':''}>🟢 Thấp</option>
          </select>
        </div>
      </div>

      <!-- Repeat Type -->
      <div class="form-group">
        <label class="form-label">Kiểu lặp lại</label>
        <div class="repeat-type-row">
          <label class="repeat-type-opt ${repeatType==='daily'   ?'active':''}">
            <input type="radio" name="rec-repeat" value="daily"    ${repeatType==='daily'   ?'checked':''} onchange="onRepeatTypeChange()">
            <span>📅 Mỗi ngày</span>
          </label>
          <label class="repeat-type-opt ${repeatType==='weekly'  ?'active':''}">
            <input type="radio" name="rec-repeat" value="weekly"   ${repeatType==='weekly'  ?'checked':''} onchange="onRepeatTypeChange()">
            <span>📆 Hàng tuần</span>
          </label>
          <label class="repeat-type-opt ${repeatType==='interval'?'active':''}">
            <input type="radio" name="rec-repeat" value="interval" ${repeatType==='interval'?'checked':''} onchange="onRepeatTypeChange()">
            <span>🔢 Mỗi N ngày</span>
          </label>
        </div>
      </div>

      <!-- Weekly options -->
      <div id="rec-weekly-opts" class="form-group" style="display:${repeatType==='weekly'?'block':'none'}">
        <label class="form-label">Ngày trong tuần</label>
        <div class="weekday-picker">
          ${[0,1,2,3,4,5,6].map(d => `
            <label class="weekday-btn ${weekDays.includes(d)?'active':''}">
              <input type="checkbox" value="${d}" ${weekDays.includes(d)?'checked':''} class="rec-weekday-cb" onchange="toggleWeekdayBtn(this)">
              ${WEEKDAY_NAMES[d]}
            </label>`).join('')}
        </div>
      </div>

      <!-- Interval options -->
      <div id="rec-interval-opts" class="form-group" style="display:${repeatType==='interval'?'block':'none'}">
        <label class="form-label">Cách mỗi bao nhiêu ngày?</label>
        <input id="rec-interval-days" type="number" min="2" max="365" class="form-input" value="${intervalDays}" style="max-width:140px">
      </div>

      <!-- Date range -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Ngày bắt đầu</label>
          <input id="rec-start" type="date" class="form-input" value="${t?.startDate||today()}">
        </div>
        <div class="form-group">
          <label class="form-label">Ngày kết thúc <span style="color:var(--text-muted);font-weight:400">(để trống = vô hạn)</span></label>
          <input id="rec-end" type="date" class="form-input" value="${t?.endDate||''}">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Cột mặc định</label>
          <select id="rec-col" class="form-select">
            ${cols.map(c => `<option value="${c.id}" ${t?.columnId===c.id?'selected':''}>${escapeHtml(c.title)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ước tính (giờ)</label>
          <input id="rec-hours" type="number" min="0" step="0.5" class="form-input" value="${t?.estimatedHours||0}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Task con</label>
        <div class="rec-subtask-field">
          <div class="rec-subtask-desc">Các dòng này sẽ có ô tick trong task được tạo mỗi ngày.</div>
          <div id="rec-subtask-list" class="rec-subtask-list">
            ${renderRecurringSubtaskRows(subtasks)}
          </div>
          <div class="subtask-add-row">
            <input id="rec-new-subtask-input" class="form-input" placeholder="VD: Kiểm tra inbox, gửi báo cáo..." style="font-size:12px;padding:6px 10px"
              onkeydown="if(event.key==='Enter')addRecurringSubtaskUI()">
            <button class="btn btn-ghost btn-sm" onclick="addRecurringSubtaskUI()">+</button>
          </div>
        </div>
        <label class="form-label">Ghi chú</label>
        <textarea id="rec-note" class="form-textarea" placeholder="Ghi chú..." style="min-height:60px">${escapeHtml(t?.note||'')}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitRecurringModal('${id||''}')">${isEdit?'Lưu thay đổi':'Tạo template'}</button>
    </div>
  </div>`);
}

function renderRecurringSubtaskRows(subtasks) {
  const valid = (subtasks || []).filter(s => s && String(s.text || '').trim());
  if (!valid.length) {
    return `<div class="rec-subtask-empty">Chưa có task con. Thêm các bước nhỏ để checklist hằng ngày gọn hơn.</div>`;
  }
  return valid.map(s => renderRecurringSubtaskRow(s.text, s.id || genId())).join('');
}

function renderRecurringSubtaskRow(text, id) {
  return `<div class="subtask-item rec-subtask-item" data-sub-id="${escapeHtml(id)}">
    <label class="subtask-check-label">
      <input type="checkbox" disabled>
      <input class="form-input rec-subtask-text" value="${escapeHtml(text)}" placeholder="Tên task con..." style="font-size:12px;padding:6px 8px">
    </label>
    <button class="subtask-del" onclick="deleteRecurringSubtaskUI('${escapeHtml(id)}')" title="Xóa">✕</button>
  </div>`;
}

function addRecurringSubtaskUI() {
  const input = document.getElementById('rec-new-subtask-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const list = document.getElementById('rec-subtask-list');
  if (!list) return;
  const empty = list.querySelector('.rec-subtask-empty');
  if (empty) empty.remove();
  list.insertAdjacentHTML('beforeend', renderRecurringSubtaskRow(text, genId()));
  input.value = '';
  input.focus();
}

function deleteRecurringSubtaskUI(id) {
  const selectorId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
  const row = document.querySelector(`.rec-subtask-item[data-sub-id="${selectorId}"]`);
  if (row) row.remove();
  const list = document.getElementById('rec-subtask-list');
  if (list && !list.querySelector('.rec-subtask-item')) {
    list.innerHTML = `<div class="rec-subtask-empty">Chưa có task con. Thêm các bước nhỏ để checklist hằng ngày gọn hơn.</div>`;
  }
}

function syncRecurringSubtasksToOpenInstances(recurringId, templateSubtasks) {
  const tasks = getTasks();
  let changed = false;
  const normalizedTemplate = (templateSubtasks || []).filter(s => s && String(s.text || '').trim());
  tasks.forEach(task => {
    if (task.recurringId !== recurringId || task.completedAt) return;
    const current = task.subtasks || [];
    task.subtasks = normalizedTemplate.map(sub => {
      const existing = current.find(item => item.text === sub.text);
      return {
        id: existing?.id || genId(),
        text: sub.text,
        done: !!existing?.done,
      };
    });
    changed = true;
  });
  if (changed) saveTasks(tasks);
}

function onRepeatTypeChange() {
  const val = document.querySelector('[name="rec-repeat"]:checked')?.value;
  // Update radio label active state
  document.querySelectorAll('.repeat-type-opt').forEach(el => {
    el.classList.toggle('active', el.querySelector('input')?.value === val);
  });
  const weeklyEl   = document.getElementById('rec-weekly-opts');
  const intervalEl = document.getElementById('rec-interval-opts');
  if (weeklyEl)   weeklyEl.style.display   = val === 'weekly'   ? 'block' : 'none';
  if (intervalEl) intervalEl.style.display = val === 'interval' ? 'block' : 'none';
}

function toggleWeekdayBtn(checkbox) {
  const label = checkbox.closest('.weekday-btn');
  if (label) label.classList.toggle('active', checkbox.checked);
}

function submitRecurringModal(existingId) {
  const title = document.getElementById('rec-title')?.value.trim();
  if (!title) { showToast('Vui lòng nhập tên task!', 'error'); return; }

  const repeatType = document.querySelector('[name="rec-repeat"]:checked')?.value || 'daily';
  const intervalDays = parseInt(document.getElementById('rec-interval-days')?.value) || 1;
  const weekDaysCbs  = document.querySelectorAll('.rec-weekday-cb:checked');
  const weekDays     = Array.from(weekDaysCbs).map(cb => parseInt(cb.value));
  if (repeatType === 'weekly' && weekDays.length === 0) {
    showToast('Chọn ít nhất 1 ngày trong tuần!', 'error'); return;
  }

  const subtasks = Array.from(document.querySelectorAll('.rec-subtask-item'))
    .map(row => ({
      id: row.dataset.subId || genId(),
      text: row.querySelector('.rec-subtask-text')?.value.trim() || '',
      done: false,
    }))
    .filter(s => s.text);

  const data = {
    title,
    projectId:      document.getElementById('rec-project')?.value || null,
    priority:       document.getElementById('rec-priority')?.value || 'medium',
    estimatedHours: parseFloat(document.getElementById('rec-hours')?.value) || 0,
    note:           document.getElementById('rec-note')?.value || '',
    columnId:       document.getElementById('rec-col')?.value || 'col-todo',
    startDate:      document.getElementById('rec-start')?.value || today(),
    endDate:        document.getElementById('rec-end')?.value   || null,
    repeatType,
    intervalDays,
    weekDays,
    subtasks,
  };

  if (existingId) {
    // Reset lastGenerated so engine re-evaluates from startDate
    updateRecurring(existingId, { ...data, lastGenerated: null });
    syncRecurringSubtasksToOpenInstances(existingId, subtasks);
    showToast('Đã cập nhật template!', 'success');
  } else {
    addRecurring(data);
    showToast('Đã tạo task lặp lại!', 'success');
  }

  closeModal();
  // Run engine immediately to generate for today
  processRecurringTasks();
  _tasksTab = 'recurring';
  renderCurrentPage();
}
