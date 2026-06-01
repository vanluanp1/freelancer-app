/* ============================================
   PROJECTS.JS — Projects list + detail
   ============================================ */

let _projectFilter = 'all';
let _currentProjectId = null;
let _projectTab = 'board';

function renderProjects() {
  if (_currentProjectId) return renderProjectDetail(_currentProjectId);
  return renderProjectList();
}

function renderProjectList() {
  const projects = getProjects();
  const filtered = _projectFilter === 'all' ? projects : projects.filter(p => p.status === _projectFilter);
  const filters = [
    { v: 'all', l: 'Tất cả' }, { v: 'active', l: '🟢 Đang chạy' },
    { v: 'paused', l: '🟡 Tạm dừng' }, { v: 'done', l: '✅ Hoàn thành' },
    { v: 'cancelled', l: '🔴 Đã hủy' }
  ];

  return `
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">📁 Dự án</h1>
        <p class="page-subtitle">Quản lý tất cả dự án của bạn</p>
      </div>
      <button class="btn btn-primary" onclick="openAddProjectModal()">+ Dự án mới</button>
    </div>
  </div>
  <div class="page-body">
    <!-- Filter Tabs -->
    <div class="tabs mb-4">
      ${filters.map(f => `<button class="tab-btn ${_projectFilter===f.v?'active':''}" onclick="setProjectFilter('${f.v}')">${f.l}</button>`).join('')}
    </div>

    ${filtered.length === 0 ?
      `<div class="no-data"><div class="no-data-icon">📁</div><p>Không có dự án nào</p><br><button class="btn btn-primary" onclick="openAddProjectModal()">Tạo dự án đầu tiên</button></div>` :
      `<div class="project-grid">
        ${filtered.map(p => renderProjectCard(p)).join('')}
      </div>`}
  </div>`;
}

function renderProjectCard(p) {
  const stats = getProjectStats(p.id);
  const dl = p.deadline ? daysUntil(p.deadline) : null;
  return `<div class="project-card" onclick="openProjectDetail('${p.id}')">
    <div class="project-card-header" style="background:${safeCssColor(p.color)}"></div>
    <div class="project-card-body">
      <div class="flex items-center justify-between mb-2">
        <div class="project-card-title">${escapeHtml(p.name)}</div>
        ${statusBadge(p.status)}
      </div>
      ${p.client ? `<div class="project-card-client">👤 ${escapeHtml(p.client)}</div>` : ''}
      ${p.deadline ? `<div class="text-sm text-muted mb-2">${dl !== null && dl < 0 ? `⚠️ Đã hết hạn ${Math.abs(dl)} ngày trước` : dl === 0 ? '⏰ Hết hạn hôm nay' : `📅 Còn ${dl} ngày`}</div>` : ''}
      <div class="progress-bar-wrap mb-2">
        <div class="progress-bar-fill" style="width:${stats.pct}%;background:${safeCssColor(p.color)}"></div>
      </div>
      <div class="project-card-stats">
        <span>✅ ${stats.done}/${stats.total} task</span>
        <span>⏱️ ${formatHours(stats.workedSec)}</span>
        <span>${stats.pct}% xong</span>
      </div>
    </div>
  </div>`;
}

function setProjectFilter(f) {
  _projectFilter = f;
  renderCurrentPage();
}

function openProjectDetail(projectId) {
  _currentProjectId = projectId;
  _projectTab = 'board';
  renderCurrentPage();
  setTimeout(() => initTasksDnD(), 100);
}

function backToProjects() {
  _currentProjectId = null;
  renderCurrentPage();
}

function renderProjectDetail(projectId) {
  const p = getProjectById(projectId);
  if (!p) { _currentProjectId = null; return renderProjectList(); }
  const stats = getProjectStats(projectId);
  const cols = ensureProjectColumns(projectId);

  return `
  <div class="project-detail-header">
    <div class="flex items-center gap-3">
      <button class="btn btn-ghost btn-sm" onclick="backToProjects()">← Quay lại</button>
      <div style="width:14px;height:14px;border-radius:50%;background:${safeCssColor(p.color)}"></div>
      <div>
        <h1 class="page-title" style="font-size:18px">${escapeHtml(p.name)}</h1>
        ${p.client ? `<p class="page-subtitle">👤 ${escapeHtml(p.client)}</p>` : ''}
      </div>
      ${statusBadge(p.status)}
    </div>
    <div class="flex items-center gap-2">
      <div style="font-size:13px;color:var(--text-muted)">${stats.pct}% hoàn thành</div>
      <button class="btn btn-ghost btn-sm" onclick="openEditProjectModal('${projectId}')">✏️ Chỉnh sửa</button>
    </div>
  </div>
  <div class="page-body">
    <!-- Progress -->
    <div class="progress-bar-wrap mb-4" style="height:8px">
      <div class="progress-bar-fill" style="width:${stats.pct}%;background:${safeCssColor(p.color)}"></div>
    </div>

    <!-- Tabs -->
    <div class="tabs mb-4">
      <button class="tab-btn ${_projectTab==='board'?'active':''}" onclick="switchProjectTab('board')">🗂️ Board</button>
      <button class="tab-btn ${_projectTab==='overview'?'active':''}" onclick="switchProjectTab('overview')">📊 Tổng quan</button>
      <button class="tab-btn ${_projectTab==='recurring'?'active':''}" onclick="switchProjectTab('recurring')">🔁 Lặp lại <span class="recurring-count-badge" style="font-size:10px">${getRecurring().filter(r=>r.projectId===projectId).length}</span></button>
      <button class="tab-btn ${_projectTab==='notes'?'active':''}" onclick="switchProjectTab('notes')">📝 Ghi chú</button>
    </div>

    ${_projectTab === 'board' ? renderProjectBoard(p, cols) : ''}
    ${_projectTab === 'overview' ? renderProjectOverview(p, stats) : ''}
    ${_projectTab === 'recurring' ? renderProjectRecurring(projectId) : ''}
    ${_projectTab === 'notes' ? renderProjectNotes(p) : ''}
  </div>`;
}

function renderProjectBoard(p, cols) {
  return `<div class="kanban-wrapper">
    <div class="kanban-board" id="kanban-board">
      ${cols.map(col => renderColumn(col, p.id)).join('')}
      <div style="padding-top:8px">
        <button class="btn btn-ghost btn-sm" onclick="openAddColumnModal('${p.id}')">+ Thêm cột</button>
      </div>
    </div>
  </div>`;
}

function renderProjectOverview(p, stats) {
  const logs = getTimeLogs().filter(l => l.projectId === p.id);
  // Group by day (last 7 days)
  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return toDateStr(d);
  });
  const maxH = Math.max(1, ...days.map(d => logs.filter(l => l.date === d).reduce((s, l) => s + l.duration, 0) / 3600));
  const allTasks = getTasks().filter(t => t.projectId === p.id);
  const colCounts = {};
  getAllColumns().filter(c => c.projectId === p.id || !c.projectId).forEach(c => {
    colCounts[c.title] = allTasks.filter(t => t.columnId === c.id).length;
  });

  return `
  <div class="stats-row mb-4">
    <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-info"><div class="stat-value">${stats.pct}%</div><div class="stat-label">Tiến độ</div></div></div>
    <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-info"><div class="stat-value">${formatHours(stats.workedSec)}</div><div class="stat-label">Giờ đã làm</div></div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-value">${stats.done}/${stats.total}</div><div class="stat-label">Task xong</div></div></div>
    ${p.budget ? `<div class="stat-card"><div class="stat-icon">💰</div><div class="stat-info"><div class="stat-value">${Number(p.budget).toLocaleString('vi-VN')}</div><div class="stat-label">Ngân sách (${p.budgetCurrency})</div></div></div>` : ''}
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="card">
      <div class="section-title mb-3"><span>📅</span> Giờ làm 7 ngày qua</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="chart-bar-group">
          ${days.map(d => {
            const h = logs.filter(l => l.date === d).reduce((s,l)=>s+l.duration,0)/3600;
            const pct = (h / maxH * 100);
            return `<div class="chart-bar" style="height:${pct}%;background:${safeCssColor(p.color)}" title="${h.toFixed(1)}h"></div>`;
          }).join('')}
        </div>
        <div class="chart-labels">
          ${days.map(d => `<div class="chart-label">${VI_DAYS[new Date(d).getDay()]}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="section-title mb-3"><span>🗂️</span> Task theo trạng thái</div>
      ${Object.entries(colCounts).map(([title, count]) => `
        <div class="flex items-center justify-between mb-2">
          <span style="font-size:13px">${escapeHtml(title)}</span>
          <span class="badge badge-active">${count}</span>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderProjectNotes(p) {
  return `<div class="card">
    <div class="flex items-center justify-between mb-3">
      <div class="section-title" style="margin:0"><span>📝</span> Ghi chú dự án</div>
      <span id="notes-save-indicator" style="font-size:12px;color:var(--success)"></span>
    </div>
    <textarea id="project-notes-area" class="form-textarea" style="min-height:300px;font-size:13px"
      placeholder="Ghi lại cập nhật tiến độ, link tài liệu, ghi chú với khách hàng..."
      oninput="onProjectNotesChange('${p.id}')">${escapeHtml(p.notes || '')}</textarea>
  </div>`;
}

const _notesDebounce = debounce((id, val) => {
  updateProject(id, { notes: val });
  showSaveIndicator('notes-save-indicator');
}, 1500);

function onProjectNotesChange(projectId) {
  const val = document.getElementById('project-notes-area')?.value || '';
  _notesDebounce(projectId, val);
}

function switchProjectTab(tab) {
  _projectTab = tab;
  renderCurrentPage();
  if (tab === 'board') setTimeout(() => initTasksDnD(), 100);
}

// ---- Add / Edit Project Modal ----
function openAddProjectModal() {
  openProjectModal(null);
}
function openEditProjectModal(id) {
  openProjectModal(id);
}

function openProjectModal(id) {
  const p = id ? getProjectById(id) : null;
  const now2 = today();
  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">${id ? '✏️ Chỉnh sửa dự án' : '📁 Tạo dự án mới'}</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Tên dự án *</label>
        <input id="pm-name" class="form-input" value="${escapeHtml(p?.name||'')}" placeholder="Tên dự án...">
      </div>
      <div class="form-group">
        <label class="form-label">Khách hàng / Đối tác</label>
        <input id="pm-client" class="form-input" value="${escapeHtml(p?.client||'')}" placeholder="Tên khách hàng...">
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả</label>
        <textarea id="pm-desc" class="form-textarea" placeholder="Mô tả ngắn...">${escapeHtml(p?.description||'')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Màu đại diện</label>
        <div id="pm-color-swatches" data-selected="${safeCssColor(p?.color, PROJECT_COLORS[0])}">
          ${colorSwatchesHTML(safeCssColor(p?.color, PROJECT_COLORS[0]),'pm-color')}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Ngày bắt đầu</label>
          <input id="pm-start" type="date" class="form-input" value="${p?.startDate||now2}">
        </div>
        <div class="form-group">
          <label class="form-label">Deadline</label>
          <input id="pm-deadline" type="date" class="form-input" value="${p?.deadline?p.deadline.slice(0,10):''}">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Ngân sách (tùy chọn)</label>
          <input id="pm-budget" type="number" class="form-input" value="${p?.budget||''}" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">Đơn vị</label>
          <select id="pm-currency" class="form-select">
            <option value="VND" ${p?.budgetCurrency!=='USD'?'selected':''}>VNĐ</option>
            <option value="USD" ${p?.budgetCurrency==='USD'?'selected':''}>USD</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="pm-status" class="form-select">
          <option value="active" ${(!p||p.status==='active')?'selected':''}>🟢 Đang chạy</option>
          <option value="paused" ${p?.status==='paused'?'selected':''}>🟡 Tạm dừng</option>
          <option value="done" ${p?.status==='done'?'selected':''}>✅ Hoàn thành</option>
          <option value="cancelled" ${p?.status==='cancelled'?'selected':''}>🔴 Đã hủy</option>
        </select>
      </div>
      ${id ? `<hr class="divider"><button class="btn btn-danger btn-sm" onclick="confirmDeleteProject('${id}')">🗑️ Xóa dự án</button>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitProjectModal('${id||''}')">
        ${id ? 'Lưu thay đổi' : 'Tạo dự án'}
      </button>
    </div>
  </div>`);

  // Color swatch interaction
  document.querySelectorAll('#pm-color-swatches .color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#pm-color-swatches .color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      document.getElementById('pm-color-swatches').dataset.selected = sw.dataset.color;
    });
  });
}

function submitProjectModal(id) {
  const name = document.getElementById('pm-name')?.value.trim();
  if (!name) { showToast('Vui lòng nhập tên dự án!', 'error'); return; }
  const data = {
    name,
    client: document.getElementById('pm-client')?.value.trim() || '',
    description: document.getElementById('pm-desc')?.value || '',
    color: document.getElementById('pm-color-swatches')?.dataset.selected || PROJECT_COLORS[0],
    startDate: document.getElementById('pm-start')?.value || today(),
    deadline: document.getElementById('pm-deadline')?.value || null,
    budget: parseFloat(document.getElementById('pm-budget')?.value) || null,
    budgetCurrency: document.getElementById('pm-currency')?.value || 'VND',
    status: document.getElementById('pm-status')?.value || 'active',
  };
  if (id) { updateProject(id, data); showToast('Đã cập nhật dự án!', 'success'); }
  else { addProject(data); showToast('Đã tạo dự án mới!', 'success'); }
  closeModal();
  renderCurrentPage();
}

function confirmDeleteProject(id) {
  if (confirm('Xóa dự án này? Task liên quan sẽ không còn thuộc dự án nào.')) {
    deleteProject(id);
    if (_currentProjectId === id) _currentProjectId = null;
    closeModal();
    showToast('Đã xóa dự án!', 'info');
    renderCurrentPage();
  }
}

/* ============================================
   PROJECT RECURRING TASKS TAB
   ============================================ */

function renderProjectRecurring(projectId) {
  const p = getProjectById(projectId);
  const templates = getRecurring().filter(r => r.projectId === projectId);
  if (templates.length === 0) {
    return `<div class="recurring-empty">
      <div class="recurring-empty-icon">🔁</div>
      <h3>Chưa có task lặp lại nào trong dự án</h3>
      <p>Task lặp lại sẽ tự động xuất hiện ở board và danh sách hôm nay khi đến hạn.</p>
      <button class="btn btn-primary" onclick="openAddProjectRecurringModal('${projectId}')">+ Tạo task lặp lại</button>
    </div>`;
  }
  return `
  <div class="recurring-header-row">
    <span style="font-size:13px;color:var(--text-muted)">${templates.length} template – Tự tạo task theo lịch trong dự án và hiện ở dashboard.</span>
    <button class="btn btn-primary btn-sm" onclick="openAddProjectRecurringModal('${projectId}')">+ Thêm mới</button>
  </div>
  <div class="recurring-list">
    ${templates.map(t => renderRecurringCard(t)).join('')}
  </div>`;
}

function openAddProjectRecurringModal(projectId) {
  // Switch recurring tab in project before opening
  _projectTab = 'recurring';
  openProjectRecurringModal(projectId, null);
}

function openEditProjectRecurringModal(id) {
  const t = getRecurringById(id);
  if (!t) return;
  openProjectRecurringModal(t.projectId, id);
}

function openProjectRecurringModal(projectId, existingId) {
  const isEdit = !!existingId;
  const t = isEdit ? getRecurringById(existingId) : null;
  const p = getProjectById(projectId);
  // Get project columns
  const cols = getAllColumns().filter(c => c.projectId === projectId);
  const globalCols = getAllColumns().filter(c => !c.projectId);
  const allCols = [...cols, ...globalCols];

  const repeatType   = t?.repeatType   || 'daily';
  const intervalDays = t?.intervalDays || 1;
  const weekDays     = t?.weekDays     || [1,2,3,4,5];

  openModal(`<div class="modal">
    <div class="modal-header">
      <span class="modal-title">${isEdit?'✏️ Chỉnh sửa':'🔁 Tạo'} Task lặp lại – ${escapeHtml(p?.name||'')}</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Tên task</label>
        <input id="prec-title" class="form-input" placeholder="VD: Kiểm tra tiến độ hàng ngày" value="${escapeHtml(t?.title||'')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Độ ưu tiên</label>
          <select id="prec-priority" class="form-select">
            <option value="high"   ${t?.priority==='high'  ?'selected':''}>🔴 Cao</option>
            <option value="medium" ${!t||t?.priority==='medium'?'selected':''}>🟡 Trung bình</option>
            <option value="low"    ${t?.priority==='low'   ?'selected':''}>🟢 Thấp</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cột mặc định</label>
          <select id="prec-col" class="form-select">
            ${allCols.map(c => `<option value="${c.id}" ${t?.columnId===c.id?'selected':''}>${escapeHtml(c.title)}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Repeat Type -->
      <div class="form-group">
        <label class="form-label">Kiểu lặp lại</label>
        <div class="repeat-type-row">
          <label class="repeat-type-opt ${repeatType==='daily'   ?'active':''}">
            <input type="radio" name="prec-repeat" value="daily"    ${repeatType==='daily'   ?'checked':''} onchange="onPRecRepeatTypeChange()">
            <span>📅 Mỗi ngày</span>
          </label>
          <label class="repeat-type-opt ${repeatType==='weekly'  ?'active':''}">
            <input type="radio" name="prec-repeat" value="weekly"   ${repeatType==='weekly'  ?'checked':''} onchange="onPRecRepeatTypeChange()">
            <span>📆 Hàng tuần</span>
          </label>
          <label class="repeat-type-opt ${repeatType==='interval'?'active':''}">
            <input type="radio" name="prec-repeat" value="interval" ${repeatType==='interval'?'checked':''} onchange="onPRecRepeatTypeChange()">
            <span>🔢 Mỗi N ngày</span>
          </label>
        </div>
      </div>

      <div id="prec-weekly-opts" class="form-group" style="display:${repeatType==='weekly'?'block':'none'}">
        <label class="form-label">Ngày trong tuần</label>
        <div class="weekday-picker">
          ${[0,1,2,3,4,5,6].map(d => `
            <label class="weekday-btn ${weekDays.includes(d)?'active':''}">
              <input type="checkbox" value="${d}" ${weekDays.includes(d)?'checked':''} class="prec-weekday-cb" onchange="toggleWeekdayBtn(this)">
              ${['CN','T2','T3','T4','T5','T6','T7'][d]}
            </label>`).join('')}
        </div>
      </div>

      <div id="prec-interval-opts" class="form-group" style="display:${repeatType==='interval'?'block':'none'}">
        <label class="form-label">Cách mỗi bao nhiêu ngày?</label>
        <input id="prec-interval-days" type="number" min="2" max="365" class="form-input" value="${intervalDays}" style="max-width:140px">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Ngày bắt đầu</label>
          <input id="prec-start" type="date" class="form-input" value="${t?.startDate||today()}">
        </div>
        <div class="form-group">
          <label class="form-label">Ngày kết thúc <span style="color:var(--text-muted);font-weight:400">(để trống = vô hạn)</span></label>
          <input id="prec-end" type="date" class="form-input" value="${t?.endDate||""}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Ước tính (giờ)</label>
        <input id="prec-hours" type="number" min="0" step="0.5" class="form-input" value="${t?.estimatedHours||0}" style="max-width:120px">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitProjectRecurringModal('${projectId}','${existingId||''}')">${isEdit?'Lưu thay đổi':'Tạo template'}</button>
    </div>
  </div>`);
}

function onPRecRepeatTypeChange() {
  const val = document.querySelector('[name="prec-repeat"]:checked')?.value;
  document.querySelectorAll('.repeat-type-opt').forEach(el => {
    const inp = el.querySelector('input[name="prec-repeat"]');
    if (inp) el.classList.toggle('active', inp.value === val);
  });
  const weeklyEl   = document.getElementById('prec-weekly-opts');
  const intervalEl = document.getElementById('prec-interval-opts');
  if (weeklyEl)   weeklyEl.style.display   = val === 'weekly'   ? 'block' : 'none';
  if (intervalEl) intervalEl.style.display = val === 'interval' ? 'block' : 'none';
}

function submitProjectRecurringModal(projectId, existingId) {
  const title = document.getElementById('prec-title')?.value.trim();
  if (!title) { showToast('Vui lòng nhập tên task!', 'error'); return; }

  const repeatType   = document.querySelector('[name="prec-repeat"]:checked')?.value || 'daily';
  const intervalDays = parseInt(document.getElementById('prec-interval-days')?.value) || 1;
  const weekDaysCbs  = document.querySelectorAll('.prec-weekday-cb:checked');
  const weekDays     = Array.from(weekDaysCbs).map(cb => parseInt(cb.value));
  if (repeatType === 'weekly' && weekDays.length === 0) {
    showToast('Chọn ít nhất 1 ngày trong tuần!', 'error'); return;
  }

  const data = {
    title,
    projectId:      projectId || null,
    priority:       document.getElementById('prec-priority')?.value || 'medium',
    estimatedHours: parseFloat(document.getElementById('prec-hours')?.value) || 0,
    note:           '',
    columnId:       document.getElementById('prec-col')?.value || 'col-todo',
    startDate:      document.getElementById('prec-start')?.value || today(),
    endDate:        document.getElementById('prec-end')?.value   || null,
    repeatType, intervalDays, weekDays,
  };

  if (existingId) {
    updateRecurring(existingId, { ...data, lastGenerated: null });
    showToast('Đã cập nhật template!', 'success');
  } else {
    addRecurring(data);
    showToast('Đã tạo task lặp lại cho dự án!', 'success');
  }

  closeModal();
  processRecurringTasks();
  _projectTab = 'recurring';
  renderCurrentPage();
  setTimeout(() => initTasksDnD && initTasksDnD(), 60);
}

// Called by PAGES registry after every project page render
function afterRenderProjects() {
  // Only init DnD when in project detail board tab
  if (_currentProjectId && _projectTab === 'board') {
    setTimeout(() => initTasksDnD && initTasksDnD(), 80);
  }
}
