import App from './App.svelte';
import './styles/global.css';

const app = new App({
  target: document.getElementById('app')!,
});

// ── Easter Egg: Console Art (dev only, lazy-loaded) ──────────
if (import.meta.env.DEV) {
  import('./__eggs__/console-art').then((egg) => egg.activate());
}

// ── Easter Egg: Konami Code → Wanted Poster (lazy-loaded) ───
// Active in all environments (prod included) — triggered only by deliberate key combo.
// Disable with VITE_ENABLE_EGGS=false in .env
if (import.meta.env.VITE_ENABLE_EGGS !== 'false') {
  import('./__eggs__/konami').then((egg) => egg.activate());
}

// ── Easter Egg: Nakama Roll Call (lazy-loaded) ───────────────
// Triple-click the version number in the sidebar to reveal crew roster.
// Disable with VITE_ENABLE_EGGS=false in .env
if (import.meta.env.VITE_ENABLE_EGGS !== 'false') {
  import('./__eggs__/nakama-roll').then((egg) => egg.activate());
}

export default app;
