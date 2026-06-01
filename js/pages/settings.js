/* ============================================
   SETTINGS.JS
   ============================================ */

function renderSettings() {
  const s = getSettings();
  const backupStatus = getBackupStatus();
  const ACCENT_COLORS = ['#6C63FF','#FF6B6B','#2ED573','#54A0FF','#FF9F43','#F368E0'];

  return `
  <div class="page-header">
    <h1 class="page-title">⚙️ Cài đặt</h1>
    <p class="page-subtitle">Tuỳ chỉnh ứng dụng theo sở thích của bạn</p>
  </div>
  <div class="page-body" style="max-width:640px">

    <!-- Personal -->
    <div class="settings-section">
      <div class="settings-section-title">👤 Thông tin cá nhân</div>
      <div class="settings-row">
        <div><div class="settings-label">Tên hiển thị</div><div class="settings-desc">Dùng trong lời chào trên Dashboard</div></div>
        <input id="set-name" class="form-input" value="${escapeHtml(s.userName||'')}" style="max-width:200px" placeholder="Nhập tên của bạn...">
      </div>
    </div>

    <!-- Work Hours -->
    <div class="settings-section">
      <div class="settings-section-title">🕐 Giờ làm việc</div>
      <div class="settings-row">
        <div><div class="settings-label">Bắt đầu làm việc</div></div>
        <input id="set-work-start" type="time" class="form-input" value="${s.workHoursStart||'08:00'}" style="max-width:140px">
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Kết thúc làm việc</div></div>
        <input id="set-work-end" type="time" class="form-input" value="${s.workHoursEnd||'18:00'}" style="max-width:140px">
      </div>
    </div>

    <!-- Appearance -->
    <div class="settings-section">
      <div class="settings-section-title">🎨 Giao diện</div>
      <div class="settings-row">
        <div><div class="settings-label">Chế độ tối</div><div class="settings-desc">Giao diện tối, dễ nhìn về đêm</div></div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-dark" ${s.darkMode?'checked':''} onchange="toggleDarkMode(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Màu accent</div><div class="settings-desc">Màu chủ đạo của giao diện</div></div>
        <div style="display:flex;gap:8px">
          ${ACCENT_COLORS.map(c => `<div class="color-swatch ${s.accentColor===c?'selected':''}"
            style="background:${c}" data-color="${c}"
            onclick="selectAccentColor(this,'${c}')"></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Sound -->
    <div class="settings-section">
      <div class="settings-section-title">🔔 Âm thanh</div>
      <div class="settings-row">
        <div><div class="settings-label">Bật âm thanh</div><div class="settings-desc">Âm thanh chuông Pomodoro, habit...</div></div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-sound" ${s.soundEnabled!==false?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Finance Settings -->
    <div class="settings-section">
      <div class="settings-section-title">💰 Thu Chi</div>
      <div class="settings-row">
        <div><div class="settings-label">Tiền tệ mặc định</div></div>
        <div class="fin-currency-toggle">
          <button class="fin-cur-btn ${(getFinanceSettings().defaultCurrency||'VND')==='VND'?'active':''}" id="fin-set-vnd" onclick="selectFinSettingCurrency('VND')">VNĐ</button>
          <button class="fin-cur-btn ${(getFinanceSettings().defaultCurrency||'VND')==='USD'?'active':''}" id="fin-set-usd" onclick="selectFinSettingCurrency('USD')">USD</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Tỷ giá USD → VNĐ</div><div class="settings-desc">VD: 25000 nghĩa là 1 USD = 25,000 VNĐ</div></div>
        <input id="set-exchange-rate" type="number" class="form-input" value="${getFinanceSettings().exchangeRate||25000}" style="max-width:120px">
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Tự động quy đổi USD sang VNĐ trong thống kê</div></div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-auto-convert" ${getFinanceSettings().autoConvert?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Quản lý danh mục thu chi</div><div class="settings-desc">Thêm, xóa danh mục tùy chỉnh</div></div>
        <button class="btn btn-ghost btn-sm" onclick="openFinanceCategoryManager()">🗂️ Quản lý</button>
      </div>
    </div>

    <!-- Save Settings -->
    <div class="mb-4">
      <button class="btn btn-primary w-full" onclick="saveAllSettings()">💾 Lưu cài đặt</button>
    </div>

    <!-- Data Management -->
    <div class="settings-section">
      <div class="settings-section-title">💾 Quản lý dữ liệu</div>
      <div class="settings-row">
        <div><div class="settings-label">Tự động sao lưu</div><div class="settings-desc">Lưu snapshot nội bộ mỗi ngày 1 lần, giữ tối đa 7 bản gần nhất</div></div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-auto-backup" ${s.autoBackup?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Backup nội bộ</div><div class="settings-desc">${backupStatus.lastBackupAt ? `Gần nhất: ${formatDateTime(backupStatus.lastBackupAt)} · ${backupStatus.count} bản đang lưu` : 'Chưa có snapshot nào'}</div></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="createManualBackup()">💾 Sao lưu ngay</button>
          <button class="btn btn-ghost btn-sm" onclick="restoreLatestLocalBackup()">↩️ Khôi phục</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Xuất toàn bộ dữ liệu</div><div class="settings-desc">Tải về file JSON để backup</div></div>
        <button class="btn btn-ghost btn-sm" onclick="exportAllData()">📤 Xuất JSON</button>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Nhập dữ liệu</div><div class="settings-desc">Khôi phục từ file JSON backup</div></div>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('import-file').click()">📥 Nhập JSON</button>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importAllData(this.files[0])">
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Xóa toàn bộ dữ liệu</div><div class="settings-desc">⚠️ Hành động không thể hoàn tác!</div></div>
        <button class="btn btn-danger btn-sm" onclick="confirmClearData()">🗑️ Xóa tất cả</button>
      </div>
    </div>

    <!-- Cloud Sync -->
    <div class="settings-section">
      <div class="settings-section-title">☁️ Đồng bộ Supabase</div>
      ${renderCloudSyncSettings()}
    </div>

    <!-- About -->
    <div class="card" style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:8px">🚀</div>
      <div style="font-weight:700;font-size:16px;color:var(--primary)">FreelanceHub</div>
      <div class="text-sm text-muted mt-2">Ứng dụng quản lý công việc dành cho freelancer</div>
      <div class="text-sm text-muted">Chạy hoàn toàn trên trình duyệt, dữ liệu lưu tại localStorage</div>
    </div>
  </div>`;
}

function renderCloudSyncSettings() {
  if (!isCloudConfigured()) {
    return `<div class="settings-row">
      <div><div class="settings-label">Chưa cấu hình Supabase</div><div class="settings-desc">Điền Project URL và Publishable Key trong js/config.js để bật backup cloud.</div></div>
    </div>`;
  }
  const user = getCloudUser();
  if (!user) {
    return `<div class="settings-row">
      <div><div class="settings-label">Chưa đăng nhập</div><div class="settings-desc">Đăng nhập Google để dùng backup cloud.</div></div>
      <button class="btn btn-primary btn-sm" onclick="signInWithGoogle()">Đăng nhập Google</button>
    </div>`;
  }
  return `<div class="settings-row">
    <div><div class="settings-label">${escapeHtml(getCloudUserLabel())}</div><div class="settings-desc">${escapeHtml(user.email || '')} · Dữ liệu cloud được bảo vệ theo tài khoản.</div></div>
    <button class="btn btn-ghost btn-sm" onclick="signOutCloud()">Đăng xuất</button>
  </div>
  <div class="settings-row">
    <div><div class="settings-label">Backup cloud</div><div class="settings-desc">Đồng bộ snapshot hiện tại hoặc khôi phục dữ liệu đã lưu trên Supabase.</div></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost btn-sm" onclick="uploadCloudBackup()">☁️ Đồng bộ</button>
      <button class="btn btn-ghost btn-sm" onclick="restoreCloudBackup()">↩️ Khôi phục</button>
    </div>
  </div>`;
}

function saveAllSettings() {
  saveSettings({
    userName: document.getElementById('set-name')?.value.trim() || 'Bạn',
    workHoursStart: document.getElementById('set-work-start')?.value || '08:00',
    workHoursEnd: document.getElementById('set-work-end')?.value || '18:00',
    soundEnabled: document.getElementById('set-sound')?.checked !== false,
    autoBackup: document.getElementById('set-auto-backup')?.checked || false,
  });
  // Finance settings
  const exchangeRate = parseFloat(document.getElementById('set-exchange-rate')?.value) || 25000;
  const autoConvert = document.getElementById('set-auto-convert')?.checked || false;
  saveFinanceSettings({ exchangeRate, autoConvert });
  showToast('Đã lưu cài đặt!', 'success');
}

function createManualBackup() {
  createLocalBackupSnapshot('manual');
  showToast('Đã tạo backup nội bộ!', 'success');
  renderCurrentPage();
}

let _finSetCurrency = null;
function selectFinSettingCurrency(cur) {
  _finSetCurrency = cur;
  saveFinanceSettings({ defaultCurrency: cur });
  document.getElementById('fin-set-vnd')?.classList.toggle('active', cur === 'VND');
  document.getElementById('fin-set-usd')?.classList.toggle('active', cur === 'USD');
  showToast(`Đã đổi tiền tệ mặc định sang ${cur}!`, 'success');
}


function toggleDarkMode(enabled) {
  document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
  saveSettings({ darkMode: enabled });
  const icon = document.getElementById('dark-mode-icon');
  if (icon) icon.textContent = enabled ? '☀️' : '🌙';
  const label = document.querySelector('.dark-mode-btn .nav-label');
  if (label) label.textContent = enabled ? 'Chế độ sáng' : 'Chế độ tối';
}

function selectAccentColor(el, color) {
  document.querySelectorAll('.settings-section .color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  document.documentElement.style.setProperty('--primary', color);
  saveSettings({ accentColor: color });
  showToast('Đã đổi màu accent!', 'success');
}

function confirmClearData() {
  if (confirm('⚠️ BẠN CHẮC CHẮN KHÔNG?\n\nToàn bộ dữ liệu (tasks, dự án, thói quen, nhật ký...) sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác!')) {
    clearAllData();
  }
}

// Apply saved settings on load
function applySettings() {
  const s = getSettings();
  if (s.darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('dark-mode-icon');
    if (icon) icon.textContent = '☀️';
    const label = document.querySelector('.dark-mode-btn .nav-label');
    if (label) label.textContent = 'Chế độ sáng';
  }
  if (s.accentColor && s.accentColor !== '#6C63FF') {
    document.documentElement.style.setProperty('--primary', safeCssColor(s.accentColor));
  }
}
