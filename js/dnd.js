/* ============================================
   DND.JS — Drag and Drop for Kanban
   ============================================ */

let _dragging = null;
let _dragOverCol = null;
let _dragOverCard = null;
let _placeholder = null;

function initKanbanDnD(boardEl, onDrop) {
  if (!boardEl) return;
  boardEl.addEventListener('dragstart', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    _dragging = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
    // Create placeholder
    _placeholder = document.createElement('div');
    _placeholder.className = 'task-card placeholder-card';
    _placeholder.style.cssText = `height:${card.offsetHeight}px;background:var(--primary-light);border:2px dashed var(--primary);border-radius:var(--radius-sm);opacity:0.6;`;
    setTimeout(() => { card.style.opacity = '0.5'; }, 0);
  });

  boardEl.addEventListener('dragend', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    card.classList.remove('dragging');
    card.style.opacity = '';
    if (_placeholder && _placeholder.parentNode) _placeholder.remove();
    _placeholder = null;
    _dragging = null;
    _dragOverCol = null;
  });

  boardEl.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const col = e.target.closest('.kanban-col');
    const card = e.target.closest('.task-card');
    if (!col || !_dragging) return;

    const colCards = col.querySelector('.col-cards');
    if (!colCards) return;

    if (card && card !== _dragging && card !== _placeholder) {
      const rect = card.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) colCards.insertBefore(_placeholder, card);
      else colCards.insertBefore(_placeholder, card.nextSibling);
    } else if (!card) {
      colCards.appendChild(_placeholder);
    }
  });

  boardEl.addEventListener('drop', e => {
    e.preventDefault();
    if (!_dragging || !_placeholder) return;
    const col = e.target.closest('.kanban-col');
    if (!col) return;
    const colId = col.dataset.colId;
    const colCards = col.querySelector('.col-cards');
    const cards = [...colCards.querySelectorAll('.task-card:not(.placeholder-card)')];
    // Determine new order: where placeholder is
    const sibIdx = [...colCards.children].indexOf(_placeholder);
    colCards.insertBefore(_dragging, _placeholder);
    _placeholder.remove();
    // Calculate actual order among cards
    const finalCards = [...colCards.querySelectorAll('.task-card')];
    const newOrder = finalCards.indexOf(_dragging);
    const taskId = _dragging.dataset.id;
    if (onDrop) onDrop(taskId, colId, newOrder);
  });
}

// Simple sortable list (for habits etc.)
function initSortable(listEl, onReorder) {
  if (!listEl) return;
  let src = null;
  listEl.querySelectorAll('[draggable]').forEach(item => {
    item.addEventListener('dragstart', e => {
      src = item;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => item.style.opacity = '0.5', 0);
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '';
      src = null;
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (src && src !== item) {
        const r = item.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) listEl.insertBefore(src, item);
        else listEl.insertBefore(src, item.nextSibling);
      }
    });
  });
  listEl.addEventListener('drop', e => {
    e.preventDefault();
    if (onReorder) {
      const ids = [...listEl.querySelectorAll('[data-id]')].map(el => el.dataset.id);
      onReorder(ids);
    }
  });
}
