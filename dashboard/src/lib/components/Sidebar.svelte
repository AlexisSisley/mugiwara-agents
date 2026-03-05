<script lang="ts">
  import { activeRoute } from '../stores';

  interface NavItem {
    path: string;
    label: string;
    icon: string;
  }

  const navItems: NavItem[] = [
    { path: '/', label: 'Agents', icon: '\u{1F916}' },
    { path: '/pipelines', label: 'Pipelines', icon: '\u{1F500}' },
    { path: '/sessions', label: 'Sessions', icon: '\u{1F4CB}' },
  ];

  function navigate(path: string) {
    window.location.hash = `#${path}`;
    activeRoute.set(path);
  }
</script>

<nav class="sidebar">
  <div class="sidebar-brand">
    <span class="brand-icon">&#9875;</span>
    <span class="brand-text">Mugiwara</span>
  </div>

  <div class="nav-section">
    <span class="nav-section-label">Navigation</span>
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
    <span class="version mono">v0.1.0</span>
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
    border-right: 1px solid var(--color-border);
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
    border-bottom: 1px solid var(--color-border);
  }

  .brand-icon {
    font-size: 22px;
  }

  .brand-text {
    font-weight: 700;
    font-size: 16px;
    color: var(--color-primary);
    letter-spacing: -0.01em;
  }

  .nav-section {
    flex: 1;
    padding: var(--space-4) var(--space-3);
  }

  .nav-section-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0 var(--space-3) var(--space-2);
    margin-bottom: var(--space-2);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
  }

  .nav-item:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .nav-item.active {
    background: var(--color-surface-active);
    color: var(--color-primary);
    font-weight: 600;
  }

  .nav-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .sidebar-footer {
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--color-border);
  }

  .version {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }
</style>
