/* ============================================
   CLOUD.JS - optional Supabase backup sync
   ============================================ */

let _cloudClient = null;
let _cloudUser = null;

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

function refreshCloudSettings() {
  if (typeof _currentPage !== 'undefined' && _currentPage === 'settings') renderCurrentPage();
}

async function initCloudSync() {
  const client = getCloudClient();
  if (!client) return;
  const { data } = await client.auth.getSession();
  _cloudUser = data.session?.user || null;
  client.auth.onAuthStateChange((_event, session) => {
    _cloudUser = session?.user || null;
    refreshCloudSettings();
  });
  refreshCloudSettings();
}

async function sendCloudMagicLink() {
  const client = getCloudClient();
  if (!client) {
    showToast('Supabase chưa được cấu hình!', 'error');
    return;
  }
  const email = document.getElementById('cloud-email')?.value.trim();
  if (!email) {
    showToast('Vui lòng nhập email đăng nhập!', 'info');
    return;
  }
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}${location.pathname}` },
  });
  if (error) {
    showToast(`Không thể gửi magic link: ${error.message}`, 'error', 5000);
    return;
  }
  showToast('Đã gửi magic link đăng nhập vào email!', 'success', 5000);
}

async function signOutCloud() {
  const client = getCloudClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) showToast(`Không thể đăng xuất: ${error.message}`, 'error', 5000);
  else showToast('Đã đăng xuất Supabase!', 'success');
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

