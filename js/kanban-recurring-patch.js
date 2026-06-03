function kanbanRecurringCloneSubtasks(subtasks) {
  if (typeof cloneRecurringSubtasks === 'function') {
    return cloneRecurringSubtasks(subtasks);
  }

  return (subtasks || [])
    .filter(subtask => subtask && String(subtask.text || '').trim())
    .map(subtask => ({
      id: typeof genId === 'function' ? genId() : `${Date.now()}-${Math.random()}`,
      text: String(subtask.text).trim(),
      done: false,
    }));
}

function kanbanRecurringTemplateDueToday(template) {
  if (!template || template.active === false || typeof getDueDatesForTemplate !== 'function') {
    return false;
  }

  const todayStr = today();
  return getDueDatesForTemplate(template, todayStr, todayStr).includes(todayStr);
}

function kanbanEnsureRecurringForColumn(colId, projectId) {
  if (
    typeof getRecurring !== 'function' ||
    typeof getTasks !== 'function' ||
    typeof addTask !== 'function' ||
    typeof today !== 'function'
  ) {
    return 0;
  }

  const todayStr = today();
  const columns = typeof getAllColumns === 'function' ? getAllColumns() : [];
  let created = 0;

  getRecurring()
    .filter(template => template && template.active !== false)
    .forEach(template => {
      if (projectId !== null && template.projectId !== projectId) return;
      if (!kanbanRecurringTemplateDueToday(template)) return;

      const columnExists = columns.some(column => column.id === template.columnId);
      const targetColumnId = columnExists ? template.columnId : 'col-todo';
      if (targetColumnId !== colId) return;

      const alreadyExists = getTasks().some(task =>
        task.recurringId === template.id && task.recurringDate === todayStr
      );
      if (alreadyExists) return;

      addTask({
        title: template.title,
        projectId: template.projectId || null,
        priority: template.priority || 'medium',
        estimatedHours: Number(template.estimatedHours) || 0,
        note: template.note || '',
        columnId: colId,
        deadline: todayStr,
        subtasks: kanbanRecurringCloneSubtasks(template.subtasks),
        recurringId: template.id,
        recurringDate: todayStr,
      });
      created++;
    });

  return created;
}

function installKanbanRecurringPatch() {
  if (typeof renderColumn !== 'function') {
    setTimeout(installKanbanRecurringPatch, 50);
    return;
  }

  if (!renderColumn._kanbanRecurringPatch) {
    const originalRenderColumn = renderColumn;
    renderColumn = function patchedRenderColumn(col, projectId = null) {
      if (col && col.id) {
        kanbanEnsureRecurringForColumn(col.id, projectId);
      }
      return originalRenderColumn.apply(this, arguments);
    };
    renderColumn._kanbanRecurringPatch = true;
  }

  if (typeof renderTasks === 'function' && !renderTasks._kanbanRecurringPatch) {
    const originalRenderTasks = renderTasks;
    renderTasks = function patchedRenderTasks() {
      kanbanEnsureRecurringForColumn('col-todo', null);
      return originalRenderTasks.apply(this, arguments);
    };
    renderTasks._kanbanRecurringPatch = true;
  }
}

installKanbanRecurringPatch();
