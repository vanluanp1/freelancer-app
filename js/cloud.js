/* ============================================
   CLOUD.JS - optional Supabase backup sync
   ============================================ */

let _cloudClient = null;
let _cloudUser = null;
let _authSubscription = null;
let _cloudSyncTimer = null;
let _cloudSyncState = { status: 'idle', message: 'Chưa đồng bộ', syncedAt: null };
let _cloudSyncInFlight = false;

window.addEventListener('online', () => {
  if (getCloudUser()) onLocalDataChanged();
});
window.addEventListener('offline', () => {
  setCloudSyncState('pending', 'Đang offline, sẽ đồng bộ khi có mạng');
});

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

function getCloudSyncState() {
  return _cloudSyncState;
}

function setCloudSyncState(status, message, syncedAt = _cloudSyncState.syncedAt) {
  _cloudSyncState = { status, message, syncedAt };
  const el = document.getElementById('cloud-sync-status');
  if (el) {
    el.textContent = message;
    el.className = `cloud-sync-status ${status}`;
  }
}

function onLocalDataChanged() {
  if (!getCloudUser()) return;
  setCloudSyncState('pending', 'Có thay đổi chưa đồng bộ');
  clearTimeout(_cloudSyncTimer);
  _cloudSyncTimer = setTimeout(() => syncCloudBackup(), 15000);
}

async function fetchCloudBackup() {
  const client = getCloudClient();
  const user = getCloudUser();
  if (!client || !user) return null;
  const { data, error } = await client
    .from('user_backups')
    .select('payload, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function reconcileCloudBackup() {
  try {
    setCloudSyncState('syncing', 'Đang kiểm tra dữ liệu cloud...');
    const cloud = await fetchCloudBackup();
    if (!cloud?.payload) {
      setCloudSyncState('pending', 'Chưa có backup cloud');
      if (hasLocalUserData()) onLocalDataChanged();
      return;
    }
    const cloudModifiedAt = cloud.payload.sync?.modifiedAt || cloud.updated_at || cloud.payload.createdAt || '';
    const localModifiedAt = getLocalModifiedAt();
    if (!hasLocalUserData() || (cloudModifiedAt && cloudModifiedAt > localModifiedAt)) {
      restoreBackupData(cloud.payload);
      setCloudSyncState('synced', 'Đã tải bản cloud mới nhất', cloud.updated_at);
      return;
    }
    if (localModifiedAt && localModifiedAt > cloudModifiedAt) {
      onLocalDataChanged();
      return;
    }
    setCloudSyncState('synced', 'Đã đồng bộ', cloud.updated_at);
  } catch (error) {
    setCloudSyncState('error', `Lỗi cloud: ${error.message}`);
  }
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
  if (_cloudUser) {
    activateUserStorage(_cloudUser.id);
    await reconcileCloudBackup();
  }
  if (!_authSubscription) {
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      _cloudUser = session?.user || null;
      if (_cloudUser) {
        activateUserStorage(_cloudUser.id);
        reconcileCloudBackup().finally(() => {
          showAuthenticatedApp();
          if (typeof bootAuthenticatedApp === 'function') bootAuthenticatedApp();
        });
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
  return syncCloudBackup({ manual: true });
}

async function syncCloudBackup({ manual = false } = {}) {
  const client = getCloudClient();
  const user = getCloudUser();
  if (!client || !user) {
    showToast('Vui lòng đăng nhập Supabase trước!', 'info');
    return;
  }
  if (_cloudSyncInFlight) return;
  _cloudSyncInFlight = true;
  clearTimeout(_cloudSyncTimer);
  setCloudSyncState('syncing', 'Đang đồng bộ...');
  const payload = manual ? createLocalBackupSnapshot('cloud-upload') : createBackupPayload('auto-cloud-sync');
  try {
    const { error } = await client.from('user_backups').upsert({
      user_id: user.id,
      payload,
      updated_at: now(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
  } catch (error) {
    _cloudSyncInFlight = false;
    setCloudSyncState('error', `Lỗi đồng bộ: ${error.message}`);
    if (manual) showToast(`Không thể đồng bộ cloud: ${error.message}`, 'error', 5000);
    return;
  }
  _cloudSyncInFlight = false;
  setCloudSyncState('synced', 'Đã đồng bộ', payload.createdAt);
  if (manual) showToast('Đã đồng bộ backup lên Supabase!', 'success');
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
    .select('payload, updated_at')
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
    setCloudSyncState('synced', 'Đã khôi phục từ cloud', data.updated_at);
    showToast('Đã khôi phục backup cloud! Đang tải lại...', 'success');
    setTimeout(() => location.reload(), 1200);
  } catch {
    showToast('Backup cloud không hợp lệ!', 'error');
  }
}
