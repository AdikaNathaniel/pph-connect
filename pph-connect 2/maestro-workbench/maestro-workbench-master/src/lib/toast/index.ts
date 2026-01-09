import { toast } from 'sonner';

type ToastOptions = {
  description?: string;
};

export const showSuccessToast = (title: string, { description }: ToastOptions = {}) =>
  toast.success(title, description ? { description } : undefined);

export const showErrorToast = (title: string, { description }: ToastOptions = {}) =>
  toast.error(title, description ? { description } : undefined);

export const showInfoToast = (title: string, { description }: ToastOptions = {}) =>
  toast.info(title, description ? { description } : undefined);

export const showWarningToast = (title: string, { description }: ToastOptions = {}) =>
  toast.warning?.(title, description ? { description } : undefined);
