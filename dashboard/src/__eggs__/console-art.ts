// ============================================================
// _egg-console-art.ts — Mugiwara Console Easter Egg
// Displays the Straw Hat Jolly Roger in the browser console.
// Only active in development mode. Zero production impact.
// Removal: delete this file + remove the import in main.ts.
// ============================================================

const JOLLY_ROGER = `
%c
    ⠀⠀⠀⠀⠀⠀⠀⢀⣀⣤⣤⣶⣶⣶⣶⣤⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀
    ⠀⠀⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⣄⠀⠀⠀⠀
    ⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀
    ⠀⣴⣿⣿⣿⣿⡿⠿⠿⢿⣿⣿⣿⣿⣿⣿⡿⠿⠿⢿⣿⣿⣿⣿⣦⠀
    ⣸⣿⣿⣿⡏⠀⣀⣤⣤⣀⠈⢿⣿⣿⡿⠁⣀⣤⣤⣀⠀⢹⣿⣿⣿⣇
    ⣿⣿⣿⣿⣧⣼⣿⣿⣿⣿⣧⣼⣿⣿⣧⣼⣿⣿⣿⣿⣧⣼⣿⣿⣿⣿
    ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
    ⢿⣿⣿⡟⠉⣿⣿⣿⣿⠉⠻⣿⣿⣿⠟⠉⣿⣿⣿⣿⠉⢻⣿⣿⡿
    ⠈⢿⣿⡇⠀⠈⠉⠉⠁⠀⣠⣿⣿⣿⣄⠀⠈⠉⠉⠁⠀⢸⣿⡿⠁
    ⠀⠈⢿⣿⣿⣶⣶⣶⣶⣿⣿⣿⠉⣿⣿⣿⣶⣶⣶⣶⣿⣿⡿⠁⠀
    ⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⠃⠀⠘⣿⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀
    ⠀⠀⠀⠀⠙⠻⠿⣿⣿⡿⠃⠀⠀⠀⠘⢿⣿⣿⠿⠟⠋⠀⠀⠀⠀
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

`;

const STYLE_ART = 'color: #E8A317; font-size: 10px; line-height: 1.1; font-family: monospace;';

const SECRET_MESSAGES: readonly string[] = [
  '%c  Wealth, Fame, Power... The man who had everything in this world,',
  '%c  the Pirate King, Gold Roger, left these words at his execution:',
  '%c  "My treasure? If you want it, you can have it! Search for it!',
  '%c   I left everything the world has to offer there."',
  '%c',
  '%c  -- The One Piece is Real. --',
  '%c',
  '%c  If you\'re reading this console, you\'ve gone too deep.',
  '%c  Turn back now... or join the Mugiwara crew.',
];

const STYLE_MSG = 'color: #8B92A5; font-size: 11px; font-style: italic;';
const STYLE_HIGHLIGHT = 'color: #E8A317; font-size: 12px; font-weight: bold;';

/**
 * Display the Jolly Roger and secret messages in the browser console.
 * Call destroy() to clean up (no-op since this is a one-shot display).
 */
export function activate(): void {
  console.log(JOLLY_ROGER, STYLE_ART);

  for (const line of SECRET_MESSAGES) {
    if (line.includes('One Piece is Real') || line.includes('Pirate King')) {
      console.log(line, STYLE_HIGHLIGHT);
    } else {
      console.log(line, STYLE_MSG);
    }
  }

  console.log(
    '%c[mugiwara-dashboard] %cSecret unlocked. Welcome aboard, nakama.',
    'color: #E8A317; font-weight: bold;',
    'color: #2DD4BF;'
  );
}

/** No-op cleanup — console output cannot be retracted. */
export function destroy(): void {
  // Nothing to clean up for console output.
}
