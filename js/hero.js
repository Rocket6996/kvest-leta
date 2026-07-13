// Выбор внешности разведчика: мальчик/девочка + бесплатный цвет куртки.
// Показывается при первом запуске и по кнопке в «Лагере».
import { getState, save } from './state.js';
import { scoutSvg, OUTFITS, renderHud } from './character.js';

export function needHero() {
  return !getState().hero;
}

// приглушённые цвета в стиле приложения; «default» — родная бирюзовая
const COLOR_KEYS = ['default', 'rose', 'lavender', 'plum', 'violet', 'mustard', 'terra'];
const COLOR_NAME = {
  default: 'бирюза', rose: 'роза', lavender: 'лаванда', plum: 'слива',
  violet: 'фиолет', mustard: 'горчица', terra: 'терракот',
};

export function openHeroPicker(onDone) {
  const s = getState();
  if (!s.hero) s.hero = 'boy'; // чтобы превью было не пустым

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  document.body.appendChild(overlay);

  function render() {
    overlay.innerHTML = `
      <div class="hero-card">
        <h2>Выбери разведчика</h2>
        <div class="hero-preview">${scoutSvg(150)}</div>
        <div class="hero-row">
          <button class="block ${s.hero === 'boy' ? 'picked' : ''}" data-hero="boy">Мальчик</button>
          <button class="block ${s.hero === 'girl' ? 'picked' : ''}" data-hero="girl">Девочка</button>
        </div>
        <p class="hero-sub">Цвет куртки</p>
        <div class="hero-colors">
          ${COLOR_KEYS.map((c) => `
            <button class="hero-color ${(s.outfit || 'default') === c ? 'picked' : ''}"
                    data-color="${c}" title="${COLOR_NAME[c]}"
                    style="background:${OUTFITS[c]}"></button>`).join('')}
        </div>
        <button class="block hit-btn hero-done">Готово</button>
      </div>`;

    overlay.querySelectorAll('[data-hero]').forEach((b) =>
      b.addEventListener('click', () => { s.hero = b.dataset.hero; render(); }));
    overlay.querySelectorAll('[data-color]').forEach((b) =>
      b.addEventListener('click', () => {
        s.outfit = b.dataset.color === 'default' ? null : b.dataset.color;
        render();
      }));
    overlay.querySelector('.hero-done').addEventListener('click', () => {
      save();
      renderHud();
      overlay.remove();
      onDone?.();
    });
  }

  render();
}
