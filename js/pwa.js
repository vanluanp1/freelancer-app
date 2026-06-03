/* ============================================
   PWA.JS - offline shell registration
   ============================================ */

function patchRecurringTodayRecovery() {
  if (typeof processRecurringTasks !== 'function' || processRecurringTasks._todayRecoveryPatch) return;
  if (typeof getRecurring !== 'function' || typeof getDueDatesForTemplate !== 'function') return;

  const originalProcessRecurringTasks = processRecurringTasks;
  processRecurringTasks = function patchedProcessRecurringTasks() {
    const todayStr = today();
    getRecurring().filter(template => template.active).forEach(template => {
      const dueToday = getDueDatesForTemplate(template, todayStr, todayStr).includes(todayStr);
      if (!dueToday) return;

      const alreadyExists = getTasks().some(task => task.recurringId === template.id && task.recurringDate === todayStr);
      if (alreadyExists) return;

      if (template.lastGenerated && template.lastGenerated >= todayStr) {
        const yesterday = new Date(todayStr + 'T00:00:00');
        yesterday.setDate(yesterday.getDate() - 1);
        updateRecurring(template.id, { lastGenerated: toDateStr2(yesterday) });
      }
    });
    return originalProcessRecurringTasks.apply(this, arguments);
  };
  processRecurringTasks._todayRecoveryPatch = true;
}

patchRecurringTodayRecovery();

function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
