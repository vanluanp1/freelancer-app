/* ============================================
   PWA.JS - offline shell registration
   ============================================ */

function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
