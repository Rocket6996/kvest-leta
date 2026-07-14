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
// Цвета волос: основные + яркие (розовый, синий, зелёный).
export const HAIR_COLORS = {
  brown: '#4a3826', black: '#23282f', blond: '#c9a24a', ginger: '#b5562a',
  pink: '#d47ba5', blue: '#4a7fb5', green: '#5a9b6a',
};

// Звери-герои: открываются за полностью пройденный предмет и становятся
// игровым аватаром (мини-версия). Рисуются на той же сетке 0..7.
export const ANIMAL_HEROES = {
  owl:      { name: 'Сова',  from: 'Русский язык' },
  squirrel: { name: 'Белка', from: 'Математика' },
  fox:      { name: 'Лиса',  from: 'Чтение' },
  hedgehog: { name: 'Ёжик',  from: 'Окружающий мир' },
};
const ANIMAL_ART = {
  owl: (c = '#8a6f9a') => `
    <rect x="1" y="1" width="1" height="1" fill="${c}"/><rect x="6" y="1" width="1" height="1" fill="${c}"/>
    <rect x="1" y="2" width="6" height="5" fill="${c}"/>
    <rect x="2" y="5" width="4" height="2" fill="#e9e6df" opacity="0.35"/>
    <rect x="1" y="2" width="2" height="2" fill="#e9e6df"/><rect x="5" y="2" width="2" height="2" fill="#e9e6df"/>
    <rect x="2" y="3" width="1" height="1" fill="#2b3a42"/><rect x="5" y="3" width="1" height="1" fill="#2b3a42"/>
    <rect x="3" y="3" width="2" height="1" fill="#d9a441"/>
    <rect x="2" y="7" width="1" height="1" fill="#d9a441"/><rect x="5" y="7" width="1" height="1" fill="#d9a441"/>`,
  squirrel: (c = '#a86a3a') => `
    <rect x="5" y="0" width="2" height="6" fill="#c98a4a"/>
    <rect x="2" y="1" width="1" height="1" fill="${c}"/>
    <rect x="1" y="2" width="4" height="5" fill="${c}"/>
    <rect x="3" y="3" width="1" height="1" fill="#2b3a42"/>
    <rect x="2" y="5" width="2" height="1" fill="#b89a6a"/>
    <rect x="1" y="7" width="1" height="1" fill="${c}"/><rect x="3" y="7" width="1" height="1" fill="${c}"/>`,
  fox: (c = '#c4733f') => `
    <rect x="1" y="0" width="1" height="1" fill="${c}"/><rect x="5" y="0" width="1" height="1" fill="${c}"/>
    <rect x="1" y="1" width="5" height="5" fill="${c}"/>
    <rect x="1" y="4" width="2" height="2" fill="#e9e6df"/>
    <rect x="2" y="2" width="1" height="1" fill="#2b3a42"/><rect x="4" y="2" width="1" height="1" fill="#2b3a42"/>
    <rect x="3" y="3" width="1" height="1" fill="#2b3a42"/>
    <rect x="6" y="3" width="1" height="3" fill="${c}"/><rect x="6" y="5" width="1" height="1" fill="#e9e6df"/>
    <rect x="2" y="6" width="1" height="1" fill="#3d4653"/><rect x="4" y="6" width="1" height="1" fill="#3d4653"/>`,
  hedgehog: () => `
    <rect x="1" y="1" width="1" height="1" fill="#4a3826"/><rect x="3" y="1" width="1" height="1" fill="#4a3826"/><rect x="5" y="1" width="1" height="1" fill="#4a3826"/>
    <rect x="1" y="2" width="5" height="2" fill="#4a3826"/>
    <rect x="1" y="4" width="6" height="3" fill="#c8a06a"/>
    <rect x="5" y="5" width="1" height="1" fill="#2b3a42"/><rect x="6" y="5" width="1" height="1" fill="#23282f"/>
    <rect x="1" y="7" width="1" height="1" fill="#c8a06a"/><rect x="4" y="7" width="1" height="1" fill="#c8a06a"/>`,
};

// Аксессуары героя (покупаются в мастерской, лежат в roomItems).
const ACC_COLOR = { cap: '#c4735f', glasses: '#171b20', balloon: '#c4735f', cape: '#7d6bb5' };

function svgWrap(inner) {
  return `<svg viewBox="0 0 8 8" width="{S}" height="{S}" shape-rendering="crispEdges" aria-label="Разведчик">${inner}</svg>`;
}

// size — сторона квадрата в px; персонаж собран из «пикселей» 8×8 сетки.
export function scoutSvg(size = 48) {
  const s = getState();
  // зверь-герой вместо человечка
  if (ANIMAL_HEROES[s.hero]) {
    return svgWrap(ANIMAL_ART[s.hero]()).replaceAll('{S}', size);
  }

  const jacket = OUTFITS[s.outfit] || OUTFITS.default;
  const HAIR = HAIR_COLORS[s.hairColor] || HAIR_COLORS.brown;
  const girl = s.hero === 'girl';
  const owned = new Set(s.roomItems || []);

  const girlHair = girl ? `
    <rect x="1" y="0" width="1" height="1" fill="${HAIR}"/>
    <rect x="6" y="0" width="1" height="1" fill="${HAIR}"/>
    <rect x="1" y="1" width="1" height="2" fill="${HAIR}"/>
    <rect x="6" y="1" width="1" height="2" fill="${HAIR}"/>` : '';

  // плащ — за спиной (рисуем до тела)
  const cape = owned.has('cape')
    ? `<rect x="1" y="3" width="6" height="4" rx="1" fill="${ACC_COLOR.cape}"/>` : '';
  // кепка поверх волос
  const cap = owned.has('cap')
    ? `<rect x="1" y="0" width="5" height="1" fill="${ACC_COLOR.cap}"/><rect x="5" y="1" width="2" height="1" fill="${ACC_COLOR.cap}"/>` : '';
  // очки поверх глаз
  const glasses = owned.has('glasses')
    ? `<rect x="2" y="1" width="2" height="1" fill="${ACC_COLOR.glasses}"/><rect x="4" y="1" width="2" height="1" fill="${ACC_COLOR.glasses}"/>` : '';
  // шарик в руке
  const balloon = owned.has('balloon')
    ? `<line x1="6.5" y1="2" x2="6.5" y2="4" stroke="#4a3826" stroke-width="0.15"/><circle cx="6.6" cy="1.2" r="1" fill="${ACC_COLOR.balloon}"/>` : '';

  return svgWrap(`
    ${cape}
    <rect x="2" y="0" width="4" height="3" fill="#c8a06a"/>
    <rect x="2" y="0" width="4" height="1" fill="${HAIR}"/>
    ${girlHair}
    <rect x="3" y="1" width="1" height="1" fill="#2b3a42"/>
    <rect x="5" y="1" width="1" height="1" fill="#2b3a42"/>
    <rect x="2" y="3" width="4" height="3" fill="${jacket}"/>
    <rect x="2" y="5" width="4" height="1" fill="#4a3826"/>
    <rect x="1" y="3" width="1" height="3" fill="#c8a06a"/>
    <rect x="6" y="3" width="1" height="3" fill="#c8a06a"/>
    <rect x="2" y="6" width="1" height="2" fill="#3d4653"/>
    <rect x="5" y="6" width="1" height="2" fill="#3d4653"/>
    ${cap}${glasses}${balloon}
  `).replaceAll('{S}', size);
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
