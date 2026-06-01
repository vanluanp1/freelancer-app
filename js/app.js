/* ============================================
   APP.JS — Main application router
   ============================================ */

let _currentPage = 'dashboard';

// ---- Page Registry ----
const PAGES = {
  dashboard: { render: renderDashboard, after: null },
  tasks:     { render: renderTasks,     after: afterRenderTasks },
  projects:  { render: renderProjects,  after: afterRenderProjects },
  time:      { render: renderTime,      after: null },
  finance:   { render: renderFinance,   after: null },
  habits:    { render: renderHabits,    after: null },
  journal:   { render: renderJournal,   after: afterRenderJournal },
  stats:     { render: renderStats,     after: null },
  settings:  { render: renderSettings,  after: null },
};


// ---- Navigation ----
function navigateTo(page, resetState = false) {
  if (!PAGES[page]) return;

  // Reset project detail if navigating away
  if (page !== 'projects' && _currentProjectId !== null) {
    // keep state for back navigation
  }

  _currentPage = page;

  // Update nav active states
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  renderCurrentPage();
}

function renderCurrentPage() {
  const main = document.getElementById('main-content');
  if (!main) return;
  const pageReg = PAGES[_currentPage];
  if (!pageReg) return;

  main.innerHTML = `<div class="page active" id="page-${_currentPage}">${pageReg.render()}</div>`;

  if (pageReg.after) pageReg.after();

  // Update document title
  const titles = { dashboard:'Dashboard', tasks:'Tasks', projects:'Dự án', time:'Thời gian', finance:'Thu Chi', habits:'Thói quen', journal:'Nhật ký', stats:'Thống kê', settings:'Cài đặt' };
  document.title = `${titles[_currentPage]||''} — FreelanceHub`;

  // Scroll to top
  main.scrollTop = 0;
  window.scrollTo(0, 0);
}

// ---- Sidebar Toggle ----
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
  });

  // Dark mode toggle in sidebar
  const darkBtn = document.getElementById('dark-mode-toggle');
  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      toggleDarkMode(!isDark);
      const checkbox = document.getElementById('set-dark');
      if (checkbox) checkbox.checked = !isDark;
    });
  }
}

// ---- Nav Click Handlers ----
function initNav() {
  // Sidebar nav
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });

  // Bottom nav
  document.querySelectorAll('.bottom-nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });
}

// ---- Keyboard shortcuts ----
function initShortcuts() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // ESC to close modal / search
    if (e.key === 'Escape') { closeModal(); closeGlobalSearch(); }

    // Ctrl/Cmd shortcuts (always active)
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'k') { e.preventDefault(); openGlobalSearch(); }
      // Undo/redo only when NOT typing
      if (!isTyping) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoAction(); }
        if (e.key === 'z' && e.shiftKey)  { e.preventDefault(); redoAction(); }
        if (e.key === 'y')                { e.preventDefault(); redoAction(); }
      }
    }
  });
}


// ---- Boot ----
window.addEventListener('DOMContentLoaded', () => {
  // Apply saved settings (dark mode, accent color)
  applySettings();
  initCloudSync();

  // Init sidebar and nav
  initSidebar();
  initNav();
  initShortcuts();

  // Run recurring engine to generate today's tasks
  const newRecurring = processRecurringTasks();

  // Render initial page
  navigateTo('dashboard');
  if (newRecurring > 0) {
    setTimeout(() => showToast(`🔁 Đã tạo ${newRecurring} task lặp lại mới!`, 'info'), 800);
  }

  // Greeting interval (update every minute)
  setInterval(() => {
    const greetEl = document.querySelector('.greeting-text');
    if (greetEl) {
      const s = getSettings();
      greetEl.textContent = getGreeting(s.userName);
    }
  }, 60000);

  // Periodic dashboard widget update (every 1s for pomodoro display)
  setInterval(() => {
    const dashTime = document.getElementById('dash-pomo-time');
    if (dashTime && window._pomodoroState && window._pomodoroState.running) {
      dashTime.textContent = formatDuration(window._pomodoroState.remaining);
    }
  }, 1000);

  // Service worker for PWA (optional enhancement)
  // if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
});
