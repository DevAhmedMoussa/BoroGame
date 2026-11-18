let timer: number | undefined;

/** Small pixel-styled message at the bottom of the screen. */
export function toast(message: string, ms = 2200) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.getElementById('ui')!.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => el!.classList.remove('show'), ms);
}
