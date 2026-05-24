import type { ToastType } from '../components/Toast';

let _dispatch: ((t: { id: string; type: ToastType; message: string; duration?: number }) => void) | null = null;

export function setToastDispatch(dispatch: typeof _dispatch) {
  _dispatch = dispatch;
}

export function clearToastDispatch() {
  _dispatch = null;
}

export function toast(message: string, type: ToastType = 'success', duration = 3500) {
  if (_dispatch) {
    _dispatch({ id: crypto.randomUUID(), type, message, duration });
  }
}
