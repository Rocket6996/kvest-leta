// «Лагерь разведчика»: персонаж, опыт, инвентарь, снаряжение и путь к сундуку.
import { getState, xpForLevel } from './state.js';
import { totalResources } from './engine.js';
import { scoutSvg } from './character.js';

const RESOURCE_META = [
  ['wood', '🪵', 'Дерево'],
  ['stone', '🪨', 'Камень'],
  ['iron', '⛓️', 'Железо'],
  ['gold', '⭐', 'Золото'],
];

let rewardsCache = null;

async function loadRewards() {
  if (!rewardsCache) {
    rewardsCache = await (await fetch('content/rewards.json')).json();
  }
  return rewardsCache;
}

export async function renderProfile(container) {
  const s = getState();
  const rewards = await loadRewards();
  const total = totalResources();
  const nextChest = rewards.milestones.find((m) => total < m.resources);

  const chestNote = nextChest?.real
    ? 'главный сюрприз лета'
    : `новый предмет для комнаты: ${nextChest?.title.toLowerCase()}`;
  const chestBlock = nextChest
    ? `
      <div class="camp-chest">
        <div class="camp-chest-head">${nextChest.icon} До сундука: ${total} / ${nextChest.resources}</div>
        <div class="xp-bar big"><div class="xp-fill" style="width:${Math.round((total / nextChest.resources) * 100)}%"></div></div>
        <p class="stub-note">Осталось собрать: ${nextChest.resources - total}. Внутри — ${chestNote}.</p>
      </div>`
    : `<div class="camp-chest"><div class="camp-chest-head">🏆 Все сундуки открыты — легенда экспедиции!</div></div>`;

  container.innerHTML = `
    <h2>Лагерь разведчика</h2>
    <div class="camp-grid">
      <div class="camp-card camp-hero">
        <div class="camp-avatar">${scoutSvg(160)}</div>
        <div class="camp-level">Уровень ${s.level}</div>
        <div class="xp-bar big"><div class="xp-fill" style="width:${Math.round((s.xp / xpForLevel(s.level)) * 100)}%"></div></div>
        <p class="stub-note">${s.xp} / ${xpForLevel(s.level)} опыта до уровня ${s.level + 1}</p>
      </div>

      <div class="camp-card">
        <h3>Инвентарь</h3>
        <div class="inv-grid">
          ${RESOURCE_META.map(([key, icon, title]) => `
            <div class="inv-cell">
              <span class="inv-icon">${icon}</span>
              <span class="inv-count">${s.resources[key]}</span>
              <span class="inv-name">${title}</span>
            </div>`).join('')}
        </div>
        ${chestBlock}
      </div>

      <div class="camp-card">
        <h3>Стенд снаряжения</h3>
        <div class="equip-list">
          ${rewards.equipment.map((eq) => {
            const open = s.level >= eq.level;
            return `
              <div class="equip-item ${open ? '' : 'locked'}">
                <span class="inv-icon">${open ? eq.icon : '🔒'}</span>
                <span>${eq.title}</span>
                <span class="count">${open ? 'добыто' : `уровень ${eq.level}`}</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <a href="#parent" class="parent-link">для родителей</a>`;
}
