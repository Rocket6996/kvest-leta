// Точка входа: hash-роутер и инициализация экранов.
import { renderHud } from './character.js';
import { renderMap, renderSubject } from './map.js';
import { renderTaskScreen } from './task.js';
import { renderProfile } from './profile.js';
import { renderParent } from './parent.js';

let subjects = [];

const screens = {
  map: document.getElementById('screen-map'),
  subject: document.getElementById('screen-subject'),
  task: document.getElementById('screen-task'),
  profile: document.getElementById('screen-profile'),
  parent: document.getElementById('screen-parent'),
};

function show(name) {
  Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
}

function route() {
  const hash = location.hash.slice(1) || 'map';
  const [screen, param, param2] = hash.split('/');

  renderHud();

  if (screen === 'task' && param && param2) {
    const subject = subjects.find((s) => s.id === param);
    if (subject) {
      renderTaskScreen(screens.task, subject, param2);
      show('task');
      return;
    }
  }
  if (screen === 'subject' && param) {
    const subject = subjects.find((s) => s.id === param);
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
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
