// «Крафт-разведчик» — оригинальный блочный персонаж (никаких чужих ассетов).
// Рисуется кодом как SVG из прямоугольников, чтобы легко менять снаряжение.
import { getState, xpForLevel } from './state.js';

const RESOURCE_META = {
  wood:  { icon: '🪵', title: 'Дерево' },
  stone: { icon: '🪨', title: 'Камень' },
  iron:  { icon: '⛓️', title: 'Железо' },
  gold:  { icon: '⭐', title: 'Золото' },
};

// size — сторона квадрата в px; персонаж собран из «пикселей» 8×8 сетки
export function scoutSvg(size = 48) {
  return `
  <svg viewBox="0 0 8 8" width="${size}" height="${size}" shape-rendering="crispEdges" aria-label="Крафт-разведчик">
    <!-- голова -->
    <rect x="2" y="0" width="4" height="3" fill="#c8a06a"/>
    <!-- волосы -->
    <rect x="2" y="0" width="4" height="1" fill="#4a3826"/>
    <!-- глаза -->
    <rect x="3" y="1" width="1" height="1" fill="#2b3a42"/>
    <rect x="5" y="1" width="1" height="1" fill="#2b3a42"/>
    <!-- куртка разведчика (бирюзовая) -->
    <rect x="2" y="3" width="4" height="3" fill="#2e8d87"/>
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
