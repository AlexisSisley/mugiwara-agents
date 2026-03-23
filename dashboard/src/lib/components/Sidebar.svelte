<script lang="ts">
  import { activeRoute } from '../stores';

  interface NavItem {
    path: string;
    label: string;
    icon: string;
    crew: string;
  }

  const navItems: NavItem[] = [
    { path: '/', label: 'Agents', icon: '👥', crew: 'Monitoring' },
    { path: '/pipelines', label: 'Pipelines', icon: '🚀', crew: 'Workflows' },
    { path: '/sessions', label: 'Sessions', icon: '📋', crew: 'Activity' },
    { path: '/memory', label: 'Memory', icon: '🧠', crew: 'One Piece' },
    { path: '/setup', label: 'Setup', icon: '⚙️', crew: 'Configuration' },
  ];

  function navigate(path: string) {
    window.location.hash = `#${path}`;
    activeRoute.set(path);
  }
</script>

<nav class="sidebar">
  <div class="sidebar-brand">
    <div class="brand-circle">
      <span class="brand-icon anim-float">📊</span>
    </div>
    <div class="brand-text-group">
      <span class="brand-text manga">MUGIWARA</span>
      <span class="brand-sub">Dashboard</span>
    </div>
  </div>

  <div class="manga-accent-line"></div>

  <div class="nav-section">
    <span class="nav-section-label manga">NAVIGATION</span>
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={$activeRoute === item.path}
        on:click={() => navigate(item.path)}
      >
        <span class="nav-icon">{item.icon}</span>
        <div class="nav-text-group">
          <span class="nav-label">{item.label}</span>
          <span class="nav-crew">{item.crew}</span>
        </div>
        {#if $activeRoute === item.path}
          <span class="nav-active-marker"></span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="sidebar-footer">
    <div class="footer-divider"></div>
    <span class="footer-quote">Mugiwara Agents Dashboard</span>
    <span class="version mono">v2.0.0</span>
  </div>
</nav>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--color-bg-alt);
    border-right: 3px solid var(--color-border-strong);
    display: flex;
    flex-direction: column;
    z-index: 50;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    height: var(--header-height);
  }

  .brand-circle {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-primary);
    border-radius: 50%;
    border: 2px solid var(--color-primary-light);
    box-shadow: var(--shadow-sm);
  }

  .brand-icon {
    font-size: 18px;
    filter: brightness(1.2);
  }

  .brand-text-group {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .brand-text {
    font-size: 20px;
    color: var(--color-primary);
    line-height: 1;
    text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);
  }

  .brand-sub {
    font-size: 10px;
    color: var(--color-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .manga-accent-line {
    height: 3px;
    margin: 0 var(--space-4);
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary), transparent);
    border-radius: 2px;
  }

  .nav-section {
    flex: 1;
    padding: var(--space-4) var(--space-3);
  }

  .nav-section-label {
    display: block;
    font-size: 13px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 var(--space-3) var(--space-2);
    margin-bottom: var(--space-2);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-3);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    position: relative;
    margin-bottom: var(--space-1);
  }

  .nav-item:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
    border-color: var(--color-border-light);
  }

  .nav-item.active {
    background: var(--color-surface-active);
    color: var(--color-primary);
    font-weight: 600;
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
  }

  .nav-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .nav-text-group {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .nav-label {
    line-height: 1.2;
  }

  .nav-crew {
    font-size: 10px;
    color: var(--color-text-tertiary);
    line-height: 1;
  }

  .nav-active-marker {
    position: absolute;
    right: 8px;
    width: 6px;
    height: 6px;
    background: var(--color-primary);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--color-primary);
  }

  .sidebar-footer {
    padding: var(--space-3) var(--space-5) var(--space-4);
  }

  .footer-divider {
    height: 2px;
    background: var(--color-border);
    margin-bottom: var(--space-3);
  }

  .footer-quote {
    display: block;
    font-size: 10px;
    font-style: italic;
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-1);
    opacity: 0.7;
  }

  .version {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }
</style>
