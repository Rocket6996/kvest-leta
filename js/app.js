// Точка входа: hash-роутер и инициализация экранов.
import { renderHud } from './character.js';
import { renderMap, renderSubject } from './map.js';
import { renderTaskScreen } from './task.js';
import { renderProfile } from './profile.js';
import { renderParent } from './parent.js';
import { renderRoom } from './room.js';
import { renderBook, booksSubject } from './book.js';
import { needHero, openHeroPicker } from './hero.js';
import { getState, save } from './state.js';
import { solvedInTopic } from './engine.js';

let subjects = [];

// звери-герои за полностью пройденные предметы
const SUBJECT_ANIMAL = { russian: 'owl', math: 'squirrel', reading: 'fox', world: 'hedgehog' };

// добор наград: если предмет уже пройден (в т.ч. до этого обновления) — открыть зверя
function backfillHeroes() {
  const st = getState();
  let changed = false;
  for (const s of subjects) {
    const animal = SUBJECT_ANIMAL[s.id];
    if (!animal || st.unlockedHeroes.includes(animal)) continue;
    if (s.topics.every((t) => solvedInTopic(s.id, t.id) >= t.tasks)) {
      st.unlockedHeroes.push(animal);
      changed = true;
    }
  }
  if (changed) save();
}

const screens = {
  map: document.getElementById('screen-map'),
  subject: document.getElementById('screen-subject'),
  task: document.getElementById('screen-task'),
  profile: document.getElementById('screen-profile'),
  room: document.getElementById('screen-room'),
  parent: document.getElementById('screen-parent'),
};

function show(name) {
  Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
}

async function findSubject(id) {
  if (id === 'books') return booksSubject();
  return subjects.find((s) => s.id === id);
}

async function route() {
  const hash = location.hash.slice(1) || 'map';
  const [screen, param, param2] = hash.split('/');

  renderHud();

  if (screen === 'book' && param) {
    renderBook(screens.task, param);
    show('task');
    return;
  }
  if (screen === 'task' && param && param2) {
    const subject = await findSubject(param);
    if (subject) {
      renderTaskScreen(screens.task, subject, param2);
      show('task');
      return;
    }
  }
  if (screen === 'subject' && param) {
    const subject = await findSubject(param);
    if (subject) {
      renderSubject(screens.subject, subject);
      show('subject');
      return;
    }
  }
  if (screen === 'profile') {
    renderProfile(screens.profile);
    show('profile');
    return;
  }
  if (screen === 'room') {
    renderRoom(screens.room);
    show('room');
    return;
  }
  if (screen === 'parent') {
    renderParent(screens.parent, subjects);
    show('parent');
    return;
  }
  renderMap(screens.map, subjects, (id) => { location.hash = `#subject/${id}`; });
  show('map');
}

async function init() {
  const res = await fetch('content/subjects.json');
  subjects = (await res.json()).subjects;
  backfillHeroes();
  window.addEventListener('hashchange', route);
  route();

  // при первом запуске — знакомство и выбор героя
  if (needHero()) openHeroPicker();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
