import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(1);
    const timers = useRef(new Map());

    const removeToast = useCallback((id) => {
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (message, type, duration) => {
            const id = nextId.current++;
            setToasts((prev) => [...prev, { id, message, type }]);
            timers.current.set(id, setTimeout(() => removeToast(id), duration));
        },
        [removeToast]
    );

    useEffect(() => {
        const active = timers.current;
        return () => active.forEach(clearTimeout);
    }, []);

    const toast = useMemo(
        () => ({
            success: (message) => addToast(message, 'success', 3000),
            error: (message) => addToast(message, 'error', 6000),
            warning: (message) => addToast(message, 'warning', 6000),
            info: (message) => addToast(message, 'info', 3000)
        }),
        [addToast]
    );

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <Toast key={t.id} toast={t} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const ICONS = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />
};

function Toast({ toast, onRemove }) {
    return (
        <div className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{ICONS[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => onRemove(toast.id)} aria-label="Dismiss notification">
                <X size={14} />
            </button>
        </div>
    );
}
