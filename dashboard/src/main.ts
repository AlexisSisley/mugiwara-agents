import App from './App.svelte';
import './styles/global.css';

const app = new App({
  target: document.getElementById('app')!,
});

// ── Easter Egg: Console Art (dev only, lazy-loaded) ──────────
if (import.meta.env.DEV) {
  import('./__eggs__/console-art').then((egg) => egg.activate());
}

export default app;
