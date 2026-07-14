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

// Звери-символы дверей вынесены: теперь награда — зверь-герой за весь предмет
// (см. подсказку под картой и выбор героя в «Лагере»).

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
    </svg>
    ${rewardHint(subjects)}`;

  container.querySelectorAll('.door').forEach((door) => {
    door.addEventListener('click', () => onOpenSubject(door.dataset.subject));
  });
}

// Подсказка под картой: за полностью пройденный предмет открывается зверь-герой,
// которым можно играть. Показываем прогресс по каждой двери.
const SUBJECT_ANIMAL = { russian: 'Сова 🦉', math: 'Белка 🐿️', reading: 'Лиса 🦊', world: 'Ёжик 🦔' };

function rewardHint(subjects) {
  const rows = subjects.filter((s) => SUBJECT_ANIMAL[s.id]).map((s) => {
    const done = s.topics.filter((t) => solvedInTopic(s.id, t.id) >= t.tasks).length;
    const total = s.topics.length;
    const got = done >= total;
    return `<li class="${got ? 'reward-got' : ''}">${SUBJECT_ANIMAL[s.id]} — ${got ? 'открыт! играй за него' : `пройди весь «${s.title}» (${done}/${total} тем)`}</li>`;
  }).join('');
  return `
    <div class="reward-hint">
      <p>🎁 Пройди <b>весь предмет</b> — получишь нового героя-животное, за которого можно играть (меняется в «Лагере»):</p>
      <ul>${rows}</ul>
    </div>`;
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
