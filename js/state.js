// Прогресс ребёнка. Хранится в localStorage, схема версионирована —
// при добавлении облака позже старые сохранения мигрируются, а не теряются.
const KEY = 'quest-save-v1';

const DEFAULT_STATE = {
  schemaVersion: 1,
  xp: 0,
  level: 1,
  // resources — кошелёк (тратится на предметы), totalEarned — всё добытое за лето
  resources: { wood: 0, stone: 0, iron: 0, gold: 0 },
  totalEarned: 0,
  roomItems: [],
  equipment: [],
  // progress[subjectId][topicId] = массив id решённых заданий
  progress: {},
  dailyStars: 0,
  dailySolved: 0,
  dailyDate: '',
  // mistakes["subject/topic"] = сколько раз ошибался (для родительской панели)
  mistakes: {},
  parentPin: null,
  // пороги сундуков: ребёнок видел анимацию / родитель отметил приз выданным
  rewardsSeen: [],
  rewardsGiven: [],
  lastPlayed: null,
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const saved = JSON.parse(raw);
    // новые поля из DEFAULT_STATE подхватываются при обновлении схемы
    const merged = { ...structuredClone(DEFAULT_STATE), ...saved };
    // миграция старых сохранений: раньше добытое равнялось кошельку
    if (!('totalEarned' in saved)) {
      merged.totalEarned = Object.values(merged.resources).reduce((a, b) => a + b, 0);
    }
    return merged;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function save() {
  state.lastPlayed = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getState() {
  return state;
}

// XP до следующего уровня растёт линейно: 1→2 стоит 50, 2→3 стоит 100…
export function xpForLevel(level) {
  return level * 50;
}

export function addXp(amount) {
  state.xp += amount;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level += 1;
  }
  save();
}

export function addResource(type, amount = 1) {
  if (type in state.resources) {
    state.resources[type] += amount;
    state.totalEarned += amount;
  }
  save();
}

export function solvedCount(subjectId) {
  const topics = state.progress[subjectId] || {};
  return Object.values(topics).reduce((sum, ids) => sum + ids.length, 0);
}

export function exportSave() {
  return JSON.stringify(state, null, 2);
}

export function importSave(json) {
  const parsed = JSON.parse(json); // бросит исключение при мусоре — вызывающий покажет ошибку
  state = { ...structuredClone(DEFAULT_STATE), ...parsed };
  save();
}

// Просим Safari не выселять данные при нехватке места (без гарантий,
// поэтому в родительской панели будет ещё и резервная копия файлом).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
