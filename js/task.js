// Экран заданий: очередь «блоков» подтемы, разбивание с мгновенным фидбеком.
// Тон реплик — напарник по экспедиции, не учитель.
import { isSolved, checkAnswer, award, recordMistake, totalEarned, solvedInTopic } from './engine.js';
import { getState, save } from './state.js';
import { renderHud } from './character.js';
import { initScratchpad } from './draw.js';

const PRAISE = ['Есть! Блок наш.', 'Отличный удар!', 'Чисто сработано.', 'Так держать, напарник!'];
const RESOURCE_ICON = { wood: '🪵', stone: '🪨', iron: '⛓️', gold: '⭐' };

const contentCache = {};

async function loadTasks(subjectId) {
  if (!contentCache[subjectId]) {
    const res = await fetch(`content/${subjectId}.json`);
    if (!res.ok) return null;
    contentCache[subjectId] = await res.json();
  }
  return contentCache[subjectId];
}

export async function renderTaskScreen(container, subject, topicId) {
  const content = await loadTasks(subject.id);
  const topic = content?.topics.find((t) => t.id === topicId);
  const topicMeta = subject.topics.find((t) => t.id === topicId);

  if (!topic) {
    container.innerHTML = `
      <a href="#subject/${subject.id}" class="back-link">← Назад</a>
      <h2>${topicMeta?.title || ''}</h2>
      <p class="stub-note">Эти блоки ещё под завалом — скоро раскопаем!</p>`;
    return;
  }

  // нерешённые задания; босс-блок всегда в конце очереди
  const queue = topic.tasks.filter((t) => !isSolved(subject.id, topicId, t.id));
  const session = {
    container, subject, topicId, topic,
    queue, total: topic.tasks.length,
    attempts: 0, // ошибок на текущем задании
    answered: false, // текущее задание уже засчитано
  };
  nextTask(session);
}

function nextTask(session) {
  if (session.queue.length === 0) {
    renderTopicDone(session);
    return;
  }
  session.attempts = 0;
  session.answered = false;
  renderTask(session, session.queue[0]);
}

function progressLine(session) {
  const done = session.total - session.queue.length;
  return `
    <div class="mine-progress" aria-label="Разбито ${done} из ${session.total}">
      ${Array.from({ length: session.total }, (_, i) =>
        `<span class="mine-cell ${i < done ? 'done' : ''}"></span>`).join('')}
    </div>`;
}

function renderTask(session, task) {
  const { container, subject } = session;
  const isBoss = task.boss === true;

  container.innerHTML = `
    <a href="#subject/${subject.id}" class="back-link">← ${subject.place}</a>
    ${progressLine(session)}
    <div class="task-panel ${isBoss ? 'boss' : ''}">
      <div class="task-head">
        ${isBoss ? '<div class="boss-tag">Босс-блок</div>' : '<span></span>'}
        <span class="task-reward" title="Награда за этот блок">${RESOURCE_ICON[task.resource || 'wood']} +1 · ✨ +${task.xp || 10}</span>
      </div>
      <p class="task-prompt">${task.prompt}</p>
      <div class="task-blocks" id="task-blocks"></div>
      <button class="hint-btn" id="hint-btn" type="button">💡 Подсказка</button>
      <p class="task-hint" id="task-hint" hidden></p>
      <p class="task-feedback" id="task-feedback" aria-live="polite"></p>
      <p class="task-explain" id="task-explain" hidden></p>
      <button class="task-next" id="task-next" hidden>Дальше →</button>
    </div>`;

  const blocksEl = container.querySelector('#task-blocks');
  const renderers = { choice: renderChoice, input: renderInput, order: renderOrder, match: renderMatch };
  (renderers[task.type] || renderChoice)(session, task, blocksEl);

  container.querySelector('#hint-btn').addEventListener('click', () => openHint(session, task));

  // черновик для решения пером — прежде всего для математики
  if (session.subject.id === 'math' || task.type === 'input') {
    initScratchpad(container.querySelector('.task-panel'));
  }
}

/* ---------- типы заданий ---------- */

function renderChoice(session, task, el) {
  el.innerHTML = task.blocks
    .map((b, i) => `<button class="block" data-i="${i}">${b}</button>`)
    .join('');
  el.querySelectorAll('.block').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = task.blocks[Number(btn.dataset.i)];
      if (checkAnswer(task, value)) {
        btn.classList.add('broken');
        onCorrect(session, task);
      } else {
        btn.classList.add('cracked');
        btn.disabled = true;
        onWrong(session, task);
      }
    });
  });
}

function renderInput(session, task, el) {
  el.innerHTML = `
    <div class="input-row">
      <input type="text" id="answer-input" autocomplete="off" autocapitalize="off"
             aria-label="Твой ответ" placeholder="Пиши здесь — можно пером">
      <button class="block hit-btn" id="hit-btn">⛏ Разбить</button>
    </div>`;
  const input = el.querySelector('#answer-input');
  const submit = () => {
    if (!input.value.trim()) return;
    if (checkAnswer(task, input.value)) {
      input.classList.add('ok');
      input.disabled = true;
      onCorrect(session, task);
    } else {
      input.classList.add('bad');
      setTimeout(() => input.classList.remove('bad'), 500);
      onWrong(session, task);
    }
  };
  el.querySelector('#hit-btn').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  input.focus();
}

function renderOrder(session, task, el) {
  let step = 0;
  el.innerHTML = `<p class="order-hint">Тапай блоки по порядку</p>` + task.blocks
    .map((b) => `<button class="block" data-v="${b}">${b}</button>`)
    .join('');
  el.querySelectorAll('.block').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.v === String(task.answer[step])) {
        step += 1;
        btn.classList.add('picked');
        btn.disabled = true;
        btn.insertAdjacentHTML('beforeend', `<span class="pick-num">${step}</span>`);
        if (step === task.answer.length) onCorrect(session, task);
      } else {
        step = 0;
        el.querySelectorAll('.block').forEach((b) => {
          b.classList.remove('picked');
          b.disabled = false;
          b.querySelector('.pick-num')?.remove();
        });
        btn.classList.add('cracked');
        setTimeout(() => btn.classList.remove('cracked'), 500);
        onWrong(session, task);
      }
    });
  });
}

function renderMatch(session, task, el) {
  // пары: левый столбец по порядку, правый перемешан детерминированно (reverse)
  const left = task.pairs.map((p) => p[0]);
  const right = task.pairs.map((p) => p[1]).reverse();
  let selectedLeft = null;
  let matched = 0;

  el.innerHTML = `
    <div class="match-cols">
      <div class="match-col">${left.map((v) => `<button class="block" data-side="l" data-v="${v}">${v}</button>`).join('')}</div>
      <div class="match-col">${right.map((v) => `<button class="block" data-side="r" data-v="${v}">${v}</button>`).join('')}</div>
    </div>`;

  el.querySelectorAll('.block').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.side === 'l') {
        el.querySelectorAll('[data-side="l"]').forEach((b) => b.classList.remove('picked'));
        btn.classList.add('picked');
        selectedLeft = btn;
        return;
      }
      if (!selectedLeft) return;
      const pair = task.pairs.find((p) => p[0] === selectedLeft.dataset.v);
      if (pair && pair[1] === btn.dataset.v) {
        [selectedLeft, btn].forEach((b) => { b.classList.add('broken'); b.disabled = true; });
        selectedLeft = null;
        matched += 1;
        if (matched === task.pairs.length) onCorrect(session, task);
      } else {
        btn.classList.add('cracked');
        setTimeout(() => btn.classList.remove('cracked'), 500);
        onWrong(session, task);
      }
    });
  });
}

// Подсказка доступна всегда и бесплатно: способ решения + пример похожей
// задачи, но не сам ответ. Просить помощь — нормально.
function openHint(session, task) {
  const el = session.container.querySelector('#task-hint');
  const parts = [];
  if (task.hint) parts.push(task.hint);
  if (session.topic.example) parts.push(session.topic.example);
  el.textContent = parts.join(' ');
  el.hidden = parts.length === 0;
  const btn = session.container.querySelector('#hint-btn');
  btn.disabled = true;
  btn.textContent = '💡';
}

/* ---------- исход попытки ---------- */

async function onCorrect(session, task) {
  // задание засчитывается один раз: повторные тапы по разбитому блоку не дают ресурсов
  if (session.answered) return;
  session.answered = true;
  session.container.querySelectorAll('#task-blocks button, #task-blocks input')
    .forEach((el) => { el.disabled = true; });

  const { newStar, campTime } = award(session.subject.id, session.topicId, task);
  renderHud();
  session.queue.shift();

  const icon = RESOURCE_ICON[task.resource || 'wood'];
  const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  feedback(session, 'ok', `${praise} ${icon} +1 · ✨ +${task.xp || 10} XP${newStar ? ' · ⭐ Звезда дня!' : ''}`);

  // разбор показываем и после верного ответа — закрепляет «почему»
  if (task.explain) {
    const ex = session.container.querySelector('#task-explain');
    ex.textContent = task.explain;
    ex.hidden = false;
  }

  showNext(session, campTime, await unseenChest());
}

// достигнут ли порог сундука, который ребёнок ещё не видел
// (порог считается по всему добытому — траты в комнате его не отдаляют)
async function unseenChest() {
  const rewards = await (rewardsPromise ??= fetch('content/rewards.json').then((r) => r.json()));
  const earned = totalEarned();
  return rewards.milestones.find((m) => earned >= m.resources && !getState().rewardsSeen.includes(m.resources)) || null;
}
let rewardsPromise = null;

// Ошибка не раскрывает ответ и не пропускает блок. Помощь нарастает:
// 1) способ (подсказка) → 2) разобранный пример → 3+) точечная опора,
// но сам ответ ребёнок находит и вводит сам.
function onWrong(session, task) {
  session.attempts += 1;
  recordMistake(session.subject.id, session.topicId);
  const n = session.attempts;

  if (n === 1) {
    setHint(session, task.hint || 'Подумай ещё раз — ты близко.');
    feedback(session, 'warn', 'Не тот блок. Вот подсказка — попробуй снова.');
    return;
  }
  if (n === 2 && session.topic.example) {
    setHint(session, session.topic.example);
    feedback(session, 'warn', 'Ещё попытка! Разберём похожий пример.');
    return;
  }
  // 3-я и далее: даём опору, но не ответ; блок остаётся, пока не решён
  scaffold(session, task);
}

function setHint(session, text) {
  const el = session.container.querySelector('#task-hint');
  el.textContent = text;
  el.hidden = !text;
}

// Точечная помощь по типу задания — так, чтобы ответ всё равно найти самому.
function scaffold(session, task) {
  if (task.type === 'input') {
    const ans = Array.isArray(task.answer) ? String(task.answer[0]) : String(task.answer);
    const reveal = Math.min(ans.length - 1, session.attempts - 2); // последняя буква скрыта всегда
    if (reveal >= 1) {
      feedback(session, 'warn', `Не сдавайся! Начало ответа: «${ans.slice(0, reveal)}…» — допиши сам.`);
    } else {
      feedback(session, 'warn', 'Ещё разок — перечитай подсказку и пример над полем.');
    }
    return;
  }
  if (task.type === 'choice') {
    // убираем один ещё активный неверный вариант — выбор сужается, но не решается за ребёнка
    const wrong = [...session.container.querySelectorAll('#task-blocks .block')]
      .find((b) => !b.disabled && !checkAnswer(task, task.blocks[Number(b.dataset.i)]));
    if (wrong) { wrong.disabled = true; wrong.classList.add('cracked'); }
    feedback(session, 'warn', 'Убираю один неверный блок — так легче найти правильный.');
    return;
  }
  // order/match сбрасываются сами и всегда решаются перебором
  feedback(session, 'warn', 'Почти! Попробуй ещё раз, ориентируясь на подсказку.');
}

function feedback(session, kind, text) {
  const el = session.container.querySelector('#task-feedback');
  el.className = `task-feedback ${kind}`;
  el.textContent = text;
}

function showNext(session, campTime, chest = null) {
  const btn = session.container.querySelector('#task-next');
  btn.hidden = false;
  btn.addEventListener('click', () => {
    if (chest) renderChest(session, chest, campTime);
    else if (campTime) renderCamp(session);
    else nextTask(session);
  }, { once: true });
}

/* ---------- финалы ---------- */

const SUBJECT_ANIMAL = { russian: 'owl', math: 'squirrel', reading: 'fox', world: 'hedgehog' };
const ANIMAL_LABEL = { owl: '🦉 Сова', squirrel: '🐿️ Белка', fox: '🦊 Лиса', hedgehog: '🦔 Ёжик' };

function renderTopicDone(session) {
  // проверяем, пройден ли весь предмет — тогда открывается зверь-герой
  const subj = session.subject;
  const wholeSubjectDone = subj.topics.every((t) => isSolvedTopic(subj.id, t.id, t.tasks));
  const animal = SUBJECT_ANIMAL[subj.id];
  let heroNote = '';
  if (wholeSubjectDone && animal) {
    const st = getState();
    if (!st.unlockedHeroes.includes(animal)) {
      st.unlockedHeroes.push(animal);
      save();
    }
    heroNote = `<p>🎁 Ты прошёл весь «${subj.title}»! Открыт новый герой — <b>${ANIMAL_LABEL[animal]}</b>. Выбери его в «Лагере» → «Сменить внешность».</p>`;
  }
  session.container.innerHTML = `
    <div class="finale">
      <div class="finale-icon">⛏️</div>
      <h2>Жила выработана!</h2>
      <p>«${session.topic.title}» — все ${session.total} блоков разбиты. Отличная смена, напарник.</p>
      ${heroNote}
      <a href="#subject/${session.subject.id}" class="block hit-btn">К карте ${session.subject.place}</a>
    </div>`;
}

function isSolvedTopic(subjectId, topicId, tasks) {
  return solvedInTopic(subjectId, topicId) >= tasks;
}

// Сундук достигнут. Обычный сундук дарит предмет для комнаты сразу;
// финальный «Сундук легенды» — реальный сюрприз, его выдаёт родитель.
function renderChest(session, milestone, campTime) {
  getState().rewardsSeen.push(milestone.resources);
  save();
  const note = milestone.real
    ? `Ты собрал ${milestone.resources} ресурсов — вся карта покорилась! Внутри: ${milestone.prize.toLowerCase()}. Позови родителей!`
    : `Ты собрал ${milestone.resources} ресурсов. Новый предмет — «${milestone.title}» — уже появился в твоей комнате!`;
  session.container.innerHTML = `
    <div class="finale">
      <div class="finale-icon chest-shake">${milestone.icon}</div>
      <h2>${milestone.real ? 'Сундук легенды открыт!' : `${milestone.title} — твой!`}</h2>
      <p>${note}</p>
      <a href="#room" class="block hit-btn">Посмотреть комнату</a>
      <button class="task-next" id="chest-continue">Дальше →</button>
    </div>`;
  session.container.querySelector('#chest-continue').addEventListener('click', () => {
    if (campTime) renderCamp(session);
    else nextTask(session);
  }, { once: true });
}

// Мягкий стоп: три звезды собраны — разведчик ставит лагерь. Без замков и таймеров.
function renderCamp(session) {
  session.container.innerHTML = `
    <div class="finale">
      <div class="finale-icon">🏕️</div>
      <h2>Три звезды — ставим лагерь</h2>
      <p>Разведчик разжёг костёр: на сегодня улов отличный. Продолжим экспедицию завтра!</p>
      <a href="#map" class="block hit-btn">На карту</a>
      <a href="#subject/${session.subject.id}" class="camp-more">ещё один блок</a>
    </div>`;
}
