// Правила игры: проверка ответов, награды, «звёзды дня» и мягкий стоп.
// Этика: прогресс не отнимается, ошибки не штрафуются, порогов-сюрпризов нет.
import { getState, save, addXp, addResource } from './state.js';

export const SOLVED_PER_STAR = 3; // звезда за каждые 3 верных задания
export const STARS_PER_DAY = 3;   // после трёх звёзд разведчик ставит лагерь

export function isSolved(subjectId, topicId, taskId) {
  const s = getState();
  return (s.progress[subjectId]?.[topicId] || []).includes(taskId);
}

export function solvedInTopic(subjectId, topicId) {
  return (getState().progress[subjectId]?.[topicId] || []).length;
}

function markSolved(subjectId, topicId, taskId) {
  const s = getState();
  s.progress[subjectId] ??= {};
  s.progress[subjectId][topicId] ??= [];
  if (!s.progress[subjectId][topicId].includes(taskId)) {
    s.progress[subjectId][topicId].push(taskId);
  }
}

// Числа и слова сравниваем без регистра, пробелов и с ',' как '.'
export function normalize(value) {
  return String(value)
    .toLowerCase()
    .replaceAll(',', '.')
    .replace(/\s+/g, '')
    .replaceAll('ё', 'е');
}

export function checkAnswer(task, value) {
  const accepted = Array.isArray(task.answer) ? task.answer : [task.answer];
  const v = normalize(value);
  return accepted.some((a) => {
    const na = normalize(a);
    if (na === v) return true;
    // числовой ответ сравниваем по цифрам: «42 000 г» засчитывается как 42000
    if (/^\d+$/.test(na)) {
      const digits = v.replace(/\D/g, '');
      return digits.length > 0 && digits === na;
    }
    return false;
  });
}

// Дневной счётчик живёт по календарной дате устройства
function touchDay() {
  const s = getState();
  const today = new Date().toISOString().slice(0, 10);
  if (s.dailyDate !== today) {
    s.dailyDate = today;
    s.dailySolved = 0;
    s.dailyStars = 0;
  }
}

// Начислить награду за решённое задание.
// Возвращает { newStar, campTime } для реакции интерфейса.
export function award(subjectId, topicId, task) {
  // защита от повторного клика по уже разбитому блоку: награда один раз
  if (isSolved(subjectId, topicId, task.id)) {
    return { newStar: false, campTime: false };
  }
  touchDay();
  const s = getState();

  markSolved(subjectId, topicId, task.id);
  addResource(task.resource || 'wood');
  addXp(task.xp || 10);

  s.dailySolved += 1;
  const starsEarned = Math.min(STARS_PER_DAY, Math.floor(s.dailySolved / SOLVED_PER_STAR));
  const newStar = starsEarned > s.dailyStars;
  s.dailyStars = starsEarned;
  save();

  return { newStar, campTime: newStar && starsEarned === STARS_PER_DAY };
}

// кошелёк (тратится в комнате)
export function totalResources() {
  return Object.values(getState().resources).reduce((a, b) => a + b, 0);
}

// всё добытое за лето — по нему считается финальный приз, траты его не уменьшают
export function totalEarned() {
  return getState().totalEarned;
}

export function canAfford(cost) {
  const r = getState().resources;
  return Object.entries(cost).every(([type, amount]) => (r[type] || 0) >= amount);
}

// смастерить предмет: списать ресурсы и поставить в комнату
export function craft(itemId, cost) {
  const s = getState();
  if (!canAfford(cost) || s.roomItems.includes(itemId)) return false;
  for (const [type, amount] of Object.entries(cost)) s.resources[type] -= amount;
  s.roomItems.push(itemId);
  save();
  return true;
}

// Ошибка не штрафуется, но тихо считается — родитель увидит, где трудно
export function recordMistake(subjectId, topicId) {
  const s = getState();
  const key = `${subjectId}/${topicId}`;
  s.mistakes[key] = (s.mistakes[key] || 0) + 1;
  save();
}

export function mistakesInTopic(subjectId, topicId) {
  return getState().mistakes[`${subjectId}/${topicId}`] || 0;
}
