import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * TailAdmin-compatible theme context for the COZA Digital Assets Analytics UI.
 *
 * The context deliberately remains client-side only. Theme state is presentation
 * state and does not participate in the analytics data contract or backend API.
 */
const ThemeContext = createContext(undefined);

/**
 * Provides light/dark theme state to the TailAdmin presentation layer.
 *
 * @param {{ children: React.ReactNode }} props React provider props.
 * @returns {React.JSX.Element} Theme provider tree.
 */
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const savedTheme = window.localStorage.getItem('coza-analytics-theme');
        const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';

        setTheme(initialTheme);
        setInitialized(true);
    }, []);

    useEffect(() => {
        if (!initialized) {
            return;
        }

        window.localStorage.setItem('coza-analytics-theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme, initialized]);

    /**
     * Toggles the presentation theme without touching analytics state.
     *
     * @returns {void}
     */
    const toggleTheme = () => {
        setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Reads the active TailAdmin theme context.
 *
 * @returns {{ theme: 'light'|'dark', toggleTheme: () => void }} Theme API.
 * @throws {Error} When invoked outside ThemeProvider.
 */
export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}
