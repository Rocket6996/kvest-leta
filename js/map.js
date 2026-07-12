// Хаб-карта: четыре «двери» предметов вокруг лагеря разведчика.
import { solvedCount } from './state.js';
import { solvedInTopic } from './engine.js';
import { scoutSvg } from './character.js';

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
    </svg>`;

  container.querySelectorAll('.door').forEach((door) => {
    door.addEventListener('click', () => onOpenSubject(door.dataset.subject));
  });
}

// Мини-карта предмета: пока список подтем; станет картой на неделе 3.
export function renderSubject(container, subject) {
  const rows = subject.topics.map((t) => {
    const solved = solvedInTopic(subject.id, t.id);
    if (!subject.ready) {
      return `
        <div class="topic-card locked" style="border-left-color: ${subject.color}">
          <span>${t.title}</span>
          <span class="count">скоро</span>
        </div>`;
    }
    return `
      <a class="topic-card" href="#task/${subject.id}/${t.id}" style="border-left-color: ${subject.color}">
        <span>${t.title}</span>
        <span class="count">${solved} / ${t.tasks}</span>
      </a>`;
  }).join('');

  container.innerHTML = `
    <a href="#map" class="back-link">← На карту</a>
    <h2>${subject.place}</h2>
    <div class="topic-list">${rows}</div>`;
}
