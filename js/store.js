/* ============================================
   STORE.JS — localStorage data management
   ============================================ */

const KEYS = {
  tasks: 'fl_tasks',
  columns: 'fl_columns',
  projects: 'fl_projects',
  timelogs: 'fl_timelogs',
  pomodoro: 'fl_pomodoro',
  habits: 'fl_habits',
  reviews: 'fl_reviews',
  settings: 'fl_settings',
  schedule: 'fl_schedule',
  recurring: 'fl_recurring',
  transactions: 'fl_transactions',
  txCategories: 'fl_transaction_categories',
  financeSettings: 'fl_finance_settings',
};
const BACKUP_STORAGE_KEY = 'fl_backup_snapshots';
const LAST_BACKUP_DATE_KEY = 'fl_last_backup_date';
const LEGACY_STORAGE_MIGRATION_KEY = 'fl_legacy_storage_migrated';
const BACKUP_VERSION = 1;
const MAX_LOCAL_BACKUPS = 7;
let _activeStorageUserId = null;

// ---- Generic ----
function getScopedStorageKey(key) {
  return _activeStorageUserId ? `fl_user_${_activeStorageUserId}_${key}` : null;
}
function getScopedItem(key) {
  const scopedKey = getScopedStorageKey(key);
  return scopedKey ? localStorage.getItem(scopedKey) : null;
}
function setScopedItem(key, value) {
  const scopedKey = getScopedStorageKey(key);
  if (scopedKey) localStorage.setItem(scopedKey, value);
}
function removeScopedItem(key) {
  const scopedKey = getScopedStorageKey(key);
  if (scopedKey) localStorage.removeItem(scopedKey);
}
function load(key) {
  try { return JSON.parse(getScopedItem(key)) || null; } catch { return null; }
}
function save(key, data) {
  setScopedItem(key, JSON.stringify(data));
}
function migrateLegacyStorage() {
  if (localStorage.getItem(LEGACY_STORAGE_MIGRATION_KEY)) return;
  [...Object.values(KEYS), BACKUP_STORAGE_KEY, LAST_BACKUP_DATE_KEY].forEach(key => {
    const legacyValue = localStorage.getItem(key);
    const scopedKey = getScopedStorageKey(key);
    if (legacyValue !== null && scopedKey && localStorage.getItem(scopedKey) === null) {
      localStorage.setItem(scopedKey, legacyValue);
    }
    localStorage.removeItem(key);
  });
  localStorage.setItem(LEGACY_STORAGE_MIGRATION_KEY, _activeStorageUserId);
}
function initializeScopedStorage() {
  if (!load(KEYS.columns)) save(KEYS.columns, DEFAULT_COLUMNS);
  if (!load(KEYS.txCategories)) save(KEYS.txCategories, DEFAULT_TX_CATEGORIES);

  const s = getSettings();
  if (s.autoBackup) {
    const lastBackup = getScopedItem(LAST_BACKUP_DATE_KEY);
    const todayStr = today();
    if (lastBackup !== todayStr) createLocalBackupSnapshot('automatic');
  }
}
function activateUserStorage(userId) {
  if (!userId) return false;
  const changed = _activeStorageUserId !== userId;
  _activeStorageUserId = userId;
  migrateLegacyStorage();
  initializeScopedStorage();
  return changed;
}

// ---- Settings ----
const DEFAULT_SETTINGS = {
  userName: 'Bạn',
  darkMode: false,
  accentColor: '#6C63FF',
  workHoursStart: '08:00',
  workHoursEnd: '18:00',
  soundEnabled: true,
  autoBackup: false,
};
function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, load(KEYS.settings) || {});
}
function saveSettings(partial) {
  save(KEYS.settings, Object.assign(getSettings(), partial));
}

// ---- Projects ----
function getProjects() { return load(KEYS.projects) || []; }
function saveProjects(arr) { save(KEYS.projects, arr); }
function addProject(data) {
  const projects = getProjects();
  const project = { id: genId(), createdAt: now(), notes: '', budgetCurrency: 'VND', ...data };
  projects.unshift(project);
  saveProjects(projects);
  return project;
}
function updateProject(id, partial) {
  const projects = getProjects().map(p => p.id === id ? { ...p, ...partial } : p);
  saveProjects(projects);
}
function deleteProject(id) {
  saveProjects(getProjects().filter(p => p.id !== id));
  // Clean tasks
  saveTasks(getTasks().map(t => t.projectId === id ? { ...t, projectId: null } : t));
}
function getProjectById(id) { return getProjects().find(p => p.id === id); }

// ---- Columns ----
const DEFAULT_COLUMNS = [
  { id: 'col-todo', title: '📋 Cần làm', order: 0, projectId: null, color: null },
  { id: 'col-doing', title: '⚡ Đang làm', order: 1, projectId: null, color: null },
  { id: 'col-review', title: '👀 Đang review', order: 2, projectId: null, color: null },
  { id: 'col-done', title: '✅ Hoàn thành', order: 3, projectId: null, color: null },
];
function getColumns(projectId = null) {
  const all = load(KEYS.columns);
  if (!all) {
    save(KEYS.columns, DEFAULT_COLUMNS);
    return projectId ? [] : DEFAULT_COLUMNS;
  }
  return all.filter(c => c.projectId === projectId).sort((a,b) => a.order - b.order);
}
function getAllColumns() {
  const all = load(KEYS.columns);
  if (!all) { save(KEYS.columns, DEFAULT_COLUMNS); return DEFAULT_COLUMNS; }
  return all;
}
function saveAllColumns(arr) { save(KEYS.columns, arr); }
function addColumn(data) {
  const all = getAllColumns();
  const col = { id: genId(), order: all.length, color: null, ...data };
  all.push(col);
  saveAllColumns(all);
  return col;
}
function updateColumn(id, partial) {
  saveAllColumns(getAllColumns().map(c => c.id === id ? { ...c, ...partial } : c));
}
function deleteColumn(id) {
  saveAllColumns(getAllColumns().filter(c => c.id !== id));
  // Move tasks to first available col
  const tasks = getTasks();
  const col = getColumns()[0];
  saveTasks(tasks.map(t => t.columnId === id ? { ...t, columnId: col ? col.id : null } : t));
}

// Ensure project columns exist
function ensureProjectColumns(projectId) {
  const existing = getColumns(projectId);
  if (existing.length === 0) {
    const bases = [
      { title: '📋 Cần làm', order: 0 },
      { title: '⚡ Đang làm', order: 1 },
      { title: '👀 Đang review', order: 2 },
      { title: '✅ Hoàn thành', order: 3 },
    ];
    bases.forEach(b => addColumn({ ...b, projectId }));
    return getColumns(projectId);
  }
  return existing;
}

// ---- Undo/Redo History ----
const _history = [];   // [{snapshot: [...tasks], description}]
const _future  = [];
const MAX_HISTORY = 30;

function pushHistory(description) {
  _history.push({ snapshot: JSON.parse(JSON.stringify(getTasks())), description });
  if (_history.length > MAX_HISTORY) _history.shift();
  _future.length = 0; // clear redo stack
}
function undoAction() {
  if (!_history.length) { showToast('Không còn gì để hoàn tác!', 'info'); return; }
  _future.push({ snapshot: JSON.parse(JSON.stringify(getTasks())), description: '' });
  const prev = _history.pop();
  saveTasks(prev.snapshot);
  showToast(`↩️ Hoàn tác: ${prev.description}`, 'info');
  renderCurrentPage();
  setTimeout(() => initTasksDnD && initTasksDnD(), 60);
}
function redoAction() {
  if (!_future.length) { showToast('Không còn gì để làm lại!', 'info'); return; }
  _history.push({ snapshot: JSON.parse(JSON.stringify(getTasks())), description: '' });
  const next = _future.pop();
  saveTasks(next.snapshot);
  showToast('↪️ Làm lại', 'info');
  renderCurrentPage();
  setTimeout(() => initTasksDnD && initTasksDnD(), 60);
}

// ---- Tasks ----
function getTasks() { return load(KEYS.tasks) || []; }
function saveTasks(arr) { save(KEYS.tasks, arr); }
function addTask(data) {
  const tasks = getTasks();
  const cols = getColumns(data.projectId || null);
  const firstCol = cols[0];
  const task = {
    id: genId(),
    title: 'Task mới',
    projectId: null,
    priority: 'medium',
    deadline: null,
    estimatedHours: 0,
    status: 'todo',
    columnId: firstCol ? firstCol.id : 'col-todo',
    order: tasks.filter(t => t.columnId === (firstCol ? firstCol.id : 'col-todo')).length,
    note: '',
    subtasks: [],
    createdAt: now(),
    completedAt: null,
    ...data,
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

// Subtask helpers
function addSubtask(taskId, text) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  if (!task.subtasks) task.subtasks = [];
  task.subtasks.push({ id: genId(), text, done: false });
  saveTasks(tasks);
}
function toggleSubtask(taskId, subId) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  const sub = task.subtasks.find(s => s.id === subId);
  if (sub) sub.done = !sub.done;
  saveTasks(tasks);
}
function deleteSubtask(taskId, subId) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  task.subtasks = task.subtasks.filter(s => s.id !== subId);
  saveTasks(tasks);
}
function updateTask(id, partial) {
  saveTasks(getTasks().map(t => t.id === id ? { ...t, ...partial } : t));
}
function deleteTask(id) { saveTasks(getTasks().filter(t => t.id !== id)); }
function getTaskById(id) { return getTasks().find(t => t.id === id); }
function getTasksByColumn(colId) {
  const todayStr = today();
  return getTasks().filter(t => {
    if (t.columnId !== colId) return false;
    // Hide recurring tasks that were completed on a previous day
    if (t.recurringId && t.recurringDate && t.recurringDate !== todayStr && t.completedAt) return false;
    return true;
  }).sort((a,b) => a.order - b.order);
}
function getTodayTasks() {
  const t = today();
  return getTasks().filter(t2 => t2.deadline && t2.deadline.slice(0,10) === t);
}
function moveTask(taskId, newColId, newOrder) {
  pushHistory(`Di chuyển task`);
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  // Reorder tasks in old col
  tasks.filter(t => t.columnId === task.columnId && t.id !== taskId)
    .sort((a,b) => a.order - b.order)
    .forEach((t, i) => { t.order = i; });
  task.columnId = newColId;
  task.order = newOrder;
  // Mark as done
  const col = getAllColumns().find(c => c.id === newColId);
  if (col && col.title.includes('Hoàn thành') && !task.completedAt) {
    task.completedAt = now();
    task.status = 'done';
  } else if (col && !col.title.includes('Hoàn thành')) {
    task.completedAt = null;
    task.status = col.title.includes('Đang làm') ? 'doing' : col.title.includes('review') ? 'review' : 'todo';
  }
  saveTasks(tasks);
  return task;
}

// ---- Time Logs ----
function getTimeLogs() { return load(KEYS.timelogs) || []; }
function saveTimeLogs(arr) { save(KEYS.timelogs, arr); }
function addTimeLog(data) {
  const logs = getTimeLogs();
  const log = { id: genId(), date: today(), ...data };
  logs.push(log);
  saveTimeLogs(logs);
  return log;
}
function deleteTimeLog(id) { saveTimeLogs(getTimeLogs().filter(l => l.id !== id)); }
function getTodayTimeLogs() {
  const t = today();
  return getTimeLogs().filter(l => l.date === t);
}
function getTodayWorkedSeconds() {
  return getTodayTimeLogs().reduce((sum, l) => sum + (l.duration || 0), 0);
}

// ---- Pomodoro ----
const DEFAULT_POMODORO = {
  todayCount: 0, todayDate: today(), streak: 0, lastStreakDate: '',
  settings: { workMin: 25, shortBreakMin: 5, longBreakMin: 15, longBreakAfter: 4, autoStartBreak: false, autoStartWork: false, soundEnabled: true }
};
function getPomodoroData() {
  const d = Object.assign({}, DEFAULT_POMODORO, load(KEYS.pomodoro) || {});
  d.settings = Object.assign({}, DEFAULT_POMODORO.settings, d.settings || {});
  // Reset daily count if new day
  if (d.todayDate !== today()) { d.todayCount = 0; d.todayDate = today(); savePomodoroData(d); }
  return d;
}
function savePomodoroData(data) { save(KEYS.pomodoro, data); }
function recordPomodoro(taskId, projectId) {
  const d = getPomodoroData();
  d.todayCount++;
  const t = today();
  // Streak logic
  const last = d.lastStreakDate;
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (last === yesterday || last === '') {
    d.streak = (last === '') ? 1 : d.streak + 1;
  } else if (last !== t) {
    d.streak = 1;
  }
  d.lastStreakDate = t;
  savePomodoroData(d);
  // Add time log
  const pomo = d.settings;
  addTimeLog({
    taskId: taskId || null,
    projectId: projectId || null,
    startTime: new Date(Date.now() - pomo.workMin * 60000).toISOString(),
    endTime: now(),
    duration: pomo.workMin * 60,
    type: 'pomodoro',
    date: t,
  });
}

// ---- Habits ----
function getHabits() { return load(KEYS.habits) || []; }
function saveHabits(arr) { save(KEYS.habits, arr); }
function addHabit(data) {
  const habits = getHabits();
  const habit = { id: genId(), frequency: 'daily', weekDays: [1,2,3,4,5], completedDates: [], order: habits.length, archived: false, createdAt: now(), ...data };
  habits.push(habit);
  saveHabits(habits);
  return habit;
}
function updateHabit(id, partial) { saveHabits(getHabits().map(h => h.id === id ? { ...h, ...partial } : h)); }
function deleteHabit(id) { saveHabits(getHabits().filter(h => h.id !== id)); }
function toggleHabit(id, dateStr = today()) {
  const habits = getHabits();
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  if (habit.completedDates.includes(dateStr)) {
    habit.completedDates = habit.completedDates.filter(d => d !== dateStr);
  } else {
    habit.completedDates.push(dateStr);
  }
  saveHabits(habits);
  return habit;
}
function getHabitStreak(habit) {
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = toDateStr(d);
    if (habit.completedDates.includes(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}
function isHabitDueToday(habit) {
  if (habit.archived) return false;
  if (habit.frequency === 'daily') return true;
  const dow = new Date().getDay();
  return (habit.weekDays || []).includes(dow);
}

// ---- Daily Review ----
function getReviews() { return load(KEYS.reviews) || []; }
function saveReviews(arr) { save(KEYS.reviews, arr); }
function getReviewByDate(dateStr) { return getReviews().find(r => r.date === dateStr); }
function saveReview(dateStr, partial) {
  const reviews = getReviews();
  const idx = reviews.findIndex(r => r.date === dateStr);
  const base = { date: dateStr, morningGoals: ['','',''], morningMood: 'neutral', morningIntention: '', doneToday: '', blockers: '', failReasons: '', lessons: '', improvements: '', eveningMood: 'neutral', score: 5, pomodoroCount: 0, hoursWorked: 0 };
  if (idx >= 0) { reviews[idx] = { ...reviews[idx], ...partial }; }
  else { reviews.unshift({ ...base, ...partial }); }
  saveReviews(reviews);
}

// ---- Schedule (Weekly Calendar) ----
function getSchedule() { return load(KEYS.schedule) || []; }
function saveSchedule(arr) { save(KEYS.schedule, arr); }
function addScheduleBlock(data) {
  const blocks = getSchedule();
  const block = { id: genId(), ...data };
  blocks.push(block);
  saveSchedule(blocks);
  return block;
}
function deleteScheduleBlock(id) { saveSchedule(getSchedule().filter(b => b.id !== id)); }

// ---- Transactions ----
const DEFAULT_TX_CATEGORIES = [
  { id: 'cat-income-1',  name: 'Lương dự án',           icon: '💼', type: 'income',  isDefault: true, order: 0 },
  { id: 'cat-income-2',  name: 'Thanh toán milestone',   icon: '🎯', type: 'income',  isDefault: true, order: 1 },
  { id: 'cat-income-3',  name: 'Tư vấn / Freelance lẻ', icon: '💡', type: 'income',  isDefault: true, order: 2 },
  { id: 'cat-income-4',  name: 'Thưởng / Bonus',         icon: '🎁', type: 'income',  isDefault: true, order: 3 },
  { id: 'cat-income-5',  name: 'Bán hàng / Sản phẩm',   icon: '📦', type: 'income',  isDefault: true, order: 4 },
  { id: 'cat-income-6',  name: 'Thu nhập khác',          icon: '💰', type: 'income',  isDefault: true, order: 5 },
  { id: 'cat-exp-1',     name: 'Ăn uống',                icon: '🍜', type: 'expense', isDefault: true, order: 6 },
  { id: 'cat-exp-2',     name: 'Đi lại / Xăng xe',       icon: '🚗', type: 'expense', isDefault: true, order: 7 },
  { id: 'cat-exp-3',     name: 'Nhà ở / Tiện ích',       icon: '🏠', type: 'expense', isDefault: true, order: 8 },
  { id: 'cat-exp-4',     name: 'Thiết bị / Công cụ',     icon: '💻', type: 'expense', isDefault: true, order: 9 },
  { id: 'cat-exp-5',     name: 'Học tập / Khóa học',     icon: '📚', type: 'expense', isDefault: true, order: 10 },
  { id: 'cat-exp-6',     name: 'Giải trí',               icon: '🎮', type: 'expense', isDefault: true, order: 11 },
  { id: 'cat-exp-7',     name: 'Sức khỏe',               icon: '💊', type: 'expense', isDefault: true, order: 12 },
  { id: 'cat-exp-8',     name: 'Thuế / Phí dịch vụ',     icon: '🧾', type: 'expense', isDefault: true, order: 13 },
  { id: 'cat-exp-9',     name: 'Phần mềm / Subscription', icon: '📱', type: 'expense', isDefault: true, order: 14 },
  { id: 'cat-exp-10',    name: 'Chi tiêu khác',           icon: '💸', type: 'expense', isDefault: true, order: 15 },
];

const DEFAULT_FINANCE_SETTINGS = {
  defaultCurrency: 'VND',
  exchangeRate: 25000,
  autoConvert: false,
};

function getTxCategories() {
  const stored = load(KEYS.txCategories);
  if (!stored || stored.length === 0) {
    save(KEYS.txCategories, DEFAULT_TX_CATEGORIES);
    return DEFAULT_TX_CATEGORIES;
  }
  return stored;
}
function saveTxCategories(arr) { save(KEYS.txCategories, arr); }
function addTxCategory(data) {
  const cats = getTxCategories();
  const cat = { id: genId(), isDefault: false, order: cats.length, ...data };
  cats.push(cat);
  saveTxCategories(cats);
  return cat;
}
function updateTxCategory(id, partial) {
  saveTxCategories(getTxCategories().map(c => c.id === id ? { ...c, ...partial } : c));
}
function deleteTxCategory(id) {
  saveTxCategories(getTxCategories().filter(c => c.id !== id));
}
function getTxCategoryById(id) { return getTxCategories().find(c => c.id === id); }

function getFinanceSettings() {
  return Object.assign({}, DEFAULT_FINANCE_SETTINGS, load(KEYS.financeSettings) || {});
}
function saveFinanceSettings(partial) {
  save(KEYS.financeSettings, Object.assign(getFinanceSettings(), partial));
}

function getTransactions() { return load(KEYS.transactions) || []; }
function saveTransactions(arr) { save(KEYS.transactions, arr); }
function addTransaction(data) {
  const txs = getTransactions();
  const tx = { id: genId(), createdAt: now(), currency: 'VND', ...data };
  txs.unshift(tx);
  saveTransactions(txs);
  return tx;
}
function updateTransaction(id, partial) {
  saveTransactions(getTransactions().map(t => t.id === id ? { ...t, ...partial } : t));
}
function deleteTransaction(id) {
  saveTransactions(getTransactions().filter(t => t.id !== id));
}
function getTransactionById(id) { return getTransactions().find(t => t.id === id); }

// Finance calculation helpers
function calcTxAmountVND(tx) {
  const fs = getFinanceSettings();
  if (tx.currency === 'VND') return tx.amount;
  return tx.amount * (fs.exchangeRate || 25000);
}
function getTransactionsByPeriod(period, refDate) {
  const txs = getTransactions();
  const todayStr = refDate || today();
  const d = new Date(todayStr + 'T00:00:00');
  if (period === 'today') {
    return txs.filter(t => t.date === todayStr);
  } else if (period === 'week') {
    const dow = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - ((dow + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const wStart = toDateStr(mon), wEnd = toDateStr(sun);
    return txs.filter(t => t.date >= wStart && t.date <= wEnd);
  } else if (period === 'month') {
    const ym = todayStr.slice(0,7);
    return txs.filter(t => t.date.startsWith(ym));
  }
  return txs;
}

// ---- Export/Import ----
function collectAllData() {
  const data = {};
  Object.entries(KEYS).forEach(([k, v]) => { data[k] = load(v); });
  return data;
}
function createBackupPayload(reason = 'manual') {
  return {
    app: 'FreelanceHub',
    version: BACKUP_VERSION,
    createdAt: now(),
    reason,
    data: collectAllData(),
  };
}
function downloadBackupPayload(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `freelancehub-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function getLocalBackups() {
  return load(BACKUP_STORAGE_KEY) || [];
}
function createLocalBackupSnapshot(reason = 'manual') {
  const backups = getLocalBackups();
  const payload = createBackupPayload(reason);
  backups.unshift(payload);
  save(BACKUP_STORAGE_KEY, backups.slice(0, MAX_LOCAL_BACKUPS));
  setScopedItem(LAST_BACKUP_DATE_KEY, today());
  return payload;
}
function exportAllData(silent = false) {
  const payload = createLocalBackupSnapshot('download');
  downloadBackupPayload(payload);
  if (!silent) showToast('Đã xuất dữ liệu thành công!', 'success');
}
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function getValidatedBackupData(payload) {
  const data = payload && isPlainObject(payload.data) ? payload.data : payload;
  if (!isPlainObject(data)) throw new Error('Invalid backup format');
  const knownKeys = Object.keys(KEYS).filter(key => data[key] !== undefined);
  if (knownKeys.length === 0) throw new Error('No FreelanceHub data found');
  return data;
}
function restoreBackupData(payload) {
  const data = getValidatedBackupData(payload);
  Object.entries(KEYS).forEach(([k, v]) => {
    if (data[k] !== undefined) save(v, data[k]);
  });
}
function importAllData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      createLocalBackupSnapshot('before-import');
      restoreBackupData(JSON.parse(e.target.result));
      showToast('Nhập dữ liệu thành công! Đang tải lại...', 'success');
      setTimeout(() => location.reload(), 1200);
    } catch { showToast('File không hợp lệ!', 'error'); }
  };
  reader.readAsText(file);
}
function restoreLatestLocalBackup() {
  const latest = getLocalBackups()[0];
  if (!latest) {
    showToast('Chưa có bản sao lưu nội bộ nào!', 'info');
    return;
  }
  if (!confirm('Khôi phục bản sao lưu gần nhất? Dữ liệu hiện tại sẽ được thay thế.')) return;
  try {
    restoreBackupData(latest);
    showToast('Đã khôi phục bản sao lưu! Đang tải lại...', 'success');
    setTimeout(() => location.reload(), 1200);
  } catch {
    showToast('Bản sao lưu nội bộ không hợp lệ!', 'error');
  }
}
function getBackupStatus() {
  const latest = getLocalBackups()[0];
  return {
    count: getLocalBackups().length,
    lastBackupAt: latest?.createdAt || null,
  };
}
function clearAllData() {
  createLocalBackupSnapshot('before-clear');
  Object.values(KEYS).forEach(removeScopedItem);
  showToast('Đã xóa toàn bộ dữ liệu!', 'info');
  setTimeout(() => location.reload(), 1000);
}

// ---- Project stats helper ----
function getProjectStats(projectId) {
  const cols = getColumns(projectId);
  const tasks = getTasks().filter(t => t.projectId === projectId);
  const done = tasks.filter(t => t.completedAt).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const logs = getTimeLogs().filter(l => l.projectId === projectId);
  const workedSec = logs.reduce((s, l) => s + (l.duration || 0), 0);
  return { done, total, pct, workedSec };
}

// ---- Recurring Task Templates ----
// Template schema:
// { id, title, projectId, priority, estimatedHours, note, columnId,
//   repeatType: 'daily'|'interval'|'weekly',
//   intervalDays: number (for 'interval'),
//   weekDays: [0-6] (for 'weekly'),
//   startDate: 'YYYY-MM-DD',
//   endDate: 'YYYY-MM-DD' | null (null = indefinite),
//   active: boolean,
//   lastGenerated: 'YYYY-MM-DD' | null,
//   createdAt }

function getRecurring() { return load(KEYS.recurring) || []; }
function saveRecurring(arr) { save(KEYS.recurring, arr); }
function addRecurring(data) {
  const templates = getRecurring();
  const cols = getColumns(data.projectId || null);
  const firstCol = cols[0];
  const template = {
    id: genId(),
    title: 'Task lặp lại mới',
    projectId: null,
    priority: 'medium',
    estimatedHours: 0,
    note: '',
    columnId: firstCol ? firstCol.id : 'col-todo',
    repeatType: 'daily',
    intervalDays: 1,
    weekDays: [1,2,3,4,5],
    startDate: today(),
    endDate: null,
    active: true,
    lastGenerated: null,
    createdAt: now(),
    ...data,
  };
  templates.push(template);
  saveRecurring(templates);
  return template;
}
function updateRecurring(id, partial) {
  saveRecurring(getRecurring().map(r => r.id === id ? { ...r, ...partial } : r));
}
function deleteRecurring(id) {
  saveRecurring(getRecurring().filter(r => r.id !== id));
}
function getRecurringById(id) { return getRecurring().find(r => r.id === id); }

// ---- Recurring Engine ----
// Returns array of YYYY-MM-DD strings that need a task generated
function getDueDatesForTemplate(template, fromDateStr, toDateStr) {
  const from = new Date(fromDateStr + 'T00:00:00');
  const to   = new Date(toDateStr   + 'T00:00:00');
  const start= new Date((template.startDate || fromDateStr) + 'T00:00:00');
  const end  = template.endDate ? new Date(template.endDate + 'T00:00:00') : null;
  const results = [];
  let cursor = new Date(Math.max(from.getTime(), start.getTime()));
  while (cursor <= to) {
    if (end && cursor > end) break;
    const ds = toDateStr2(cursor);
    let due = false;
    if (template.repeatType === 'daily') {
      due = true;
    } else if (template.repeatType === 'interval') {
      const diffDays = Math.round((cursor - start) / 86400000);
      due = diffDays >= 0 && diffDays % (template.intervalDays || 1) === 0;
    } else if (template.repeatType === 'weekly') {
      due = (template.weekDays || []).includes(cursor.getDay());
    }
    if (due) results.push(ds);
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

function toDateStr2(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// Main engine: generate missing task instances for all active templates up to today
function processRecurringTasks() {
  const templates = getRecurring().filter(r => r.active);
  const todayStr = today();
  let generated = 0;
  templates.forEach(template => {
    const from = template.lastGenerated
      ? (function() { const d = new Date(template.lastGenerated + 'T00:00:00'); d.setDate(d.getDate()+1); return toDateStr2(d); })()
      : (template.startDate || todayStr);
    // Don't generate future dates beyond today
    if (from > todayStr) return;
    const dueDates = getDueDatesForTemplate(template, from, todayStr);
    // Check which dates already have a task instance for this template
    const existingTasks = getTasks().filter(t => t.recurringId === template.id);
    dueDates.forEach(dateStr => {
      const alreadyExists = existingTasks.some(t => t.recurringDate === dateStr);
      if (!alreadyExists) {
        addTask({
          title: template.title,
          projectId: template.projectId || null,
          priority: template.priority,
          estimatedHours: template.estimatedHours,
          note: template.note,
          columnId: template.columnId,
          deadline: dateStr,
          recurringId: template.id,
          recurringDate: dateStr,
        });
        generated++;
      }
    });
    if (dueDates.length > 0) {
      updateRecurring(template.id, { lastGenerated: dueDates[dueDates.length - 1] });
    }
  });
  return generated;
}

// ---- Aliases so finance.js can call getTransactionCategories / addTransactionCategory / deleteTransactionCategory ----
function getTransactionCategories() { return getTxCategories(); }
function addTransactionCategory(data) { return addTxCategory(data); }
function deleteTransactionCategory(id) { return deleteTxCategory(id); }
