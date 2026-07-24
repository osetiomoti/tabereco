'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';
type Toast = { id: number; message: string; type: ToastType };

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
}>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-0 right-0 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-bold max-w-sm w-full pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300 ${
              toast.type === 'success'
                ? 'bg-white border-green-100 text-gray-800'
                : 'bg-white border-red-100 text-gray-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            ) : (
              <XCircle size={18} className="text-red-500 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
