import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const nextID = useRef(0);

  const showToast = useCallback((type, message) => {
    nextID.current += 1;
    setToast({ id: nextID.current, type, message });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutID = window.setTimeout(dismissToast, 4000);
    return () => window.clearTimeout(timeoutID);
  }, [toast, dismissToast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"} aria-live={toast.type === "error" ? "assertive" : "polite"} key={toast.id}>
          <span className="toast-icon" aria-hidden="true">{toast.type === "success" ? "✓" : "!"}</span>
          <span className="toast-message">{toast.message}</span>
          <button type="button" className="toast-close" onClick={dismissToast} aria-label="Tutup notifikasi">×</button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast harus digunakan di dalam ToastProvider.");
  return showToast;
}
