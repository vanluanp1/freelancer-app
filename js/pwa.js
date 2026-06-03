/* ============================================
   PWA.JS - offline shell registration
   ============================================ */

function createRecurringSubtaskCopies(subtasks) {
  if (typeof cloneRecurringSubtasks === 'function') return cloneRecurringSubtasks(subtasks);
  return (subtasks || [])
    .filter(item => item && String(item.text || '').trim())
    .map(item => ({ id: genId(), text: String(item.text).trim(), done: false }));
}

function ensureDueRecurringTasksForToday() {
  if (typeof getRecurring !== 'function' || typeof getDueDatesForTemplate !== 'function') return 0;
  if (typeof getTasks !== 'function' || typeof addTask !== 'function') return 0;

  const todayStr = today();
  let created = 0;
  getRecurring().filter(template => template.active).forEach(template => {
    const dueToday = getDueDatesForTemplate(template, todayStr, todayStr).includes(todayStr);
    if (!dueToday) return;

    const alreadyExists = getTasks().some(task => task.recurringId === template.id && task.recurringDate === todayStr);
    if (alreadyExists) return;

    const columnExists = typeof getAllColumns === 'function'
      ? getAllColumns().some(column => column.id === template.columnId)
      : false;
    const columnId = columnExists ? template.columnId : 'col-todo';

    addTask({
      title: template.title,
      projectId: template.projectId || null,
      priority: template.priority,
      estimatedHours: template.estimatedHours,
      note: template.note,
      columnId,
      deadline: todayStr,
      subtasks: createRecurringSubtaskCopies(template.subtasks),
      recurringId: template.id,
      recurringDate: todayStr,
    });
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
    const generated = originalProcessRecurringTasks.apply(this, arguments) || 0;
    return generated + ensureDueRecurringTasksForToday();
  };
  processRecurringTasks._todayRecoveryPatch = true;
}

function patchRecurringKanbanRender() {
  if (typeof renderTasks !== 'function') {
    setTimeout(patchRecurringKanbanRender, 50);
    return;
  }
  if (renderTasks._recurringEnsurePatch) return;

  const originalRenderTasks = renderTasks;
  renderTasks = function patchedRenderTasks() {
    ensureDueRecurringTasksForToday();
    return originalRenderTasks.apply(this, arguments);
  };
  renderTasks._recurringEnsurePatch = true;
}

patchRecurringTodayRecovery();
patchRecurringKanbanRender();

function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
