import { create } from 'zustand';
import { createId } from '../core/id';

export interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'error';
}

interface ToastStore {
  toasts: Toast[];
  push: (message: string, kind?: Toast['kind']) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const toast: Toast = { id: createId('toast'), message, kind };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    // Auto-dismiss after a short delay.
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }));
    }, 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
