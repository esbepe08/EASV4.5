// Fullscreen toggle (a Game Tools button). A page cannot force fullscreen: browsers only allow it from a user gesture and always let the user leave, so this is a
// toggle. The button hides itself where the API does not exist (iPhone Safari) or the app already runs in a fullscreen display mode. Pure UI: no game state.
const el = document.documentElement;
const request = () => (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' });
const exit = () => (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const PATH = { enter: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', leave: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' };

export function initFullscreen() {
  const b = document.getElementById('bFs'); if (!b) return;
  if (!(el.requestFullscreen || el.webkitRequestFullscreen) || matchMedia('(display-mode: fullscreen)').matches) { b.hidden = true; return; }
  const sync = () => {
    const on = isFs(), t = on ? 'إنهاء ملء الشاشة' : 'ملء الشاشة';
    b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', t); b.title = t;
    b.querySelector('.lbl').textContent = t; b.querySelector('path').setAttribute('d', on ? PATH.leave : PATH.enter);
  };
  b.addEventListener('click', async () => { try { await (isFs() ? exit() : request()); } catch { /* refused by the browser: nothing to do */ } sync(); });
  document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
  sync();
}
