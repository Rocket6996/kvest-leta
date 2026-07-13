// Черновик: canvas для решения «в столбик» пером или пальцем.
// Оптимизации против лага в standalone-режиме iPadOS:
//  1) рисуем короткими сегментами (последняя точка → новая), а не одним
//     растущим путём — иначе каждый штрих перерисовывает всю линию (O(n²));
//  2) координаты холста кешируем на время штриха, не дёргаем layout на каждый
//     pointermove;
//  3) забираем промежуточные точки пера getCoalescedEvents() — линия гладкая
//     даже при быстром письме.
// Нажим Apple Pencil (pressure) задаёт толщину; в standalone он может не
// приходить — тогда линия ровная, функция не страдает.
export function initScratchpad(host) {
  host.insertAdjacentHTML('beforeend', `
    <details class="scratch">
      <summary>✏️ Черновик</summary>
      <canvas class="scratch-canvas" aria-label="Место для решения"></canvas>
      <button type="button" class="scratch-clear">Стереть</button>
    </details>`);

  const details = host.querySelector('.scratch');
  const canvas = host.querySelector('.scratch-canvas');
  const ctx = canvas.getContext('2d', { desynchronized: true }); // ниже задержка ввода
  let drawing = false;
  let rect = null;      // кеш положения холста на время штриха
  let lastX = 0, lastY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // на iPad Pro хватает 2×
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // сброс, а не накопление масштаба
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  }

  details.addEventListener('toggle', () => { if (details.open) resize(); });

  const px = (e) => [e.clientX - rect.left, e.clientY - rect.top];

  function segment(e) {
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure > 0 ? 1.5 + e.pressure * 5 : 3;
    const [x, y] = px(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x; lastY = y;
  }

  canvas.addEventListener('pointerdown', (e) => {
    // ладонь, лежащая на экране рядом с пером, не рисует
    if (e.pointerType === 'touch' && e.width > 30) return;
    drawing = true;
    rect = canvas.getBoundingClientRect(); // один раз на штрих
    canvas.setPointerCapture(e.pointerId);
    [lastX, lastY] = px(e);
    // точка от одиночного касания
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure > 0 ? 1.5 + e.pressure * 5 : 3;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(lastX + 0.01, lastY);
    ctx.stroke();
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    // все промежуточные точки пера, а не только последнюю;
    // если список пуст (бывает у части событий) — рисуем по самому событию
    const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    const points = coalesced && coalesced.length ? coalesced : [e];
    for (const p of points) segment(p);
    e.preventDefault();
  }, { passive: false });

  ['pointerup', 'pointercancel'].forEach((ev) =>
    canvas.addEventListener(ev, () => { drawing = false; }));

  host.querySelector('.scratch-clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}
