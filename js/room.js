// Комната разведчика: обстановка прирастает предметами из сундуков.
// Всё нарисовано кодом (SVG), в одном пиксельном стиле с персонажем.
import { totalResources } from './engine.js';
import { scoutSvg } from './character.js';

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
};

export async function renderRoom(container) {
  const rewards = await loadRewards();
  const total = totalResources();
  const unlocked = rewards.milestones.filter((m) => total >= m.resources).map((m) => m.item);

  const art = Object.keys(ITEM_ART)
    .filter((id) => unlocked.includes(id))
    .map((id) => ITEM_ART[id])
    .join('');

  const list = rewards.milestones.map((m) => {
    const open = total >= m.resources;
    return `
      <div class="equip-item ${open ? '' : 'locked'}">
        <span class="inv-icon">${open ? m.icon : '🔒'}</span>
        <span>${open || !m.real ? m.title : 'Сундук легенды'}</span>
        <span class="count">${open ? 'в комнате' : `${total} / ${m.resources}`}</span>
      </div>`;
  }).join('');

  container.innerHTML = `
    <h2>Комната разведчика</h2>
    <svg id="room-svg" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" aria-label="Комната с предметами из сундуков">
      <rect x="0" y="0" width="800" height="352" fill="#2a3038"/>
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
    <div class="equip-list room-items">${list}</div>`;
}
