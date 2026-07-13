// Комната разведчика: предметы мастерятся за собранные ресурсы — сам выбираешь,
// что построить первым. Цены фиксированы и видны заранее; траты не влияют на
// финальный приз (он считается по всему добытому). SVG в стиле персонажа.
import { totalEarned, canAfford, craft } from './engine.js';
import { getState, save } from './state.js';
import { renderHud, scoutSvg } from './character.js';

const RESOURCE_ICON = { wood: '🪵', stone: '🪨', iron: '⛓️', gold: '⭐' };

// одежда «ездит» вместе со своим питомцем, клетка-улучшение — с клеткой:
// перетаскиваются одной группой, а не по частям
const UNIT = { cat_scarf: 'cat', cat_shirt: 'cat', dog_bandana: 'dog', dog_shirt: 'dog', cage2: 'cage' };
const unitOf = (id) => UNIT[id] || id;

let editing = false; // режим расстановки (по кнопке, не сохраняется)

function costLabel(cost) {
  return Object.entries(cost).map(([t, n]) => `${n} ${RESOURCE_ICON[t]}`).join(' + ');
}

let rewardsCache = null;
async function loadRewards() {
  if (!rewardsCache) rewardsCache = await (await fetch('content/rewards.json')).json();
  return rewardsCache;
}

// SVG каждого предмета; порядок в списке = порядок отрисовки (что ниже — то поверх)
const ITEM_ART = {
  rug: `
    <g><rect x="300" y="368" width="220" height="64" rx="6" fill="var(--teal)" opacity="0.55"/>
    <rect x="316" y="380" width="188" height="40" rx="4" fill="none" stroke="var(--mustard)" stroke-width="3" stroke-dasharray="10 8"/></g>`,
  bed: `
    <g><rect x="42" y="330" width="190" height="56" fill="#4a3826"/>
    <rect x="42" y="316" width="190" height="26" rx="4" fill="var(--teal)"/>
    <rect x="48" y="306" width="48" height="20" rx="4" fill="#e9e6df"/>
    <rect x="36" y="300" width="10" height="88" fill="#3a2c1e"/><rect x="228" y="300" width="10" height="88" fill="#3a2c1e"/></g>`,
  bench: `
    <g><rect x="268" y="322" width="160" height="14" fill="#4a3826"/>
    <rect x="276" y="336" width="12" height="46" fill="#3a2c1e"/><rect x="408" y="336" width="12" height="46" fill="#3a2c1e"/>
    <rect x="290" y="306" width="30" height="8" fill="var(--mustard)"/><rect x="300" y="296" width="8" height="18" fill="#8a8577"/>
    <rect x="350" y="304" width="22" height="10" fill="var(--err)"/></g>`,
  chest: `
    <g><rect x="660" y="330" width="92" height="56" fill="#6b4a2b"/>
    <rect x="660" y="322" width="92" height="18" rx="4" fill="#7d5834"/>
    <rect x="698" y="336" width="14" height="16" fill="var(--mustard)"/></g>`,
  lantern: `
    <g><circle cx="240" cy="140" r="46" fill="var(--mustard)" opacity="0.16"/>
    <rect x="232" y="104" width="16" height="10" fill="#3d4653"/>
    <rect x="226" y="114" width="28" height="38" rx="4" fill="#3d4653"/>
    <rect x="232" y="120" width="16" height="24" fill="var(--mustard)"/></g>`,
  shelf: `
    <g><rect x="540" y="110" width="170" height="10" fill="#4a3826"/><rect x="540" y="170" width="170" height="10" fill="#4a3826"/>
    <rect x="552" y="130" width="14" height="40" fill="var(--violet)"/><rect x="570" y="136" width="14" height="34" fill="var(--teal)"/>
    <rect x="588" y="128" width="14" height="42" fill="var(--mustard)"/><rect x="606" y="140" width="14" height="30" fill="var(--err)"/>
    <rect x="628" y="134" width="14" height="36" fill="var(--moss)"/></g>`,
  telescope: `
    <g transform="translate(520, 250)">
    <rect x="26" y="30" width="8" height="70" fill="#3d4653" transform="rotate(18 30 65)"/>
    <rect x="26" y="30" width="8" height="70" fill="#3d4653" transform="rotate(-18 30 65)"/>
    <rect x="0" y="6" width="64" height="16" rx="6" fill="#3d4653" transform="rotate(-24 32 14)"/>
    <rect x="52" y="-12" width="12" height="14" rx="3" fill="var(--mustard)" transform="rotate(-24 58 -5)"/></g>`,
  banner: `
    <g><rect x="96" y="76" width="86" height="10" fill="#4a3826"/>
    <path d="M104 86 h70 v78 l-35 -18 l-35 18 z" fill="var(--violet)"/>
    <rect x="128" y="104" width="22" height="22" fill="var(--mustard)" transform="rotate(45 139 115)"/></g>`,
  cat: `
    <g><rect x="150" y="404" width="46" height="22" rx="8" fill="#8a8577"/>
    <rect x="188" y="392" width="22" height="20" rx="5" fill="#8a8577"/>
    <rect x="190" y="386" width="7" height="9" fill="#8a8577"/><rect x="202" y="386" width="7" height="9" fill="#8a8577"/>
    <rect x="194" y="398" width="4" height="4" fill="#23282f"/><rect x="203" y="398" width="4" height="4" fill="#23282f"/>
    <rect x="138" y="396" width="14" height="8" rx="4" fill="#8a8577"/></g>`,
  trophy: `
    <g><rect x="666" y="126" width="26" height="26" rx="6" fill="var(--mustard)"/>
    <rect x="672" y="152" width="14" height="8" fill="var(--mustard)"/><rect x="664" y="160" width="30" height="6" fill="#7d5834"/>
    <rect x="658" y="128" width="6" height="14" fill="var(--mustard)"/><rect x="694" y="128" width="6" height="14" fill="var(--mustard)"/></g>`,
  painting: `
    <g><rect x="600" y="212" width="92" height="70" fill="#4a3826"/>
    <rect x="606" y="218" width="80" height="58" fill="#171b20"/>
    <path d="M610 268 l20 -26 l14 16 l12 -20 l26 30 z" fill="var(--teal)"/>
    <circle cx="668" cy="230" r="6" fill="var(--mustard)"/></g>`,
  dog: `
    <g><rect x="392" y="396" width="54" height="24" rx="8" fill="#8a6a4a"/>
    <rect x="436" y="382" width="24" height="22" rx="5" fill="#8a6a4a"/>
    <rect x="438" y="374" width="8" height="12" rx="3" fill="#6e5238"/><rect x="452" y="374" width="8" height="12" rx="3" fill="#6e5238"/>
    <rect x="442" y="390" width="4" height="4" fill="#23282f"/><rect x="452" y="390" width="4" height="4" fill="#23282f"/>
    <rect x="446" y="398" width="8" height="5" fill="#23282f"/>
    <rect x="396" y="418" width="8" height="12" fill="#8a6a4a"/><rect x="432" y="418" width="8" height="12" fill="#8a6a4a"/>
    <rect x="380" y="390" width="14" height="8" rx="4" fill="#8a6a4a" transform="rotate(-30 387 394)"/></g>`,
  dog_bandana: `
    <g><rect x="434" y="400" width="26" height="7" fill="var(--err)"/>
    <path d="M442 407 l6 9 l6 -9 z" fill="var(--err)"/></g>`,
  cat_scarf: `
    <g><rect x="186" y="406" width="24" height="6" fill="var(--mustard)"/>
    <rect x="196" y="412" width="6" height="8" fill="var(--mustard)"/></g>`,
  cat_shirt: `
    <g><rect x="156" y="406" width="26" height="16" rx="4" fill="var(--violet)"/>
    <rect x="152" y="406" width="8" height="8" rx="2" fill="var(--violet)"/></g>`,
  dog_shirt: `
    <g><rect x="398" y="398" width="30" height="18" rx="4" fill="var(--teal)"/>
    <rect x="392" y="398" width="10" height="9" rx="2" fill="var(--teal)"/></g>`,
  cage: (birdColor = '#5aa05a') => `
    <g><rect x="497" y="78" width="4" height="14" fill="#3d4653"/>
    <rect x="478" y="92" width="42" height="52" rx="10" fill="none" stroke="#3d4653" stroke-width="3"/>
    ${[486, 494, 502, 510].map((x) => `<line x1="${x}" y1="94" x2="${x}" y2="142" stroke="#3d4653" stroke-width="2"/>`).join('')}
    <line x1="480" y1="132" x2="518" y2="132" stroke="#3d4653" stroke-width="2"/>
    <!-- попугай: тельце, крыло, хвост, лапки, глаз, клюв -->
    <rect x="486" y="120" width="5" height="4" fill="${birdColor}"/>
    <rect x="490" y="117" width="12" height="10" rx="4" fill="${birdColor}"/>
    <rect x="492" y="120" width="7" height="5" fill="#3f7a4a"/>
    <rect x="500" y="110" width="9" height="9" rx="3" fill="${birdColor}"/>
    <rect x="507" y="113" width="4" height="3" fill="var(--mustard)"/>
    <rect x="503" y="112" width="2" height="2" fill="#171b20"/>
    <rect x="494" y="127" width="1" height="5" fill="var(--mustard)"/>
    <rect x="498" y="127" width="1" height="5" fill="var(--mustard)"/></g>`,
  cage2: (birdColor = '#5aa05a') => `
    <g><rect x="495" y="70" width="6" height="14" fill="var(--mustard)"/>
    <rect x="472" y="84" width="54" height="66" rx="12" fill="none" stroke="var(--mustard)" stroke-width="3"/>
    ${[482, 491, 500, 509, 518].map((x) => `<line x1="${x}" y1="86" x2="${x}" y2="148" stroke="var(--mustard)" stroke-width="2"/>`).join('')}
    <line x1="474" y1="138" x2="524" y2="138" stroke="var(--mustard)" stroke-width="2"/>
    <circle cx="499" cy="94" r="3" fill="var(--mustard)"/>
    <rect x="484" y="121" width="6" height="5" fill="${birdColor}"/>
    <rect x="489" y="117" width="14" height="12" rx="5" fill="${birdColor}"/>
    <rect x="491" y="120" width="8" height="6" fill="#3f7a4a"/>
    <rect x="500" y="108" width="10" height="10" rx="3" fill="${birdColor}"/>
    <rect x="508" y="112" width="4" height="3" fill="var(--err)"/>
    <rect x="503" y="111" width="2" height="2" fill="#171b20"/>
    <rect x="494" y="129" width="1" height="6" fill="var(--mustard)"/>
    <rect x="499" y="129" width="1" height="6" fill="var(--mustard)"/></g>`,
};

// улучшения: старшая версия заменяет младшую на рисунке
const UPGRADES = { cage2: 'cage' };

export async function renderRoom(container) {
  const rewards = await loadRewards();
  const s = getState();
  const crafted = new Set(s.roomItems);
  // трофей не покупается — он появляется вместе с финальным сундуком
  const finale = rewards.milestones.find((m) => m.real);
  if (finale && totalEarned() >= finale.resources) crafted.add(finale.item);

  // заменённые улучшением младшие версии не рисуем
  const hidden = new Set(Object.entries(UPGRADES)
    .filter(([hi]) => crafted.has(hi))
    .map(([, lo]) => lo));

  // собираем предметы в группы-«юниты» (питомец с одеждой — одно целое),
  // каждый юнит сдвигается на свой сохранённый offset и перетаскивается целиком
  const pos = s.roomPos || {};
  // цвет питомца (пока только попугай; выбор цвета — в отдельной доработке)
  const petColor = s.petColors || {};
  const artOf = (id) => {
    const a = ITEM_ART[id];
    if (typeof a !== 'function') return a;
    if (id === 'cage' || id === 'cage2') return a(petColor.parrot);
    return a();
  };

  const units = {};
  for (const id of Object.keys(ITEM_ART)) {
    if (!crafted.has(id) || hidden.has(id)) continue;
    const u = unitOf(id);
    (units[u] ??= []).push(artOf(id));
  }
  const art = Object.entries(units).map(([u, parts]) => {
    const p = pos[u] || {};
    return `<g class="room-item" data-unit="${u}" transform="translate(${p.dx || 0}, ${p.dy || 0})">${parts.join('')}</g>`;
  }).join('');

  const itemRow = (item) => {
    if (crafted.has(item.id)) {
      return `
        <div class="equip-item">
          <span class="inv-icon">${item.icon}</span>
          <span>${item.title}</span>
          <span class="count">в комнате</span>
        </div>`;
    }
    // сначала нужен предмет-основа (кот для шарфа, клетка для улучшения)
    const missingBase = item.requires && !crafted.has(item.requires);
    const baseTitle = missingBase ? rewards.items.find((i) => i.id === item.requires)?.title : '';
    const affordable = !missingBase && canAfford(item.cost);
    return `
      <div class="equip-item ${affordable ? '' : 'locked'}">
        <span class="inv-icon">${item.icon}</span>
        <span>${item.title}<span class="craft-cost">${costLabel(item.cost)}</span></span>
        <button class="block craft-btn" data-item="${item.id}" ${affordable ? '' : 'disabled'}>
          ${missingBase ? `сначала: ${baseTitle}` : affordable ? '⚒ Смастерить' : 'не хватает'}
        </button>
      </div>`;
  };

  // магазин по понятным блокам, а не вразнобой
  const GROUPS = [
    ['furniture', '🛋️ Мебель'],
    ['decor', '🖼️ Декор'],
    ['pets', '🐾 Питомцы'],
    ['petwear', '🎀 Одежда питомцев'],
  ];
  const list = GROUPS.map(([g, title]) => {
    const rows = rewards.items.filter((it) => it.group === g).map(itemRow).join('');
    return rows ? `<h3 class="shop-group">${title}</h3>${rows}` : '';
  }).join('') + `
    <h3 class="shop-group">🏆 Финал</h3>
    <div class="equip-item ${crafted.has(finale.item) ? '' : 'locked'}">
      <span class="inv-icon">${crafted.has(finale.item) ? finale.icon : '🔒'}</span>
      <span>Золотой трофей<span class="craft-cost">награда Сундука легенды</span></span>
      <span class="count">${crafted.has(finale.item) ? 'в комнате' : `${totalEarned()} / ${finale.resources}`}</span>
    </div>`;

  // обои «Бирюзовый вечер»: стена темнее и с узором из ромбиков
  const hasWallpaper = crafted.has('wallpaper');
  const wallPattern = hasWallpaper
    ? Array.from({ length: 8 }, (_, r) => Array.from({ length: 14 }, (_, c) => {
        const x = 30 + c * 58 + (r % 2) * 29;
        const y = 24 + r * 42;
        return `<rect x="${x}" y="${y}" width="8" height="8" fill="var(--teal)" opacity="0.35" transform="rotate(45 ${x + 4} ${y + 4})"/>`;
      }).join('')).join('')
    : '';

  const hasItems = Object.keys(units).length > 0;
  container.innerHTML = `
    <div class="room-bar">
      <h2>Комната разведчика</h2>
      <div class="room-bar-btns">
        ${editing ? '<button class="block room-edit-btn" id="room-reset">↺ Сбросить</button>' : ''}
        ${hasItems ? `<button class="block room-edit-btn" id="room-edit">${editing ? '✓ Готово' : '✥ Расставить'}</button>` : ''}
      </div>
    </div>
    <svg id="room-svg" class="${editing ? 'editing' : ''}" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" aria-label="Комната с предметами из сундуков">
      <rect x="0" y="0" width="800" height="352" fill="${hasWallpaper ? '#243a3c' : '#2a3038'}"/>
      ${wallPattern}
      <rect x="0" y="352" width="800" height="128" fill="#1c2127"/>
      <rect x="0" y="346" width="800" height="8" fill="#171b20"/>
      <!-- окно с ночным небом — есть с самого начала -->
      <rect x="318" y="70" width="164" height="124" fill="#3d4653"/>
      <rect x="328" y="80" width="144" height="104" fill="#171b20"/>
      <circle cx="440" cy="106" r="14" fill="#e9e6df" opacity="0.85"/>
      <circle cx="360" cy="120" r="3" fill="#e9e6df"/><circle cx="390" cy="96" r="2" fill="#e9e6df"/>
      <circle cx="376" cy="150" r="2" fill="#e9e6df"/><circle cx="420" cy="142" r="2" fill="#e9e6df"/>
      ${art}
      <!-- разведчик всегда дома -->
      <foreignObject x="560" y="300" width="96" height="96">${scoutSvg(96)}</foreignObject>
    </svg>
    <p class="stub-note room-note">${editing
      ? 'Тащи предметы пальцем или пером, куда хочешь. Нажми «Готово», когда закончишь.'
      : 'Собирай ресурсы в шахтах и мастери обстановку — что построить первым, решаешь ты.'}</p>
    <div class="equip-list room-items" ${editing ? 'hidden' : ''}>${list}</div>`;

  if (editing) enableDrag(container);

  container.querySelector('#room-edit')?.addEventListener('click', () => {
    editing = !editing;
    renderRoom(container);
  });

  container.querySelector('#room-reset')?.addEventListener('click', () => {
    s.roomPos = {};
    save();
    renderRoom(container);
  });

  container.querySelectorAll('.craft-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = rewards.items.find((i) => i.id === btn.dataset.item);
      if (item && craft(item.id, item.cost)) {
        renderHud();
        renderRoom(container); // предмет сразу появляется в комнате
      }
    });
  });
}

// Перетаскивание предметов в режиме расстановки. Экранное смещение пальца
// переводим в координаты холста (viewBox 800×480) и клампим, чтобы предмет
// не уехал за пределы комнаты. Позиция каждого юнита хранится в state.roomPos.
function enableDrag(container) {
  const svg = container.querySelector('#room-svg');
  const s = getState();

  svg.querySelectorAll('.room-item').forEach((group) => {
    let drag = null;

    group.addEventListener('pointerdown', (e) => {
      const rect = svg.getBoundingClientRect();
      const scale = 800 / rect.width; // viewBox-единиц на экранный пиксель
      const cur = s.roomPos[group.dataset.unit] || { dx: 0, dy: 0 };
      drag = { x0: e.clientX, y0: e.clientY, ox: cur.dx || 0, oy: cur.dy || 0, scale };
      group.setPointerCapture(e.pointerId);
      group.classList.add('grabbing');
      e.preventDefault();
    });

    group.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = clamp(drag.ox + (e.clientX - drag.x0) * drag.scale, -420, 520);
      const dy = clamp(drag.oy + (e.clientY - drag.y0) * drag.scale, -220, 300);
      group.setAttribute('transform', `translate(${dx}, ${dy})`);
      drag.last = { dx, dy };
    });

    const end = () => {
      if (!drag) return;
      if (drag.last) { s.roomPos[group.dataset.unit] = drag.last; save(); }
      group.classList.remove('grabbing');
      drag = null;
    };
    group.addEventListener('pointerup', end);
    group.addEventListener('pointercancel', end);
  });
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
