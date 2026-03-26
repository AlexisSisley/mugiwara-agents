// ============================================================
// Toast Notification Store
// ============================================================

import { writable } from 'svelte/store';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly variant: 'success' | 'error' | 'info';
  readonly createdAt: number;
}

export const toasts = writable<Toast[]>([]);

let counter = 0;

export function addToast(message: string, variant: Toast['variant'] = 'info'): string {
  const id = `toast-${++counter}-${Date.now()}`;
  const toast: Toast = { id, message, variant, createdAt: Date.now() };

  toasts.update((current) => [...current, toast]);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    removeToast(id);
  }, 5000);

  return id;
}

export function removeToast(id: string): void {
  toasts.update((current) => current.filter((t) => t.id !== id));
}
