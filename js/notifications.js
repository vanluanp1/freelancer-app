/* ============================================
   NOTIFICATIONS.JS - deadline and timer alerts
   ============================================ */

const DEADLINE_NOTICE_KEY = 'fl_deadline_notice_date';
let _deadlineReminderTimer = null;

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Promise.resolve('Notification' in window ? Notification.permission : 'unsupported');
}

function sendNotification(title, body) {
  if (!getSettings().notificationsEnabled) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/app-icon.svg' });
  }
}

function getDeadlineReminderSummary() {
  const openTasks = getTasks().filter(task => !task.completedAt && task.deadline);
  const overdue = openTasks.filter(task => daysUntil(task.deadline) < 0);
  const todayTasks = openTasks.filter(task => daysUntil(task.deadline) === 0);
  const soon = openTasks.filter(task => {
    const days = daysUntil(task.deadline);
    return days > 0 && days <= 3;
  });
  return { overdue, todayTasks, soon };
}

function checkDeadlineReminders({ force = false } = {}) {
  const settings = getSettings();
  if (!settings.notificationsEnabled) return;
  const summary = getDeadlineReminderSummary();
  const noticeKey = `${today()}-${summary.overdue.length}-${summary.todayTasks.length}-${summary.soon.length}`;
  if (!force && getScopedItem(DEADLINE_NOTICE_KEY) === noticeKey) return;
  setScopedItem(DEADLINE_NOTICE_KEY, noticeKey);
  if (!summary.overdue.length && !summary.todayTasks.length && !summary.soon.length) return;
  const message = [
    summary.overdue.length ? `${summary.overdue.length} task quá hạn` : '',
    summary.todayTasks.length ? `${summary.todayTasks.length} task đến hạn hôm nay` : '',
    summary.soon.length ? `${summary.soon.length} task sắp đến hạn` : '',
  ].filter(Boolean).join(' · ');
  showToast(`Nhắc việc: ${message}`, summary.overdue.length ? 'error' : 'info', 6000);
  sendNotification('FreelanceHub nhắc deadline', message);
}

function initDeadlineReminders() {
  clearInterval(_deadlineReminderTimer);
  setTimeout(() => checkDeadlineReminders(), 1200);
  _deadlineReminderTimer = setInterval(() => checkDeadlineReminders(), 30 * 60 * 1000);
}
