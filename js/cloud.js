/* ============================================
   CLOUD.JS - optional Supabase backup sync
   ============================================ */

let _cloudClient = null;
let _cloudUser = null;
let _authSubscription = null;

function isCloudConfigured() {
  const config = window.FREELANCEHUB_CLOUD_CONFIG || {};
  return Boolean(config.supabaseUrl && config.supabasePublishableKey);
}

function getCloudClient() {
  if (!isCloudConfigured() || !window.supabase?.createClient) return null;
  if (!_cloudClient) {
    const config = window.FREELANCEHUB_CLOUD_CONFIG;
    _cloudClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  }
  return _cloudClient;
}

function getCloudUser() {
  return _cloudUser;
}

function setAuthStatus(message, type = '') {
  const status = document.getElementById('auth-status');
  if (!status) return;
  status.textContent = message;
  status.className = `auth-status ${type}`.trim();
}

function showAuthScreen(message = 'Vui lòng đăng nhập bằng Google để tiếp tục.', type = '') {
  document.getElementById('auth-screen')?.classList.remove('auth-hidden');
  document.getElementById('app')?.classList.add('auth-hidden');
  setAuthStatus(message, type);
}

function showAuthenticatedApp() {
  document.getElementById('auth-screen')?.classList.add('auth-hidden');
  document.getElementById('app')?.classList.remove('auth-hidden');
}

function refreshCloudSettings() {
  if (typeof _currentPage !== 'undefined' && _currentPage === 'settings') renderCurrentPage();
}

async function initCloudSync() {
  const client = getCloudClient();
  if (!client) {
    showAuthScreen('Supabase chưa được cấu hình. Vui lòng liên hệ quản trị viên.', 'error');
    return false;
  }
  const { data, error } = await client.auth.getSession();
  if (error) {
    showAuthScreen(`Không thể kiểm tra đăng nhập: ${error.message}`, 'error');
    return false;
  }
  _cloudUser = data.session?.user || null;
  if (!_authSubscription) {
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      _cloudUser = session?.user || null;
      if (_cloudUser) {
        showAuthenticatedApp();
        if (typeof bootAuthenticatedApp === 'function') bootAuthenticatedApp();
      } else {
        showAuthScreen();
      }
      refreshCloudSettings();
    });
    _authSubscription = authListener.subscription;
  }
  if (!_cloudUser) {
    showAuthScreen();
    return false;
  }
  showAuthenticatedApp();
  return true;
}

async function signInWithGoogle() {
  const client = getCloudClient();
  if (!client) {
    showAuthScreen('Supabase chưa được cấu hình. Vui lòng liên hệ quản trị viên.', 'error');
    return;
  }
  setAuthStatus('Đang chuyển tới Google...');
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}${location.pathname}` },
  });
  if (error) {
    showAuthScreen(`Không thể đăng nhập Google: ${error.message}`, 'error');
  }
}

async function signOutCloud() {
  const client = getCloudClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) {
    showToast(`Không thể đăng xuất: ${error.message}`, 'error', 5000);
    return;
  }
  _cloudUser = null;
  showAuthScreen('Đã đăng xuất an toàn.');
}

function getCloudUserLabel() {
  return _cloudUser?.user_metadata?.full_name || _cloudUser?.email || 'Tài khoản Google';
}

async function uploadCloudBackup() {
  const client = getCloudClient();
  const user = getCloudUser();
  if (!client || !user) {
    showToast('Vui lòng đăng nhập Supabase trước!', 'info');
    return;
  }
  const payload = createLocalBackupSnapshot('cloud-upload');
  const { error } = await client.from('user_backups').upsert({
    user_id: user.id,
    payload,
    updated_at: now(),
  }, { onConflict: 'user_id' });
  if (error) {
    showToast(`Không thể đồng bộ cloud: ${error.message}`, 'error', 5000);
    return;
  }
  showToast('Đã đồng bộ backup lên Supabase!', 'success');
  refreshCloudSettings();
}

async function restoreCloudBackup() {
  const client = getCloudClient();
  const user = getCloudUser();
  if (!client || !user) {
    showToast('Vui lòng đăng nhập Supabase trước!', 'info');
    return;
  }
  const { data, error } = await client
    .from('user_backups')
    .select('payload')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    showToast(`Không thể tải backup cloud: ${error.message}`, 'error', 5000);
    return;
  }
  if (!data?.payload) {
    showToast('Chưa có backup nào trên Supabase!', 'info');
    return;
  }
  if (!confirm('Khôi phục backup từ Supabase? Dữ liệu hiện tại sẽ được thay thế.')) return;
  try {
    createLocalBackupSnapshot('before-cloud-restore');
    restoreBackupData(data.payload);
    showToast('Đã khôi phục backup cloud! Đang tải lại...', 'success');
    setTimeout(() => location.reload(), 1200);
  } catch {
    showToast('Backup cloud không hợp lệ!', 'error');
  }
}
