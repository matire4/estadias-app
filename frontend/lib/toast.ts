// /frontend/lib/toast.ts
export type ToastType = 'info' | 'success' | 'error';

export function toast(message: string, type: ToastType = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
}

export const toastInfo = (m: string) => toast(m, 'info');
export const toastSuccess = (m: string) => toast(m, 'success');
export const toastError = (m: string) => toast(m, 'error');
