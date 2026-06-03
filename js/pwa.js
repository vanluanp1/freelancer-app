/* ============================================
   PWA.JS - offline shell registration
   ============================================ */

function createRecurringSubtaskCopies(subtasks) {
  if (typeof cloneRecurringSubtasks === 'function') return cloneRecurringSubtasks(subtasks);
  return (subtasks || [])
    .filter(item => item && String(item.text || '').trim())
    .map(item => ({ id: genId(), text: String(item.text).trim(), done: false }));
}

function isRecurringTemplateDueTodayForRecovery(template) {
  if (!template || template.active === false || typeof getDueDatesForTemplate !== 'function') return false;
  const todayStr = today();
  return getDueDatesForTemplate(template, todayStr, todayStr).includes(todayStr);
}

function getRecurringTargetColumnId(template) {
  const columnExists = typeof getAllColumns === 'function'
    ? getAllColumns().some(column => column.id === template.columnId)
    : false;
  return columnExists ? template.columnId : 'col-todo';
}

function hasRecurringTaskInstanceForToday(templateId) {
  const todayStr = today();
  return getTasks().some(task => task.recurringId === templateId && task.recurringDate === todayStr);
}

function createRecurringTaskInstanceForToday(template, columnId) {
  const todayStr = today();
  addTask({
    title: template.title,
    projectId: template.projectId || null,
    priority: template.priority || 'medium',
    estimatedHours: Number(template.estimatedHours) || 0,
    note: template.note || '',
    columnId,
    deadline: todayStr,
    subtasks: createRecurringSubtaskCopies(template.subtasks),
    recurringId: template.id,
    recurringDate: todayStr,
  });
}

function ensureDueRecurringTasksForToday() {
  if (typeof getRecurring !== 'function' || typeof getDueDatesForTemplate !== 'function') return 0;
  if (typeof getTasks !== 'function' || typeof addTask !== 'function') return 0;

  let created = 0;
  getRecurring().filter(template => template && template.active !== false).forEach(template => {
    if (!isRecurringTemplateDueTodayForRecovery(template)) return;
    if (hasRecurringTaskInstanceForToday(template.id)) return;

    createRecurringTaskInstanceForToday(template, getRecurringTargetColumnId(template));
    created++;
  });
  return created;
}

function ensureDueRecurringTasksForColumn(colId, projectId = null) {
  if (typeof getRecurring !== 'function' || typeof getDueDatesForTemplate !== 'function') return 0;
  if (typeof getTasks !== 'function' || typeof addTask !== 'function') return 0;

  let created = 0;
  getRecurring().filter(template => template && template.active !== false).forEach(template => {
    if (projectId !== null && template.projectId !== projectId) return;
    if (!isRecurringTemplateDueTodayForRecovery(template)) return;
    if (getRecurringTargetColumnId(template) !== colId) return;
    if (hasRecurringTaskInstanceForToday(template.id)) return;

    createRecurringTaskInstanceForToday(template, colId);
    created++;
  });
  return created;
}

function patchRecurringTodayRecovery() {
  if (typeof processRecurringTasks !== 'function' || processRecurringTasks._todayRecoveryPatch) return;
  if (typeof getRecurring !== 'function' || typeof getDueDatesForTemplate !== 'function') return;

  const originalProcessRecurringTasks = processRecurringTasks;
  processRecurringTasks = function patchedProcessRecurringTasks() {
    const todayStr = today();
    getRecurring().filter(template => template && template.active !== false).forEach(template => {
      if (!isRecurringTemplateDueTodayForRecovery(template)) return;
      if (hasRecurringTaskInstanceForToday(template.id)) return;

      if (template.lastGenerated && template.lastGenerated >= todayStr) {
        const yesterday = new Date(todayStr + 'T00:00:00');
        yesterday.setDate(yesterday.getDate() - 1);
        updateRecurring(template.id, { lastGenerated: toDateStr2(yesterday) });
      }
    });
    const generated = originalProcessRecurringTasks.apply(this, arguments) || 0;
    return generated + ensureDueRecurringTasksForToday();
  };
  processRecurringTasks._todayRecoveryPatch = true;
}

function refreshTasksPageAfterRecurringPatch() {
  if (refreshTasksPageAfterRecurringPatch._running) return;
  if (typeof document === 'undefined' || !document.querySelector('.tasks-page')) return;
  if (typeof renderTasks !== 'function') return;

  refreshTasksPageAfterRecurringPatch._running = true;
  setTimeout(() => {
    try {
      renderTasks();
    } finally {
      refreshTasksPageAfterRecurringPatch._running = false;
    }
  }, 0);
}

function patchRecurringKanbanRender() {
  if (typeof renderTasks !== 'function' && typeof renderColumn !== 'function') {
    setTimeout(patchRecurringKanbanRender, 50);
    return;
  }

  if (typeof renderColumn === 'function' && !renderColumn._recurringEnsurePatch) {
    const originalRenderColumn = renderColumn;
    renderColumn = function patchedRenderColumn(col, projectId = null) {
      if (col && col.id) ensureDueRecurringTasksForColumn(col.id, projectId);
      return originalRenderColumn.apply(this, arguments);
    };
    renderColumn._recurringEnsurePatch = true;
  }

  if (typeof renderTasks === 'function' && !renderTasks._recurringEnsurePatch) {
    const originalRenderTasks = renderTasks;
    renderTasks = function patchedRenderTasks() {
      ensureDueRecurringTasksForToday();
      return originalRenderTasks.apply(this, arguments);
    };
    renderTasks._recurringEnsurePatch = true;
  }

  ensureDueRecurringTasksForToday();
  refreshTasksPageAfterRecurringPatch();
}

patchRecurringTodayRecovery();
patchRecurringKanbanRender();

function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
