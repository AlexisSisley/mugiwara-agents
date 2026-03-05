// ============================================================
// _egg-konami.ts — Konami Code Easter Egg (Niveau 2)
// Sequence: Up Up Down Down Left Right Left Right B A
// Triggers a "Wanted Poster" overlay with Straw Hat theme.
// Lazy-loaded from main.ts. Zero impact on standard UX.
// Removal: delete this file + remove the import in main.ts.
// ============================================================

const KONAMI_SEQUENCE: readonly string[] = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

let sequenceIndex = 0;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let isActive = false;

// ── Wanted Poster Data ───────────────────────────────────────
const WANTED_POSTERS = [
  { name: 'Monkey D. Luffy', bounty: '3,000,000,000', epithet: 'Straw Hat' },
  { name: 'Roronoa Zoro', bounty: '1,111,000,000', epithet: 'Pirate Hunter' },
  { name: 'Vinsmoke Sanji', bounty: '1,032,000,000', epithet: 'Black Leg' },
  { name: 'Nico Robin', bounty: '930,000,000', epithet: 'Devil Child' },
  { name: 'Jinbe', bounty: '1,100,000,000', epithet: 'Knight of the Sea' },
  { name: 'Usopp', bounty: '500,000,000', epithet: 'God' },
  { name: 'Nami', bounty: '366,000,000', epithet: 'Cat Burglar' },
  { name: 'Franky', bounty: '394,000,000', epithet: 'Cyborg' },
  { name: 'Brook', bounty: '383,000,000', epithet: 'Soul King' },
  { name: 'Tony Tony Chopper', bounty: '1,000', epithet: 'Cotton Candy Lover' },
];

function getRandomPoster() {
  return WANTED_POSTERS[Math.floor(Math.random() * WANTED_POSTERS.length)]!;
}

// ── Overlay Creation ─────────────────────────────────────────
function createWantedOverlay(): HTMLDivElement {
  const poster = getRandomPoster();
  const overlay = document.createElement('div');
  overlay.id = 'egg-wanted-overlay';

  // Skull ASCII for the "photo"
  const skullArt = `
     .     .
     |\\___/|
    /  o o  \\
   ( ==  ^  == )
    )         (
   (           )
  ( (  )   (  ) )
 (__(__)___(__)__)
  `;

  overlay.innerHTML = `
    <div class="egg-wanted-backdrop">
      <div class="egg-wanted-poster">
        <div class="egg-wanted-header">WANTED</div>
        <div class="egg-wanted-subheader">DEAD OR ALIVE</div>
        <div class="egg-wanted-photo">
          <pre class="egg-wanted-skull">${skullArt}</pre>
        </div>
        <div class="egg-wanted-name">"${poster.epithet}"</div>
        <div class="egg-wanted-fullname">${poster.name}</div>
        <div class="egg-wanted-bounty-label">BOUNTY</div>
        <div class="egg-wanted-bounty">${poster.bounty}</div>
        <div class="egg-wanted-berry">BERRY</div>
        <div class="egg-wanted-footer">
          <span>MARINE</span>
          <span class="egg-wanted-wg">WORLD GOVERNMENT</span>
        </div>
        <button class="egg-wanted-close" title="Fermer">&times;</button>
      </div>
    </div>
  `;

  // Inject scoped styles
  const style = document.createElement('style');
  style.id = 'egg-wanted-styles';
  style.textContent = `
    .egg-wanted-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      animation: egg-fade-in 300ms ease;
      cursor: pointer;
    }

    .egg-wanted-poster {
      position: relative;
      width: 360px;
      background: #F5E6C8;
      border: 4px solid #8B6914;
      border-radius: 4px;
      padding: 24px 28px;
      text-align: center;
      box-shadow:
        0 0 0 2px #5C4A1E,
        0 20px 60px rgba(0, 0, 0, 0.8),
        inset 0 0 40px rgba(139, 105, 20, 0.15);
      animation: egg-poster-drop 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: default;
      font-family: 'Georgia', 'Times New Roman', serif;
    }

    /* Aged paper texture effect */
    .egg-wanted-poster::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 20% 80%, rgba(139, 105, 20, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(139, 105, 20, 0.08) 0%, transparent 50%);
      pointer-events: none;
    }

    .egg-wanted-header {
      font-size: 42px;
      font-weight: 900;
      color: #1A0A00;
      letter-spacing: 8px;
      text-transform: uppercase;
      line-height: 1;
      margin-bottom: 2px;
      text-shadow: 1px 1px 0 rgba(139, 105, 20, 0.3);
    }

    .egg-wanted-subheader {
      font-size: 11px;
      color: #5C4A1E;
      letter-spacing: 4px;
      margin-bottom: 16px;
      font-weight: 700;
    }

    .egg-wanted-photo {
      background: #E8D5B0;
      border: 2px solid #8B6914;
      border-radius: 2px;
      margin: 0 auto 12px;
      width: 200px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .egg-wanted-skull {
      font-family: monospace;
      font-size: 11px;
      line-height: 1.15;
      color: #3A2A10;
      white-space: pre;
      margin: 0;
    }

    .egg-wanted-name {
      font-size: 16px;
      color: #5C4A1E;
      font-style: italic;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .egg-wanted-fullname {
      font-size: 22px;
      font-weight: 900;
      color: #1A0A00;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .egg-wanted-bounty-label {
      font-size: 10px;
      color: #5C4A1E;
      letter-spacing: 3px;
      font-weight: 700;
    }

    .egg-wanted-bounty {
      font-size: 32px;
      font-weight: 900;
      color: #1A0A00;
      letter-spacing: 2px;
      line-height: 1.2;
      text-shadow: 1px 1px 0 rgba(139, 105, 20, 0.2);
    }

    .egg-wanted-berry {
      font-size: 14px;
      color: #5C4A1E;
      letter-spacing: 6px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .egg-wanted-footer {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #8B6914;
      letter-spacing: 2px;
      font-weight: 700;
      text-transform: uppercase;
      border-top: 1px solid #C4A35A;
      padding-top: 10px;
    }

    .egg-wanted-close {
      position: absolute;
      top: 8px;
      right: 12px;
      background: none;
      border: none;
      font-size: 24px;
      color: #8B6914;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 150ms ease;
    }

    .egg-wanted-close:hover {
      color: #1A0A00;
    }

    @keyframes egg-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes egg-poster-drop {
      from {
        opacity: 0;
        transform: scale(0.3) rotate(-8deg) translateY(-100px);
      }
      to {
        opacity: 1;
        transform: scale(1) rotate(0deg) translateY(0);
      }
    }

    @keyframes egg-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes egg-poster-fly {
      from {
        opacity: 1;
        transform: scale(1) rotate(0deg);
      }
      to {
        opacity: 0;
        transform: scale(0.5) rotate(12deg) translateY(80px);
      }
    }
  `;

  document.head.appendChild(style);
  return overlay;
}

// ── Show / Hide ──────────────────────────────────────────────
function showWantedPoster(): void {
  // Remove any existing overlay first
  removeOverlay();

  const overlay = createWantedOverlay();
  document.body.appendChild(overlay);

  // Console celebration
  console.log(
    '%c SECRET UNLOCKED! %c Konami Code detected!',
    'background: #E8A317; color: #1A0A00; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    'color: #2DD4BF; font-weight: bold;'
  );
  console.log(
    '%c "Wealth, Fame, Power... the man who had everything."',
    'color: #E8A317; font-style: italic;'
  );

  // Close handlers
  const closeBtn = overlay.querySelector('.egg-wanted-close');
  const backdrop = overlay.querySelector('.egg-wanted-backdrop');

  const closeOverlay = () => {
    const posterEl = overlay.querySelector('.egg-wanted-poster') as HTMLElement;
    const backdropEl = overlay.querySelector('.egg-wanted-backdrop') as HTMLElement;
    if (posterEl) posterEl.style.animation = 'egg-poster-fly 300ms ease forwards';
    if (backdropEl) backdropEl.style.animation = 'egg-fade-out 300ms ease forwards';
    setTimeout(() => removeOverlay(), 300);
  };

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOverlay();
  });

  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closeOverlay();
  });

  // ESC key to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeOverlay();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function removeOverlay(): void {
  document.getElementById('egg-wanted-overlay')?.remove();
  document.getElementById('egg-wanted-styles')?.remove();
}

// ── Activation ───────────────────────────────────────────────
/**
 * Start listening for the Konami Code sequence.
 * When completed, displays a random Wanted Poster overlay.
 */
export function activate(): void {
  if (isActive) return;
  isActive = true;
  sequenceIndex = 0;

  keydownHandler = (e: KeyboardEvent) => {
    if (e.key === KONAMI_SEQUENCE[sequenceIndex]) {
      sequenceIndex++;
      if (sequenceIndex === KONAMI_SEQUENCE.length) {
        showWantedPoster();
        sequenceIndex = 0;
      }
    } else {
      sequenceIndex = 0;
    }
  };

  document.addEventListener('keydown', keydownHandler, { passive: true });
}

/**
 * Remove the Konami Code listener and clean up any overlay.
 */
export function destroy(): void {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  removeOverlay();
  isActive = false;
  sequenceIndex = 0;
}
