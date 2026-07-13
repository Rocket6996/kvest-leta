// Хаб-карта: четыре «двери» предметов вокруг лагеря разведчика.
import { solvedCount } from './state.js';
import { solvedInTopic, isSolved } from './engine.js';
import { scoutSvg } from './character.js';

const RESOURCE_ICON = { wood: '🪵', stone: '🪨', iron: '⛓️', gold: '⭐' };

// какие ресурсы ещё можно добыть в подтеме (по нерешённым заданиям)
const contentCache = {};
async function loadContent(subjectId) {
  if (!(subjectId in contentCache)) {
    try {
      contentCache[subjectId] = await (await fetch(`content/${subjectId}.json`)).json();
    } catch {
      contentCache[subjectId] = null;
    }
  }
  return contentCache[subjectId];
}

function remainingLabel(subject, topicContent) {
  if (!topicContent) return '';
  const left = {};
  for (const task of topicContent.tasks) {
    if (!isSolved(subject.id, topicContent.id, task.id)) {
      const r = task.resource || 'wood';
      left[r] = (left[r] || 0) + 1;
    }
  }
  const parts = ['wood', 'stone', 'iron', 'gold']
    .filter((r) => left[r])
    .map((r) => `${RESOURCE_ICON[r]}${left[r]}`);
  return parts.length ? `<span class="topic-res">в жиле: ${parts.join(' ')}</span>` : '<span class="topic-res">✓ выработана</span>';
}

// позиции дверей на карте 900×520
const DOOR_POS = [
  { x: 120, y: 60 },
  { x: 560, y: 60 },
  { x: 120, y: 300 },
  { x: 560, y: 300 },
];

function totalTasks(subject) {
  return subject.topics.reduce((sum, t) => sum + t.tasks, 0);
}

// Звери-символы дверей: один зверёк приходит за каждую полностью выработанную
// подтему. У каждого предмета свой герой — карта заселяется его стайкой.
// Рисуются кодом на сетке 0..7, в общем воксельном стиле.
const MASCOT = {
  russian: (c) => `
    <rect x="1" y="1" width="1" height="1" fill="${c}"/><rect x="5" y="1" width="1" height="1" fill="${c}"/>
    <rect x="1" y="2" width="5" height="5" fill="${c}"/>
    <rect x="2" y="4" width="3" height="3" fill="#e9e6df" opacity="0.5"/>
    <rect x="1" y="2" width="2" height="2" fill="#e9e6df"/><rect x="4" y="2" width="2" height="2" fill="#e9e6df"/>
    <rect x="2" y="3" width="1" height="1" fill="#2b3a42"/><rect x="4" y="3" width="1" height="1" fill="#2b3a42"/>
    <rect x="3" y="3" width="1" height="1" fill="var(--mustard)"/>
    <rect x="2" y="7" width="1" height="1" fill="var(--mustard)"/><rect x="4" y="7" width="1" height="1" fill="var(--mustard)"/>`,
  math: (c) => `
    <rect x="5" y="1" width="2" height="6" fill="#a07a4a"/>
    <rect x="2" y="1" width="1" height="1" fill="${c}"/>
    <rect x="1" y="2" width="4" height="5" fill="${c}"/>
    <rect x="3" y="3" width="1" height="1" fill="#2b3a42"/>
    <rect x="2" y="5" width="2" height="1" fill="#b89a6a"/>
    <rect x="1" y="7" width="1" height="1" fill="${c}"/><rect x="3" y="7" width="1" height="1" fill="${c}"/>`,
  reading: (c) => `
    <rect x="1" y="0" width="1" height="2" fill="${c}"/><rect x="5" y="0" width="1" height="2" fill="${c}"/>
    <rect x="1" y="2" width="5" height="4" fill="${c}"/>
    <rect x="1" y="4" width="2" height="2" fill="#e9e6df"/>
    <rect x="2" y="3" width="1" height="1" fill="#2b3a42"/><rect x="4" y="3" width="1" height="1" fill="#2b3a42"/>
    <rect x="3" y="4" width="1" height="1" fill="#2b3a42"/>
    <rect x="6" y="3" width="1" height="3" fill="${c}"/><rect x="6" y="5" width="1" height="1" fill="#e9e6df"/>
    <rect x="2" y="6" width="1" height="1" fill="#3d4653"/><rect x="4" y="6" width="1" height="1" fill="#3d4653"/>`,
  world: () => `
    <rect x="1" y="1" width="1" height="1" fill="#4a3826"/><rect x="3" y="1" width="1" height="1" fill="#4a3826"/><rect x="5" y="1" width="1" height="1" fill="#4a3826"/>
    <rect x="1" y="2" width="5" height="2" fill="#4a3826"/>
    <rect x="1" y="4" width="6" height="3" fill="#c8a06a"/>
    <rect x="5" y="5" width="1" height="1" fill="#2b3a42"/><rect x="6" y="5" width="1" height="1" fill="#2b3a42"/>
    <rect x="1" y="7" width="1" height="1" fill="#c8a06a"/><rect x="4" y="7" width="1" height="1" fill="#c8a06a"/>`,
};

// естественные цвета зверей
const MASCOT_COLOR = { russian: '#8a6f9a', math: '#a86a3a', reading: '#c4733f', world: '#8a7355' };

function mascotSvg(kind, x, y) {
  const color = MASCOT_COLOR[kind] || '#8a7355';
  return `<g transform="translate(${x}, ${y}) scale(3.2)" shape-rendering="crispEdges">${MASCOT[kind](color)}</g>`;
}

function mascotsFor(subject, pos) {
  const done = subject.topics.filter((t) => solvedInTopic(subject.id, t.id) >= t.tasks).length;
  return Array.from({ length: done }, (_, k) =>
    mascotSvg(subject.id, pos.x + 4 + k * 34, pos.y + 190)).join('');
}

function doorSvg(subject, pos) {
  const solved = solvedCount(subject.id);
  const total = totalTasks(subject);
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return `
  <g class="door" data-subject="${subject.id}" transform="translate(${pos.x}, ${pos.y})"
     role="button" aria-label="${subject.title}, пройдено ${pct}%">
    <rect class="door-body" x="0" y="20" width="220" height="130" rx="10" fill="var(--bg-raised)"
          stroke="${subject.color}" stroke-width="4"/>
    <rect x="85" y="55" width="50" height="95" rx="4" fill="${subject.color}"/>
    <circle cx="122" cy="105" r="4" fill="var(--bg-sunken)"/>
    <text class="door-label" x="110" y="10" dominant-baseline="hanging">${subject.title}</text>
    <text class="door-progress" x="110" y="170" dominant-baseline="hanging">${subject.place} · ${pct}%</text>
  </g>`;
}

export function renderMap(container, subjects, onOpenSubject) {
  container.innerHTML = `
    <svg id="map-svg" viewBox="0 0 900 520" xmlns="http://www.w3.org/2000/svg">
      <!-- тропинки от лагеря к дверям -->
      ${DOOR_POS.map((p) => `
        <line x1="450" y1="260" x2="${p.x + 110}" y2="${p.y + 85}"
              stroke="var(--bg-raised)" stroke-width="8" stroke-dasharray="2 14" stroke-linecap="round"/>
      `).join('')}
      <!-- лагерь с персонажем в центре -->
      <g transform="translate(402, 212)">
        <rect x="-14" y="-14" width="124" height="124" rx="14" fill="var(--bg-raised)"/>
        <g transform="translate(18, 6)">
          <foreignObject x="0" y="0" width="64" height="64">${scoutSvg(64)}</foreignObject>
        </g>
        <text class="door-progress" x="48" y="116" dominant-baseline="hanging">Лагерь</text>
      </g>
      ${subjects.map((s, i) => doorSvg(s, DOOR_POS[i])).join('')}
      ${subjects.map((s, i) => mascotsFor(s, DOOR_POS[i])).join('')}
    </svg>`;

  container.querySelectorAll('.door').forEach((door) => {
    door.addEventListener('click', () => onOpenSubject(door.dataset.subject));
  });
}

// Мини-карта предмета: список подтем с остатком добычи в каждой жиле.
export async function renderSubject(container, subject) {
  const content = subject.ready ? await loadContent(subject.id) : null;

  const rows = subject.topics.map((t) => {
    const solved = solvedInTopic(subject.id, t.id);
    if (!subject.ready) {
      return `
        <div class="topic-card locked" style="border-left-color: ${subject.color}">
          <span>${t.title}</span>
          <span class="count">скоро</span>
        </div>`;
    }
    // книги открываются в читалку, обычные темы — сразу в задания
    const href = subject.books ? `#book/${t.id}` : `#task/${subject.id}/${t.id}`;
    const topicContent = content?.topics.find((ct) => ct.id === t.id);
    return `
      <a class="topic-card" href="${href}" style="border-left-color: ${subject.color}">
        <span>${subject.books ? '📖 ' : ''}${t.title}${remainingLabel(subject, topicContent)}</span>
        <span class="count">${solved} / ${t.tasks}</span>
      </a>`;
  }).join('');

  // из библиотеки чтения — проход к настоящим книгам
  const shelfLink = subject.id === 'reading'
    ? `<a class="topic-card" href="#subject/books" style="border-left-color: var(--mustard)">
         <span>📖 Книжная полка: настоящие рассказы</span>
         <span class="count">→</span>
       </a>`
    : '';

  container.innerHTML = `
    <a href="#map" class="back-link">← На карту</a>
    <h2>${subject.place}</h2>
    <div class="topic-list">${rows}${shelfLink}</div>`;
}
