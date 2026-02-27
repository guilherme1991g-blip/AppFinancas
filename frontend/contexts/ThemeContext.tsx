import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IndigoTheme } from '@/constants/theme';
import { api } from '@/services/api';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    colors: typeof IndigoTheme.light;
    toggleTheme: () => void;
    setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>(systemColorScheme === 'dark' ? 'dark' : 'light');

    useEffect(() => {
        const loadTheme = async () => {
            // 1. Load from local cache (instant)
            const savedTheme = await AsyncStorage.getItem('user-theme');
            if (savedTheme) {
                setMode(savedTheme as ThemeMode);
            }

            // 2. Sync from backend (overrides local if different)
            try {
                const prefs: any = await api.getPreferences();
                if (prefs?.theme && (prefs.theme === 'light' || prefs.theme === 'dark')) {
                    setMode(prefs.theme as ThemeMode);
                    await AsyncStorage.setItem('user-theme', prefs.theme);
                }
            } catch {
                // Offline or not logged in — keep local cache
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        AsyncStorage.setItem('user-theme', newMode);
        api.updatePreferences({ theme: newMode }).catch(() => { /* offline */ });
    };

    const setTheme = (newMode: ThemeMode) => {
        setMode(newMode);
        AsyncStorage.setItem('user-theme', newMode);
        api.updatePreferences({ theme: newMode }).catch(() => { /* offline */ });
    };

    const colors = IndigoTheme[mode];

    return (
        <ThemeContext.Provider value={{ mode, colors, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
