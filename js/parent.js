// Родительская панель: PIN, статистика по темам, резервная копия прогресса.
import { getState, save, exportSave, importSave } from './state.js';
import { solvedInTopic, mistakesInTopic, totalResources } from './engine.js';

let unlocked = false; // до конца сессии повторно PIN не спрашиваем

export function renderParent(container, subjects) {
  const s = getState();
  if (!s.parentPin) return renderSetPin(container, subjects);
  if (!unlocked) return renderGate(container, subjects);
  renderPanel(container, subjects);
}

function pinForm(title, note) {
  return `
    <a href="#profile" class="back-link">← Назад</a>
    <div class="finale">
      <h2>${title}</h2>
      <p>${note}</p>
      <div class="input-row pin-row">
        <input type="password" id="pin-input" inputmode="numeric" maxlength="4"
               autocomplete="off" aria-label="PIN из 4 цифр" placeholder="••••">
        <button class="block hit-btn" id="pin-btn">Войти</button>
      </div>
      <p class="task-feedback" id="pin-feedback" aria-live="polite"></p>
    </div>`;
}

function renderSetPin(container, subjects) {
  container.innerHTML = pinForm('Панель для родителей', 'Придумайте PIN из 4 цифр — он будет закрывать эту страницу от ребёнка.');
  container.querySelector('#pin-btn').textContent = 'Сохранить PIN';
  container.querySelector('#pin-btn').addEventListener('click', () => {
    const value = container.querySelector('#pin-input').value.trim();
    if (!/^\d{4}$/.test(value)) {
      container.querySelector('#pin-feedback').textContent = 'Нужно ровно 4 цифры.';
      return;
    }
    getState().parentPin = value;
    save();
    unlocked = true;
    renderPanel(container, subjects);
  });
}

function renderGate(container, subjects) {
  container.innerHTML = pinForm('Панель для родителей', 'Введите PIN.');
  const tryEnter = () => {
    if (container.querySelector('#pin-input').value.trim() === getState().parentPin) {
      unlocked = true;
      renderPanel(container, subjects);
    } else {
      container.querySelector('#pin-feedback').textContent = 'Неверный PIN.';
    }
  };
  container.querySelector('#pin-btn').addEventListener('click', tryEnter);
  container.querySelector('#pin-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryEnter(); });
}

let rewardsPromise = null;

async function renderPanel(container, subjects) {
  const s = getState();
  const rewards = await (rewardsPromise ??= fetch('content/rewards.json').then((r) => r.json()));
  const total = totalResources();

  const milestoneRows = rewards.milestones.map((m) => {
    const reached = total >= m.resources;
    const given = s.rewardsGiven.includes(m.resources);
    const status = given ? '✅ выдан'
      : reached ? `<button class="block give-btn" data-m="${m.resources}">выдать приз</button>`
      : `впереди (${total} / ${m.resources})`;
    return `
      <div class="equip-item ${reached ? '' : 'locked'}">
        <span class="inv-icon">${m.icon}</span>
        <span>${m.title} — ${m.resources} ресурсов</span>
        <span class="count">${status}</span>
      </div>`;
  }).join('');

  const rows = subjects.flatMap((subject) =>
    subject.topics.map((t) => {
      const solved = solvedInTopic(subject.id, t.id);
      const errors = mistakesInTopic(subject.id, t.id);
      const hard = errors >= 3 && errors > solved; // тема, где явно трудно
      return `
        <tr class="${hard ? 'hard' : ''}">
          <td>${subject.title}</td>
          <td>${t.title}</td>
          <td>${solved} / ${t.tasks}</td>
          <td>${errors}${hard ? ' ⚠️' : ''}</td>
        </tr>`;
    })).join('');

  container.innerHTML = `
    <a href="#profile" class="back-link">← Назад</a>
    <h2>Панель для родителей</h2>
    <p class="stub-note">Всего собрано ресурсов: ${totalResources()} · последняя игра: ${s.lastPlayed ? new Date(s.lastPlayed).toLocaleString('ru-RU') : '—'}</p>

    <table class="parent-table">
      <thead><tr><th>Предмет</th><th>Тема</th><th>Решено</th><th>Ошибки</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="stub-note">⚠️ — тема, где ошибок заметно больше, чем решённых заданий: стоит разобрать вместе.</p>

    <h3 class="parent-h3">Сундуки и призы</h3>
    <div class="equip-list parent-milestones">${milestoneRows}</div>
    <p class="stub-note">Правила: пороги не меняются, приз лучше вручить в течение 1–2 дней после сундука, авансом и деньгами не заменяется.</p>

    <h3 class="parent-h3">Резервная копия</h3>
    <div class="input-row">
      <button class="block hit-btn" id="backup-save">Скачать копию прогресса</button>
      <label class="block" for="backup-file">Восстановить из файла</label>
      <input type="file" id="backup-file" accept=".json" hidden>
    </div>
    <p class="task-feedback" id="backup-feedback" aria-live="polite"></p>

    <p class="disclaimer">Приз-механика использует только оригинальные материалы. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.</p>`;

  container.querySelectorAll('.give-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      getState().rewardsGiven.push(Number(btn.dataset.m));
      save();
      renderPanel(container, subjects);
    });
  });

  container.querySelector('#backup-save').addEventListener('click', () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kvest-leta-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  container.querySelector('#backup-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fb = container.querySelector('#backup-feedback');
    try {
      importSave(await file.text());
      fb.className = 'task-feedback ok';
      fb.textContent = 'Прогресс восстановлен.';
      renderPanel(container, subjects);
    } catch {
      fb.className = 'task-feedback warn';
      fb.textContent = 'Файл не похож на копию прогресса.';
    }
  });
}
