// ============================================================
// _egg-nakama-roll.ts — Nakama Roll Call Easter Egg (Niveau 2)
// Trigger: Triple-click on the version number in the sidebar
// Displays a scrolling crew roll-call with bounties.
// Lazy-loaded from main.ts. Zero impact on standard UX.
// Removal: delete this file + remove the import in main.ts.
// ============================================================

let isActive = false;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let clickCount = 0;
let clickTimer: ReturnType<typeof setTimeout> | null = null;

// ── Crew Data ─────────────────────────────────────────────────
const CREW = [
  { role: 'Captain',      name: 'Monkey D. Luffy',    bounty: '3,000,000,000' },
  { role: 'Swordsman',    name: 'Roronoa Zoro',       bounty: '1,111,000,000' },
  { role: 'Navigator',    name: 'Nami',               bounty: '366,000,000' },
  { role: 'Sniper',       name: 'Usopp',              bounty: '500,000,000' },
  { role: 'Cook',         name: 'Vinsmoke Sanji',     bounty: '1,032,000,000' },
  { role: 'Doctor',       name: 'Tony Tony Chopper',   bounty: '1,000' },
  { role: 'Archaeologist', name: 'Nico Robin',         bounty: '930,000,000' },
  { role: 'Shipwright',   name: 'Franky',             bounty: '394,000,000' },
  { role: 'Musician',     name: 'Brook',              bounty: '383,000,000' },
  { role: 'Helmsman',     name: 'Jinbe',              bounty: '1,100,000,000' },
];

// ── Overlay ───────────────────────────────────────────────────
function createRollOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.id = 'egg-nakama-overlay';

  const crewRows = CREW.map(
    (c, i) => `
    <div class="egg-nakama-row" style="animation-delay: ${i * 180}ms">
      <span class="egg-nakama-role">${c.role}</span>
      <span class="egg-nakama-name">${c.name}</span>
      <span class="egg-nakama-bounty">${c.bounty} B</span>
    </div>`
  ).join('');

  overlay.innerHTML = `
    <div class="egg-nakama-backdrop">
      <div class="egg-nakama-card">
        <div class="egg-nakama-title">STRAW HAT PIRATES</div>
        <div class="egg-nakama-subtitle">- CREW ROLL CALL -</div>
        <div class="egg-nakama-list">${crewRows}</div>
        <div class="egg-nakama-footer">
          "I don't want to conquer anything.<br/>
           I just think the guy with the most freedom<br/>
           in this whole ocean... is the Pirate King!"
        </div>
        <button class="egg-nakama-close" title="Close">&times;</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.id = 'egg-nakama-styles';
  style.textContent = `
    .egg-nakama-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.88);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      animation: egg-nakama-fadein 300ms ease;
      cursor: pointer;
    }

    .egg-nakama-card {
      position: relative;
      width: 420px;
      max-height: 80vh;
      overflow-y: auto;
      background: #0F1117;
      border: 2px solid #E63946;
      border-radius: 10px;
      padding: 28px 24px;
      text-align: center;
      box-shadow:
        0 0 40px rgba(230, 57, 70, 0.15),
        0 20px 60px rgba(0, 0, 0, 0.8);
      animation: egg-nakama-scalein 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: default;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    .egg-nakama-title {
      font-family: 'Bangers', 'Impact', cursive;
      font-size: 28px;
      color: #E63946;
      letter-spacing: 0.06em;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.5);
      margin-bottom: 2px;
    }

    .egg-nakama-subtitle {
      font-size: 11px;
      color: #5C6378;
      letter-spacing: 4px;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .egg-nakama-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .egg-nakama-row {
      display: grid;
      grid-template-columns: 100px 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #1C1E2B;
      border-radius: 6px;
      border: 1px solid #2A2D3A;
      opacity: 0;
      transform: translateX(-20px);
      animation: egg-nakama-slidein 350ms ease forwards;
    }

    .egg-nakama-role {
      font-size: 10px;
      color: #38BDF8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      text-align: left;
    }

    .egg-nakama-name {
      font-size: 14px;
      color: #E8ECF4;
      font-weight: 600;
      text-align: left;
    }

    .egg-nakama-bounty {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #FB923C;
      font-weight: 700;
      white-space: nowrap;
    }

    .egg-nakama-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #2A2D3A;
      font-size: 12px;
      font-style: italic;
      color: #5C6378;
      line-height: 1.5;
    }

    .egg-nakama-close {
      position: absolute;
      top: 10px;
      right: 14px;
      background: none;
      border: none;
      font-size: 22px;
      color: #5C6378;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 150ms ease;
    }

    .egg-nakama-close:hover {
      color: #E63946;
    }

    @keyframes egg-nakama-fadein {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes egg-nakama-scalein {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes egg-nakama-slidein {
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes egg-nakama-fadeout {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;

  document.head.appendChild(style);
  return overlay;
}

// ── Show / Hide ──────────────────────────────────────────────
function showRollCall(): void {
  removeOverlay();

  const overlay = createRollOverlay();
  document.body.appendChild(overlay);

  console.log(
    '%c NAKAMA ROLL CALL! %c You found the crew roster!',
    'background: #E63946; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    'color: #38BDF8; font-weight: bold;'
  );

  const closeBtn = overlay.querySelector('.egg-nakama-close');
  const backdrop = overlay.querySelector('.egg-nakama-backdrop');

  const closeOverlay = () => {
    const backdropEl = overlay.querySelector('.egg-nakama-backdrop') as HTMLElement;
    if (backdropEl) backdropEl.style.animation = 'egg-nakama-fadeout 250ms ease forwards';
    setTimeout(() => removeOverlay(), 250);
  };

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOverlay();
  });

  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closeOverlay();
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeOverlay();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function removeOverlay(): void {
  document.getElementById('egg-nakama-overlay')?.remove();
  document.getElementById('egg-nakama-styles')?.remove();
}

// ── Activation ───────────────────────────────────────────────
/**
 * Start listening for triple-click on the sidebar version number.
 * When triggered, displays the full Straw Hat crew roll call.
 */
export function activate(): void {
  if (isActive) return;
  isActive = true;

  clickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Match the version text in the sidebar footer
    if (!target.classList.contains('version') && !target.textContent?.match(/^v\d+\.\d+\.\d+$/)) {
      return;
    }

    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 1500);

    if (clickCount >= 3) {
      showRollCall();
      clickCount = 0;
    }
  };

  document.addEventListener('click', clickHandler, { passive: true });
}

/**
 * Remove the click listener and clean up any overlay.
 */
export function destroy(): void {
  if (clickHandler) {
    document.removeEventListener('click', clickHandler);
    clickHandler = null;
  }
  removeOverlay();
  isActive = false;
  clickCount = 0;
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
}
