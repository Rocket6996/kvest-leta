// Черновик: canvas для решения «в столбик» пером или пальцем.
// Pointer Events: pointerType === 'pen' даёт нажим Apple Pencil (толщина линии).
// В standalone-режиме iPadOS нажим может не приходить — тогда линия просто ровная,
// функция от этого не страдает.
export function initScratchpad(host) {
  host.insertAdjacentHTML('beforeend', `
    <details class="scratch">
      <summary>✏️ Черновик</summary>
      <canvas class="scratch-canvas" aria-label="Место для решения"></canvas>
      <button type="button" class="scratch-clear">Стереть</button>
    </details>`);

  const details = host.querySelector('.scratch');
  const canvas = host.querySelector('.scratch-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  }

  details.addEventListener('toggle', () => { if (details.open) resize(); });

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  canvas.addEventListener('pointerdown', (e) => {
    // ладонь, лежащая на экране рядом с пером, не рисует
    if (e.pointerType === 'touch' && e.width > 30) return;
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(...pos(e));
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    // перо с нажимом — живая линия; без нажима (standalone) — ровные 3px
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure > 0 ? 1.5 + e.pressure * 5 : 3;
    ctx.lineTo(...pos(e));
    ctx.stroke();
    e.preventDefault();
  });

  ['pointerup', 'pointercancel'].forEach((ev) =>
    canvas.addEventListener(ev, () => { drawing = false; }));

  host.querySelector('.scratch-clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}
