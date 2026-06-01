/* ============================================
   JOURNAL.JS — Daily Review / Nhật ký
   ============================================ */

let _journalDate = today();
let _journalReadOnly = false;

const MOOD_EMOJIS = [
  { id: 'terrible', icon: '😫', label: 'Tệ hại' },
  { id: 'sad', icon: '😕', label: 'Buồn' },
  { id: 'neutral', icon: '😐', label: 'Bình thường' },
  { id: 'good', icon: '🙂', label: 'Tốt' },
  { id: 'happy', icon: '😄', label: 'Tuyệt vời' },
];

const RANDOM_QUESTIONS = [
  'Điều gì hôm nay khiến bạn mất tập trung nhất?',
  'Bạn có dành thời gian cho bản thân chưa?',
  'Task nào cảm thấy khó nhất và tại sao?',
  'Điều gì khiến bạn hài lòng nhất trong ngày?',
  'Bạn đã học được gì từ một thất bại nhỏ hôm nay?',
  'Nếu làm lại ngày hôm nay, bạn sẽ thay đổi điều gì?',
  'Điều gì bạn đang trì hoãn và cần phải hành động sớm?',
  'Bạn có giữ được cam kết với bản thân không?',
  'Năng lượng của bạn như thế nào trong ngày?',
  'Điều gì làm bạn cảm thấy biết ơn hôm nay?',
];

function renderJournal() {
  const reviews = getReviews();
  const grouped = {};
  reviews.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${d.getMonth()+1}`;
    (grouped[key] = grouped[key] || []).push(r);
  });

  return `
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">📓 Nhật ký</h1>
        <p class="page-subtitle">Phản tư hàng ngày — Hành trình tự hoàn thiện</p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="exportJournal()">📤 Xuất nhật ký</button>
    </div>
  </div>
  <div class="page-body">
    <div class="journal-layout">
      <!-- Sidebar -->
      <div class="journal-sidebar">
        <div class="journal-sidebar-header">
          <span>📋 Danh sách</span>
          <button class="btn btn-primary btn-sm" onclick="newJournalEntry()">+ Hôm nay</button>
        </div>
        <div class="journal-list">
          ${Object.entries(grouped).sort((a,b) => b[0] > a[0] ? 1 : -1).map(([key, entries]) => {
            const [year, month] = key.split('-');
            return `<div>
              <div style="padding:8px 16px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;background:var(--bg-card2);letter-spacing:0.5px">
                ${VI_MONTHS[parseInt(month)-1]} ${year}
              </div>
              ${entries.sort((a,b) => b.date > a.date ? 1 : -1).map(r => {
                const mood = MOOD_EMOJIS.find(m => m.id === r.eveningMood || m.id === r.morningMood);
                return `<div class="journal-entry-item ${r.date === _journalDate ? 'active' : ''}"
                  onclick="selectJournalEntry('${r.date}')">
                  <div class="journal-entry-date">${formatViDate(new Date(r.date))}</div>
                  <div class="journal-entry-meta">
                    ${mood ? `<span>${mood.icon}</span>` : ''}
                    ${r.score ? `<span class="badge badge-active">⭐ ${r.score}/10</span>` : ''}
                  </div>
                  <div class="journal-entry-preview">${r.morningIntention || r.doneToday || '...'}</div>
                </div>`;
              }).join('')}
            </div>`;
          }).join('')}
          ${reviews.length === 0 ? '<div class="no-data" style="padding:24px 16px"><p>Chưa có nhật ký nào</p></div>' : ''}
        </div>
      </div>

      <!-- Journal Content -->
      <div id="journal-content">
        ${renderJournalEntry()}
      </div>
    </div>
  </div>`;
}

function selectJournalEntry(dateStr) {
  _journalDate = dateStr;
  _journalReadOnly = dateStr !== today();
  const el = document.getElementById('journal-content');
  if (el) {
    el.innerHTML = renderJournalEntry();
    initCollapsibles(el);
    initJournalAutoSave();
  }
  // Update sidebar active state
  document.querySelectorAll('.journal-entry-item').forEach(el => {
    el.classList.toggle('active', el.querySelector('.journal-entry-date')?.textContent === formatViDate(new Date(dateStr)));
  });
}

function newJournalEntry() {
  _journalDate = today();
  _journalReadOnly = false;
  const el = document.getElementById('journal-content');
  if (el) {
    el.innerHTML = renderJournalEntry();
    initCollapsibles(el);
    initJournalAutoSave();
  }
}

function renderJournalEntry() {
  const r = getReviewByDate(_journalDate) || {};
  const pd = getPomodoroData();
  const workedSec = getTimeLogs().filter(l => l.date === _journalDate).reduce((s,l) => s+l.duration, 0);
  const doneTasks = getTasks().filter(t => t.completedAt && t.completedAt.slice(0,10) === _journalDate);
  const isToday = _journalDate === today();
  const isReadOnly = _journalReadOnly && !isToday;
  const pomCount = _journalDate === today() ? pd.todayCount : (r.pomodoroCount || 0);

  return `
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 style="font-size:17px;font-weight:700">${formatViDate(new Date(_journalDate))}</h2>
      <div class="flex items-center gap-2">
        ${isReadOnly ? `<button class="btn btn-ghost btn-sm" onclick="setJournalEditable()">✏️ Chỉnh sửa</button>` : `<span id="journal-save-indicator" style="font-size:12px;color:var(--success)"></span>`}
      </div>
    </div>

    <!-- Morning Section -->
    <div class="collapsible open mb-2">
      <div class="collapsible-header">🌅 Kế hoạch buổi sáng <span class="chevron">▼</span></div>
      <div class="collapsible-body">
        <div class="form-group">
          <label class="form-label">Hôm nay tôi muốn hoàn thành (3 mục tiêu quan trọng nhất):</label>
          ${(r.morningGoals || ['','','']).map((g, i) => `
            <input class="form-input mb-2 journal-field" id="jf-goal-${i}" placeholder="Mục tiêu quan trọng ${i+1}..."
              value="${g}" ${isReadOnly?'readonly':''} data-field="morningGoals" data-index="${i}">`).join('')}
        </div>
        <div class="form-group">
          <label class="form-label">Tâm trạng bắt đầu ngày:</label>
          <div class="emoji-selector" id="jf-morning-mood">
            ${MOOD_EMOJIS.map(m => `<span class="emoji-option ${(r.morningMood||'neutral')===m.id?'selected':''}"
              data-mood="${m.id}" title="${m.label}" ${isReadOnly?'':'onclick="selectMood(\'morning\',\''+m.id+'\')"'}>${m.icon}</span>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ý định hôm nay:</label>
          <input class="form-input journal-field" id="jf-intention" placeholder='VD: "Tập trung, không lướt mạng xã hội"'
            value="${r.morningIntention||''}" ${isReadOnly?'readonly':''}>
        </div>
      </div>
    </div>

    <!-- Evening Section -->
    <div class="collapsible ${isToday?'open':''} mb-2">
      <div class="collapsible-header">✅ Tổng kết cuối ngày <span class="chevron">▼</span></div>
      <div class="collapsible-body">
        ${doneTasks.length > 0 ? `<div style="margin-bottom:12px;padding:10px;background:var(--bg-card2);border-radius:var(--radius-sm)">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:6px">✅ Task đã hoàn thành hôm nay:</div>
          ${doneTasks.map(t => `<div style="font-size:13px;padding:2px 0">• ${t.title}</div>`).join('')}
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">Đã hoàn thành thêm:</label>
          <textarea class="form-textarea journal-field" id="jf-done" placeholder="Ghi thêm những gì bạn đã làm..." ${isReadOnly?'readonly':''}>${r.doneToday||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Chưa làm được / Bị vướng:</label>
          <textarea class="form-textarea journal-field" id="jf-blockers" ${isReadOnly?'readonly':''}>${r.blockers||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Nguyên nhân nếu không đạt kế hoạch:</label>
          <textarea class="form-textarea journal-field" id="jf-fail" ${isReadOnly?'readonly':''}>${r.failReasons||''}</textarea>
        </div>
      </div>
    </div>

    <!-- Lessons -->
    <div class="collapsible mb-2">
      <div class="collapsible-header">💡 Bài học & Insight <span class="chevron">▼</span></div>
      <div class="collapsible-body">
        <div class="form-group">
          <label class="form-label">Điều tôi học được hôm nay:</label>
          <textarea class="form-textarea journal-field" id="jf-lessons" ${isReadOnly?'readonly':''}>${r.lessons||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Điều tôi sẽ làm khác đi ngày mai:</label>
          <textarea class="form-textarea journal-field" id="jf-improvements" ${isReadOnly?'readonly':''}>${r.improvements||''}</textarea>
        </div>
        ${!isReadOnly ? `<button class="btn btn-ghost btn-sm" onclick="getRandomQuestion()">🎲 Câu hỏi gợi ý</button>
        <div id="random-question" style="margin-top:10px;padding:12px;background:var(--primary-light);border-radius:var(--radius-sm);font-size:13px;font-style:italic;display:none"></div>` : ''}
      </div>
    </div>

    <!-- Rating -->
    <div class="collapsible open mb-2">
      <div class="collapsible-header">⭐ Đánh giá ngày <span class="chevron">▼</span></div>
      <div class="collapsible-body">
        <div class="form-group">
          <label class="form-label">Tâm trạng cuối ngày:</label>
          <div class="emoji-selector" id="jf-evening-mood">
            ${MOOD_EMOJIS.map(m => `<span class="emoji-option ${(r.eveningMood||'neutral')===m.id?'selected':''}"
              data-mood="${m.id}" title="${m.label}" ${isReadOnly?'':'onclick="selectMood(\'evening\',\''+m.id+'\')"'}>${m.icon}</span>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Điểm tự đánh giá: <b id="score-val">${r.score||5}</b>/10
            <span style="color:var(--text-muted);font-size:11px;margin-left:4px">${getScoreLabel(r.score||5)}</span>
          </label>
          <div class="slider-wrap">
            <span class="text-sm text-muted">1</span>
            <input type="range" class="range-slider" min="1" max="10" value="${r.score||5}" id="jf-score"
              ${isReadOnly?'disabled':''}
              oninput="document.getElementById('score-val').textContent=this.value;document.getElementById('score-label').textContent=getScoreLabel(parseInt(this.value))">
            <span class="text-sm text-muted">10</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px" id="score-label">${getScoreLabel(r.score||5)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="card" style="padding:12px;text-align:center">
            <div style="font-size:24px;font-weight:700;color:var(--pomodoro)">${pomCount} 🍅</div>
            <div class="text-sm text-muted">Pomodoro hôm nay</div>
          </div>
          <div class="card" style="padding:12px;text-align:center">
            <div style="font-size:24px;font-weight:700">${formatHours(workedSec)}</div>
            <div class="text-sm text-muted">Tổng giờ làm</div>
          </div>
        </div>
      </div>
    </div>

    ${!isReadOnly ? `<div style="padding:12px 0;color:var(--success);font-size:12px" id="journal-save-indicator2"></div>` : ''}
  </div>`;
}

function getScoreLabel(score) {
  if (score <= 2) return '😫 Tệ hại';
  if (score <= 4) return '😕 Dưới mức';
  if (score <= 6) return '😐 Bình thường';
  if (score <= 8) return '🙂 Khá tốt';
  return '😄 Xuất sắc!';
}

function selectMood(part, moodId) {
  const containerId = part === 'morning' ? 'jf-morning-mood' : 'jf-evening-mood';
  document.querySelectorAll(`#${containerId} .emoji-option`).forEach(el => {
    el.classList.toggle('selected', el.dataset.mood === moodId);
  });
  autoSaveJournal();
}

function getRandomQuestion() {
  const q = RANDOM_QUESTIONS[Math.floor(Math.random() * RANDOM_QUESTIONS.length)];
  const el = document.getElementById('random-question');
  if (el) { el.textContent = `💡 "${q}"`; el.style.display = 'block'; }
}

function setJournalEditable() {
  _journalReadOnly = false;
  const el = document.getElementById('journal-content');
  if (el) {
    el.innerHTML = renderJournalEntry();
    initCollapsibles(el);
    initJournalAutoSave();
  }
}

const _journalAutoSave = debounce(() => { autoSaveJournal(); }, 2000);

function initJournalAutoSave() {
  document.querySelectorAll('.journal-field').forEach(el => {
    el.addEventListener('input', _journalAutoSave);
  });
  document.querySelectorAll('#jf-score').forEach(el => {
    el.addEventListener('input', _journalAutoSave);
  });
}

function autoSaveJournal() {
  const goals = [0,1,2].map(i => document.getElementById(`jf-goal-${i}`)?.value || '');
  const morningMood = document.querySelector('#jf-morning-mood .emoji-option.selected')?.dataset.mood || 'neutral';
  const eveningMood = document.querySelector('#jf-evening-mood .emoji-option.selected')?.dataset.mood || 'neutral';
  const score = parseInt(document.getElementById('jf-score')?.value) || 5;
  const pd = getPomodoroData();
  const workedSec = getTimeLogs().filter(l => l.date === _journalDate).reduce((s,l) => s+l.duration, 0);

  saveReview(_journalDate, {
    morningGoals: goals,
    morningMood,
    morningIntention: document.getElementById('jf-intention')?.value || '',
    doneToday: document.getElementById('jf-done')?.value || '',
    blockers: document.getElementById('jf-blockers')?.value || '',
    failReasons: document.getElementById('jf-fail')?.value || '',
    lessons: document.getElementById('jf-lessons')?.value || '',
    improvements: document.getElementById('jf-improvements')?.value || '',
    eveningMood,
    score,
    pomodoroCount: _journalDate === today() ? pd.todayCount : undefined,
    hoursWorked: workedSec / 3600,
  });
  showSaveIndicator('journal-save-indicator');
  showSaveIndicator('journal-save-indicator2');
}

function exportJournal() {
  const reviews = getReviews().sort((a,b) => a.date > b.date ? -1 : 1);
  let md = `# 📓 Nhật ký FreelanceHub\nXuất ngày: ${formatDate(now())}\n\n`;
  reviews.forEach(r => {
    const mood = MOOD_EMOJIS.find(m => m.id === r.eveningMood);
    md += `## ${formatViDate(new Date(r.date))} ${mood?.icon||''} — ⭐ ${r.score||''}/10\n\n`;
    if (r.morningGoals?.some(g => g)) {
      md += `### 🌅 Mục tiêu buổi sáng\n${r.morningGoals.filter(g=>g).map(g => `- ${g}`).join('\n')}\n\n`;
    }
    if (r.morningIntention) md += `**Ý định:** ${r.morningIntention}\n\n`;
    if (r.doneToday) md += `### ✅ Đã hoàn thành\n${r.doneToday}\n\n`;
    if (r.blockers) md += `### ❌ Chướng ngại\n${r.blockers}\n\n`;
    if (r.lessons) md += `### 💡 Bài học\n${r.lessons}\n\n`;
    if (r.improvements) md += `### 🔧 Cải thiện\n${r.improvements}\n\n`;
    md += `---\n\n`;
  });
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `journal-${today()}.md`; a.click();
  URL.revokeObjectURL(url);
  showToast('Đã xuất nhật ký!', 'success');
}

function afterRenderJournal() {
  initCollapsibles();
  initJournalAutoSave();
}
