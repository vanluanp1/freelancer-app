/* ============================================
   CALENDAR.JS - monthly task calendar
   ============================================ */

let _calendarMonthOffset = 0;
let _calendarDragTaskId = null;

function getCalendarTargetMonth() {
  const base = new Date();
  return new Date(base.getFullYear(), base.getMonth() + _calendarMonthOffset, 1);
}

function renderCalendar() {
  const target = getCalendarTargetMonth();
  const year = target.getFullYear();
  const month = target.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tasks = getTasks().filter(task => !task.completedAt);
  const blocks = getSchedule();
  const undated = tasks.filter(task => !task.deadline).slice(0, 20);
  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, index) => index + 1));
  while (cells.length % 7) cells.push(null);

  return `
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">🗓️ Lịch tháng</h1>
        <p class="page-subtitle">Kéo task sang ngày khác để cập nhật deadline</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddTaskModal({ deadline: today() })">+ Task hôm nay</button>
    </div>
  </div>
  <div class="page-body">
    <div class="calendar-toolbar">
      <button class="btn btn-ghost btn-sm" onclick="changeCalendarMonth(-1)">← Tháng trước</button>
      <h2>Tháng ${month + 1}/${year}</h2>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-sm" onclick="changeCalendarMonth(0)">Hôm nay</button>
        <button class="btn btn-ghost btn-sm" onclick="changeCalendarMonth(1)">Tháng sau →</button>
      </div>
    </div>
    <div class="calendar-layout">
      <div class="month-calendar">
        ${['CN','T2','T3','T4','T5','T6','T7'].map(day => `<div class="month-weekday">${day}</div>`).join('')}
        ${cells.map(day => renderCalendarCell(day, year, month, tasks, blocks)).join('')}
      </div>
      <aside class="calendar-undated">
        <div class="section-title"><span>📋</span> Chưa có deadline</div>
        ${undated.length ? undated.map(task => renderCalendarTask(task)).join('') : '<p class="text-sm text-muted">Không còn task chưa đặt hạn.</p>'}
      </aside>
    </div>
  </div>`;
}

function renderCalendarCell(day, year, month, tasks, blocks) {
  if (!day) return '<div class="month-cell empty"></div>';
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayTasks = tasks.filter(task => task.deadline?.slice(0, 10) === date);
  const dayBlocks = blocks.filter(block => block.date === date);
  return `<div class="month-cell ${date === today() ? 'today' : ''}"
    ondragover="event.preventDefault()" ondrop="onCalendarDrop(event,'${date}')">
    <div class="month-cell-head"><span>${day}</span>${dayTasks.length ? `<b>${dayTasks.length}</b>` : ''}</div>
    <div class="month-cell-items">
      ${dayTasks.slice(0, 5).map(task => renderCalendarTask(task)).join('')}
      ${dayTasks.length > 5 ? `<div class="month-more">+${dayTasks.length - 5} task</div>` : ''}
      ${dayBlocks.slice(0, 2).map(block => `<div class="month-block">⏱️ ${escapeHtml(block.title || '')}</div>`).join('')}
    </div>
  </div>`;
}

function renderCalendarTask(task) {
  const project = task.projectId ? getProjectById(task.projectId) : null;
  return `<div class="month-task priority-${task.priority || 'medium'}" draggable="true"
    ondragstart="onCalendarDragStart(event,'${task.id}')" onclick="openTaskModal('${task.id}')"
    title="${escapeHtml(task.title)}">
    ${project ? `<span style="color:${safeCssColor(project.color)}">●</span>` : ''}${escapeHtml(task.title)}
  </div>`;
}

function changeCalendarMonth(direction) {
  _calendarMonthOffset = direction === 0 ? 0 : _calendarMonthOffset + direction;
  renderCurrentPage();
}

function onCalendarDragStart(event, taskId) {
  _calendarDragTaskId = taskId;
  event.dataTransfer.effectAllowed = 'move';
  event.stopPropagation();
}

function onCalendarDrop(event, date) {
  event.preventDefault();
  if (!_calendarDragTaskId) return;
  updateTask(_calendarDragTaskId, { deadline: date });
  _calendarDragTaskId = null;
  showToast('Đã cập nhật deadline!', 'success');
  renderCurrentPage();
}
