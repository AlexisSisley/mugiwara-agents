<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ProjectInfo } from '../../../shared/types';
  import { api } from '../api/client';

  export let open = false;
  export let project: ProjectInfo | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    run: { agent: string; message: string };
  }>();

  interface AgentOption {
    name: string;
    label: string;
    type: 'subagent' | 'skill';
  }

  let subAgents: AgentOption[] = [];
  let skills: AgentOption[] = [];
  let selectedAgent = '';
  let message = '';
  let loading = false;

  onMount(async () => {
    try {
      const [agentsData, setupData] = await Promise.all([
        api.getAgents({ limit: '200' }),
        api.getSetup(),
      ]);

      // SubAgents from ~/.claude/agents/
      subAgents = setupData.subAgents
        .map((s) => ({
          name: s.name,
          label: `${s.name} (${s.model})`,
          type: 'subagent' as const,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Skills from registry (exclude subagent names to avoid duplicates)
      const subAgentNames = new Set(subAgents.map((s) => s.name));
      skills = agentsData.data
        .filter((a) => !subAgentNames.has(a.name))
        .map((a) => ({
          name: a.name,
          label: `${a.name} (${a.category})`,
          type: 'skill' as const,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      subAgents = [];
      skills = [];
    }
  });

  function handleSubmit() {
    if (!selectedAgent) return;
    dispatch('run', { agent: selectedAgent, message });
  }

  function handleClose() {
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleClose();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open && project}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={handleClose}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal anim-slide-in" on:click|stopPropagation>
      <div class="modal-header">
        <div class="modal-title-group">
          <h3 class="modal-title manga">LANCER AGENT</h3>
          <span class="modal-subtitle">sur <strong>{project.name}</strong></span>
        </div>
        <button class="modal-close" on:click={handleClose}>&times;</button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label class="field-label" for="agent-select">Agent</label>
          <select id="agent-select" class="field-select" bind:value={selectedAgent}>
            <option value="">-- Choisir un agent --</option>
            {#if subAgents.length > 0}
              <optgroup label="SubAgents">
                {#each subAgents as agent}
                  <option value={agent.name}>{agent.label}</option>
                {/each}
              </optgroup>
            {/if}
            {#if skills.length > 0}
              <optgroup label="Skills">
                {#each skills as agent}
                  <option value={agent.name}>{agent.label}</option>
                {/each}
              </optgroup>
            {/if}
          </select>
        </div>

        <div class="field">
          <label class="field-label" for="agent-message">Message / Prompt</label>
          <textarea
            id="agent-message"
            class="field-textarea"
            bind:value={message}
            placeholder="Decris ce que l'agent doit faire..."
            rows="4"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-cancel" on:click={handleClose}>Annuler</button>
        <button
          class="btn btn-launch"
          disabled={!selectedAgent || loading}
          on:click={handleSubmit}
        >
          Lancer
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    width: 100%;
    max-width: 500px;
    background: var(--color-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--glass-border);
  }

  .modal-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .modal-title {
    font-size: 18px;
    color: var(--color-gold);
    letter-spacing: 0.06em;
  }

  .modal-subtitle {
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .modal-close {
    background: none;
    border: 1px solid var(--glass-border);
    color: var(--color-text-tertiary);
    font-size: 20px;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    line-height: 1;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .modal-close:hover {
    color: var(--color-text-primary);
    border-color: var(--color-text-secondary);
  }

  .modal-body {
    padding: var(--space-5) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .field-select,
  .field-textarea {
    background: var(--color-bg-alt, #111113);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    padding: var(--space-2) var(--space-3);
    transition: border-color var(--transition-fast);
  }

  .field-select:focus,
  .field-textarea:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
  }

  .field-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--glass-border);
  }

  .btn {
    padding: var(--space-2) var(--space-5);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-cancel {
    background: transparent;
    color: var(--color-text-secondary);
    border-color: var(--glass-border);
  }

  .btn-cancel:hover {
    color: var(--color-text-primary);
    border-color: var(--color-text-secondary);
  }

  .btn-launch {
    background: var(--color-gold);
    color: #09090B;
    border-color: var(--color-gold);
  }

  .btn-launch:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-launch:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
