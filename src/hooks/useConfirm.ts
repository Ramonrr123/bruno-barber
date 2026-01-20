import { useState, useCallback, useEffect } from 'react';

export interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

let confirmId = 0;
const listeners: Set<(confirm: ConfirmOptions | null) => void> = new Set();
let currentConfirm: ConfirmOptions | null = null;

const notifyListeners = () => {
  listeners.forEach((listener) => listener(currentConfirm));
};

export const useConfirm = () => {
  const [state, setState] = useState<ConfirmOptions | null>(currentConfirm);

  const show = useCallback((options: ConfirmOptions) => {
    currentConfirm = options;
    notifyListeners();
  }, []);

  const hide = useCallback(() => {
    currentConfirm = null;
    notifyListeners();
  }, []);

  return {
    confirm: state,
    show,
    hide,
  };
};

// Hook para escutar mudanças
export const useConfirmListener = () => {
  const [state, setState] = useState<ConfirmOptions | null>(currentConfirm);

  useEffect(() => {
    const listener = (confirm: ConfirmOptions | null) => {
      setState(confirm);
    };
    listeners.add(listener);
    setState(currentConfirm); // Sincronizar estado inicial
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
};

// Função global para usar sem hook
// Usamos um nome diferente para evitar conflito com window.confirm
export const showConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const options: ConfirmOptions = {
      message,
      onConfirm: () => {
        currentConfirm = null;
        notifyListeners();
        resolve(true);
      },
      onCancel: () => {
        currentConfirm = null;
        notifyListeners();
        resolve(false);
      },
    };
    currentConfirm = options;
    notifyListeners();
  });
};

// Alias para manter compatibilidade
export const confirm = showConfirm;
