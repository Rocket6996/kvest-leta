// «Крафт-разведчик» — оригинальный блочный персонаж (никаких чужих ассетов).
// Рисуется кодом как SVG из прямоугольников, чтобы легко менять снаряжение.
import { getState, xpForLevel } from './state.js';

const RESOURCE_META = {
  wood:  { icon: '🪵', title: 'Дерево' },
  stone: { icon: '🪨', title: 'Камень' },
  iron:  { icon: '⛓️', title: 'Железо' },
  gold:  { icon: '⭐', title: 'Золото' },
};

// Цвета куртки — бесплатный выбор внешности (экран героя), не покупка.
// «default» — родная бирюзовая; девчачьи тона приглушённые, в общем стиле.
export const OUTFITS = {
  default: '#2e8d87', teal: '#2e8d87',
  violet: '#7d6bb5', mustard: '#d9a441', terra: '#c4735f',
  rose: '#c47a8f', lavender: '#9a86c4', plum: '#8a5a6a',
};
const HAIR = '#4a3826';

// size — сторона квадрата в px; персонаж собран из «пикселей» 8×8 сетки.
// hero === 'girl' — длинные волосы, обрамляющие лицо; иначе короткая стрижка.
export function scoutSvg(size = 48) {
  const s = getState();
  const jacket = OUTFITS[s.outfit] || OUTFITS.default;
  const girl = s.hero === 'girl';
  const girlHair = girl ? `
    <rect x="1" y="0" width="1" height="1" fill="${HAIR}"/>
    <rect x="6" y="0" width="1" height="1" fill="${HAIR}"/>
    <rect x="1" y="1" width="1" height="2" fill="${HAIR}"/>
    <rect x="6" y="1" width="1" height="2" fill="${HAIR}"/>` : '';
  return `
  <svg viewBox="0 0 8 8" width="${size}" height="${size}" shape-rendering="crispEdges" aria-label="Крафт-разведчик">
    <!-- голова -->
    <rect x="2" y="0" width="4" height="3" fill="#c8a06a"/>
    <!-- волосы -->
    <rect x="2" y="0" width="4" height="1" fill="${HAIR}"/>
    ${girlHair}
    <!-- глаза -->
    <rect x="3" y="1" width="1" height="1" fill="#2b3a42"/>
    <rect x="5" y="1" width="1" height="1" fill="#2b3a42"/>
    <!-- куртка разведчика (цвет — из выбора внешности) -->
    <rect x="2" y="3" width="4" height="3" fill="${jacket}"/>
    <!-- ремень -->
    <rect x="2" y="5" width="4" height="1" fill="#4a3826"/>
    <!-- руки -->
    <rect x="1" y="3" width="1" height="3" fill="#c8a06a"/>
    <rect x="6" y="3" width="1" height="3" fill="#c8a06a"/>
    <!-- ноги -->
    <rect x="2" y="6" width="1" height="2" fill="#3d4653"/>
    <rect x="5" y="6" width="1" height="2" fill="#3d4653"/>
  </svg>`;
}

export function renderHud() {
  const s = getState();

  document.getElementById('hud-avatar').innerHTML = scoutSvg(48);
  document.getElementById('hud-level-label').textContent = `Ур. ${s.level}`;

  const need = xpForLevel(s.level);
  document.getElementById('hud-xp-fill').style.width = `${Math.round((s.xp / need) * 100)}%`;

  const stars = '★'.repeat(s.dailyStars) + '☆'.repeat(Math.max(0, 3 - s.dailyStars));
  document.getElementById('hud-stars').textContent = stars;

  document.getElementById('hud-resources').innerHTML = Object.entries(s.resources)
    .map(([type, count]) => {
      const meta = RESOURCE_META[type];
      return `<span class="res" title="${meta.title}">${meta.icon} ${count}</span>`;
    })
    .join('');
}
