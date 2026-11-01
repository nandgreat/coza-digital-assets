/**
 * Toast Notification Component
 * 
 * Displays temporary, auto‑dismissible notifications for success/error/info.
 * Uses a simple state management via a context provider.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// Create a context for the toast system
const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

/**
 * Toast Provider – wraps the app and provides toast functions.
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    /**
     * Add a toast message.
     * @param {string} message - The message to display
     * @param {string} type - 'success', 'error', 'info' (default: 'info')
     * @param {number} duration - Auto‑dismiss duration in ms (default: 5000)
     */
    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-sm pointer-events-none">
                {toasts.map(({ id, message, type }) => (
                    <div
                        key={id}
                        className={`pointer-events-auto p-4 rounded-xl shadow-2xl backdrop-blur-md border transition-all transform duration-300 animate-slide-in ${
                            type === 'success' ? 'bg-green-50/90 border-green-300 text-green-800' :
                            type === 'error' ? 'bg-red-50/90 border-red-300 text-red-800' :
                            'bg-blue-50/90 border-blue-300 text-blue-800'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-xl">
                                {type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                            </span>
                            <div className="flex-1 text-sm font-medium">{message}</div>
                            <button
                                onClick={() => removeToast(id)}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;