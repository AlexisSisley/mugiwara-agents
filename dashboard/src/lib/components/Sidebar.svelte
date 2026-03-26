<script lang="ts">
  import { activeRoute } from '../stores';

  interface NavItem {
    path: string;
    label: string;
    icon: string;
    crew: string;
  }

  const navItems: NavItem[] = [
    { path: '/', label: 'Overview', icon: '🧭', crew: 'Tableau de Bord' },
    { path: '/crew', label: 'Crew', icon: '👥', crew: "L'Equipage" },
    { path: '/orchestrator', label: 'Orchestrator', icon: '🧠', crew: 'One Piece' },
    { path: '/pipelines', label: 'Pipelines', icon: '🚀', crew: 'Expeditions' },
    { path: '/projects', label: 'Projects', icon: '📁', crew: 'Iles Visitees' },
    { path: '/reports', label: 'Reports', icon: '📜', crew: 'Journal de Bord' },
  ];

  function navigate(path: string) {
    window.location.hash = `#${path}`;
    activeRoute.set(path);
  }
</script>

<nav class="sidebar">
  <div class="sidebar-brand">
    <h1 class="brand-text">MUGIWARA</h1>
    <div class="brand-line"></div>
  </div>

  <div class="nav-section">
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={$activeRoute === item.path}
        on:click={() => navigate(item.path)}
      >
        <span class="nav-icon">{item.icon}</span>
        <span class="nav-label">{item.label}</span>
      </button>
    {/each}
  </div>

  <div class="sidebar-footer">
    <span class="version">v3.1.0</span>
  </div>
</nav>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: rgba(9,9,11,0.95);
    border-right: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    z-index: 50;
    color: var(--color-text-secondary);
  }

  .sidebar-brand {
    padding: 28px 28px 20px;
  }

  .brand-text {
    font-family: var(--font-manga);
    font-size: 20px;
    font-weight: 700;
    color: var(--color-gold);
    letter-spacing: 0.08em;
  }

  .brand-line {
    height: 1px;
    margin-top: 14px;
    background: linear-gradient(90deg, transparent, var(--color-gold), transparent);
  }

  .nav-section {
    flex: 1;
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 11px 28px;
    border: none;
    border-left: 3px solid transparent;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .nav-item:hover {
    background: rgba(255,255,255,0.03);
    color: var(--color-text-primary);
  }

  .nav-item.active {
    color: var(--color-gold);
    background: var(--color-gold-dim);
    border-left-color: var(--color-gold);
  }

  .nav-icon {
    width: 18px;
    text-align: center;
    font-size: 14px;
    opacity: 0.7;
  }

  .nav-item.active .nav-icon {
    opacity: 1;
  }

  .nav-label {
    font-size: 14px;
  }

  .sidebar-footer {
    padding: 20px 28px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .version {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text-tertiary);
  }
</style>
