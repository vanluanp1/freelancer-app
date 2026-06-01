/* ============================================
   UTILS.JS — Shared utility functions
   ============================================ */

// UUID
function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Date helpers
function toDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
function today() { return toDateStr(); }
function now() { return new Date().toISOString(); }
function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function formatHours(seconds) {
  return (seconds / 3600).toFixed(1) + 'h';
}
function daysUntil(isoStr) {
  if (!isoStr) return null;
  const diff = new Date(isoStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.round(diff / 86400000);
}
function deadlineLabel(isoStr) {
  if (!isoStr) return '';
  const d = daysUntil(isoStr);
  if (d < 0) return `Trễ ${Math.abs(d)} ngày`;
  if (d === 0) return 'Hôm nay';
  if (d === 1) return 'Ngày mai';
  return `${d} ngày`;
}
function getWeekDays(offsetWeeks = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offsetWeeks * 7);
  return Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function sameDay(a, b) {
  return toDateStr(new Date(a)) === toDateStr(new Date(b));
}

// Vietnamese day names
const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_DAYS_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const VI_MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function formatViDate(date = new Date()) {
  const d = new Date(date);
  return `${VI_DAYS_FULL[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

// Greeting based on hour
function getGreeting(name = '') {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Chào buổi sáng ☀️${name ? ', ' + name : ''}!`;
  if (h >= 12 && h < 18) return `Chào buổi chiều 🌤️${name ? ', ' + name : ''}!`;
  return `Chào buổi tối 🌙${name ? ', ' + name : ''}!`;
}

// Toast notifications
let _toastId = 0;
function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const id = ++_toastId;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.id = `toast-${id}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOutRight 300ms ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// Modal helpers
function openModal(html) {
  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-container');
  container.innerHTML = html;
  backdrop.classList.remove('hidden');
  container.classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.getElementById('modal-container').classList.add('hidden');
  document.getElementById('modal-container').innerHTML = '';
}
document.addEventListener('click', e => {
  if (e.target.id === 'modal-backdrop') closeModal();
  if (e.target.classList.contains('modal-close')) closeModal();
});

// Context menu
function showContextMenu(x, y, items) {
  removeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.id = 'ctx-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  items.forEach(item => {
    if (item === 'divider') {
      const d = document.createElement('div');
      d.style.cssText = 'height:1px;background:var(--border);margin:4px 0;';
      menu.appendChild(d);
      return;
    }
    const el = document.createElement('div');
    el.className = 'ctx-menu-item' + (item.danger ? ' danger' : '');
    el.innerHTML = `<span>${item.icon || ''}</span><span>${item.label}</span>`;
    el.addEventListener('click', () => { removeContextMenu(); item.action(); });
    menu.appendChild(el);
  });
  document.body.appendChild(menu);
  // Adjust if out of viewport
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
}
function removeContextMenu() {
  const m = document.getElementById('ctx-menu');
  if (m) m.remove();
}
document.addEventListener('click', removeContextMenu);
document.addEventListener('contextmenu', removeContextMenu);

// Confetti
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = [];
  const colors = ['#6C63FF','#FF6B6B','#2ED573','#FFA502','#54A0FF','#FF9FF3','#FFD700'];
  for (let i = 0; i < 80; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.2
    });
  }
  let frame;
  let start = null;
  function animate(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.va;
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 1500);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (elapsed < 1500) frame = requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  frame = requestAnimationFrame(animate);
}

// Ripple effect on element
function addRipple(el, e) {
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = (e.clientX - rect.left) - size / 2;
  const y = (e.clientY - rect.top) - size / 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// Circular progress SVG builder
function buildCircularProgress(pct, color, size = 56, strokeW = 4) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (pct / 100));
  return `<div class="circular-progress" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${strokeW}"/>
      <circle class="fill" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-width="${strokeW}"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
        style="fill:none;stroke-linecap:round;transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 600ms ease;"/>
    </svg>
    <div class="cp-text">${Math.round(pct)}%</div>
  </div>`;
}

// Color palette for projects
const PROJECT_COLORS = ['#6C63FF','#FF6B6B','#FFA502','#2ED573','#54A0FF','#FF9FF3','#48DBFB','#FF9F43','#1DD1A1','#F368E0','#EE5A24','#0652DD'];

function colorSwatchesHTML(selected, name='color') {
  return `<div class="color-swatches">
    ${PROJECT_COLORS.map(c => `<div class="color-swatch ${c===selected?'selected':''}" data-color="${c}" style="background:${c}" title="${c}"></div>`).join('')}
  </div>`;
}

// Priority badge
function priorityBadge(p) {
  const map = { high: ['🔴','Cao','badge-high'], medium: ['🟡','Trung bình','badge-medium'], low: ['🟢','Thấp','badge-low'] };
  const [icon, label, cls] = map[p] || map.medium;
  return `<span class="badge ${cls}">${icon} ${label}</span>`;
}

// Status badge
function statusBadge(s) {
  const map = { active: '🟢 Đang chạy', paused: '🟡 Tạm dừng', done: '✅ Hoàn thành', cancelled: '🔴 Đã hủy' };
  const cls = { active:'badge-active', paused:'badge-paused', done:'badge-done', cancelled:'badge-cancelled' };
  return `<span class="badge ${cls[s]||''}">${map[s]||s}</span>`;
}

// Debounce
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Collapsible sections
function initCollapsibles(container) {
  (container || document).querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('open');
    });
  });
}

// Auto-save indicator
let _saveTimeout;
function showSaveIndicator(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = 'Đang lưu...';
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => { el.textContent = 'Đã lưu ✓'; }, 800);
}

// Simple sortable (drag reorder in lists)
function initSortable(container, onDone) {
  let dragSrc = null;
  container.querySelectorAll('[data-id]').forEach(el => {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', () => { dragSrc = el; el.style.opacity = '0.4'; });
    el.addEventListener('dragend', () => { el.style.opacity = ''; });
    el.addEventListener('dragover', e => { e.preventDefault(); });
    el.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrc && dragSrc !== el) {
        const items = [...container.querySelectorAll('[data-id]')];
        const fromIdx = items.indexOf(dragSrc);
        const toIdx = items.indexOf(el);
        if (fromIdx < toIdx) el.after(dragSrc);
        else el.before(dragSrc);
        const newIds = [...container.querySelectorAll('[data-id]')].map(i => i.dataset.id);
        onDone(newIds);
      }
    });
  });
}

// ============================================================
// GLOBAL SEARCH (Ctrl+K / Cmd+K)
// ============================================================
let _searchOpen = false;

function openGlobalSearch() {
  if (_searchOpen) return;
  _searchOpen = true;

  const overlay = document.createElement('div');
  overlay.id = 'search-overlay';
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-palette" id="search-palette">
      <div class="search-palette-input-row">
        <span class="search-icon-lg">🔍</span>
        <input id="global-search-input" class="search-palette-input" placeholder="Tìm task, dự án, nhật ký..." autocomplete="off" autofocus>
        <kbd class="search-esc-hint">ESC</kbd>
      </div>
      <div class="search-results" id="search-results">
        <div class="search-hint">Gõ để tìm kiếm...</div>
      </div>
      <div class="search-palette-footer">
        <span><kbd>↑↓</kbd> Di chuyển</span>
        <span><kbd>Enter</kbd> Mở</span>
        <span><kbd>Esc</kbd> Đóng</span>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const input = document.getElementById('global-search-input');
  input.focus();

  let _selectedIdx = -1;

  input.addEventListener('input', () => {
    _selectedIdx = -1;
    renderSearchResults(input.value.trim());
  });

  input.addEventListener('keydown', e => {
    const items = document.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selectedIdx = Math.min(_selectedIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('selected', i === _selectedIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selectedIdx = Math.max(_selectedIdx - 1, 0);
      items.forEach((el, i) => el.classList.toggle('selected', i === _selectedIdx));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = items[_selectedIdx] || items[0];
      if (sel) sel.click();
    } else if (e.key === 'Escape') {
      closeGlobalSearch();
    }
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeGlobalSearch();
  });
}

function closeGlobalSearch() {
  _searchOpen = false;
  const el = document.getElementById('search-overlay');
  if (el) {
    el.style.animation = 'fadeOut 150ms ease forwards';
    setTimeout(() => el.remove(), 150);
  }
}

function renderSearchResults(query) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (!query) {
    container.innerHTML = '<div class="search-hint">Gõ để tìm kiếm...</div>';
    return;
  }

  const q = query.toLowerCase();
  const results = [];

  // Search tasks
  getTasks().filter(t => t.title.toLowerCase().includes(q) || (t.note||'').toLowerCase().includes(q)).slice(0, 5).forEach(t => {
    const col = getAllColumns().find(c => c.id === t.columnId);
    const proj = t.projectId ? getProjectById(t.projectId) : null;
    results.push({
      icon: t.completedAt ? '✅' : '📋',
      title: t.title,
      meta: [col?.title, proj?.name].filter(Boolean).join(' · '),
      color: proj?.color || 'var(--primary)',
      action: () => { closeGlobalSearch(); setTimeout(() => { navigateTo('tasks'); setTimeout(() => openTaskModal(t.id), 100); }, 50); }
    });
  });

  // Search projects
  getProjects().filter(p => p.name.toLowerCase().includes(q) || (p.client||'').toLowerCase().includes(q)).slice(0, 3).forEach(p => {
    results.push({
      icon: '📁',
      title: p.name,
      meta: p.client ? `👤 ${p.client}` : '',
      color: p.color,
      action: () => { closeGlobalSearch(); setTimeout(() => { _currentProjectId = p.id; navigateTo('projects'); }, 50); }
    });
  });

  // Search habits
  getHabits().filter(h => h.name.toLowerCase().includes(q)).slice(0, 2).forEach(h => {
    results.push({
      icon: h.icon,
      title: h.name,
      meta: '🌱 Thói quen',
      color: h.color || 'var(--habit)',
      action: () => { closeGlobalSearch(); setTimeout(() => navigateTo('habits'), 50); }
    });
  });

  // Navigation shortcuts
  [
    { q: 'thoi gian|pomodoro|timer', label: '⏱️ Thời gian', page: 'time' },
    { q: 'nhat ky|journal|diary', label: '📓 Nhật ký', page: 'journal' },
    { q: 'cai dat|settings', label: '⚙️ Cài đặt', page: 'settings' },
    { q: 'du an|project', label: '📁 Dự án', page: 'projects' },
  ].forEach(nav => {
    if (q.includes(nav.q.split('|')[0]) || nav.q.split('|').some(kw => kw.includes(q) || q.includes(kw))) {
      results.push({
        icon: nav.label.split(' ')[0],
        title: `Đi đến ${nav.label}`,
        meta: '→ Điều hướng',
        color: 'var(--primary)',
        action: () => { closeGlobalSearch(); setTimeout(() => navigateTo(nav.page), 50); }
      });
    }
  });

  if (results.length === 0) {
    container.innerHTML = `<div class="search-hint">Không tìm thấy kết quả nào cho "<b>${query}</b>"</div>`;
    return;
  }

  container.innerHTML = results.map((r, i) => `
    <div class="search-result-item ${i === 0 ? 'selected' : ''}" onclick="(${r.action.toString()})()">
      <span class="search-result-icon">${r.icon}</span>
      <div class="search-result-info">
        <div class="search-result-title">${highlightMatch(r.title, query)}</div>
        ${r.meta ? `<div class="search-result-meta">${r.meta}</div>` : ''}
      </div>
    </div>`).join('');
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return text.slice(0, idx) + `<mark>${text.slice(idx, idx + query.length)}</mark>` + text.slice(idx + query.length);
}

