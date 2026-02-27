import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LangCode } from '@/constants/translations';
import { api } from '@/services/api';

type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'ARS' | 'JPY';

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string }> = {
    BRL: { symbol: 'R$', locale: 'pt-BR' },
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' },
    GBP: { symbol: '£', locale: 'en-GB' },
    ARS: { symbol: '$', locale: 'es-AR' },
    JPY: { symbol: '¥', locale: 'ja-JP' },
};

interface LocaleContextType {
    language: LangCode;
    currency: CurrencyCode;
    setLanguage: (lang: LangCode) => Promise<void>;
    setCurrency: (cur: CurrencyCode) => Promise<void>;
    t: (key: string) => string;
    fmt: (value: number) => string;
}

const LocaleContext = createContext<LocaleContextType>({
    language: 'pt-BR',
    currency: 'BRL',
    setLanguage: async () => { },
    setCurrency: async () => { },
    t: (key: string) => key,
    fmt: (value: number) => String(value),
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [language, setLang] = useState<LangCode>('pt-BR');
    const [currency, setCur] = useState<CurrencyCode>('BRL');

    useEffect(() => {
        (async () => {
            // 1. Load from local cache (instant)
            const savedLang = await AsyncStorage.getItem('user-language');
            const savedCur = await AsyncStorage.getItem('user-currency');
            if (savedLang && (savedLang === 'pt-BR' || savedLang === 'en' || savedLang === 'es')) {
                setLang(savedLang as LangCode);
            }
            if (savedCur && savedCur in CURRENCY_CONFIG) {
                setCur(savedCur as CurrencyCode);
            }

            // 2. Sync from backend (overrides local if different)
            try {
                const prefs: any = await api.getPreferences();
                if (prefs?.language && (prefs.language === 'pt-BR' || prefs.language === 'en' || prefs.language === 'es')) {
                    setLang(prefs.language as LangCode);
                    await AsyncStorage.setItem('user-language', prefs.language);
                }
                if (prefs?.currency && prefs.currency in CURRENCY_CONFIG) {
                    setCur(prefs.currency as CurrencyCode);
                    await AsyncStorage.setItem('user-currency', prefs.currency);
                }
            } catch {
                // Offline or not logged in — keep local cache
            }
        })();
    }, []);

    const setLanguage = useCallback(async (lang: LangCode) => {
        setLang(lang);
        await AsyncStorage.setItem('user-language', lang);
        try {
            await api.updatePreferences({ language: lang });
        } catch { /* offline fallback — saved locally */ }
    }, []);

    const setCurrency = useCallback(async (cur: CurrencyCode) => {
        setCur(cur);
        await AsyncStorage.setItem('user-currency', cur);
        try {
            await api.updatePreferences({ currency: cur });
        } catch { /* offline fallback */ }
    }, []);

    const t = useCallback((key: string): string => {
        return translations[language]?.[key] || translations['pt-BR']?.[key] || key;
    }, [language]);

    const fmt = useCallback((value: number): string => {
        const config = CURRENCY_CONFIG[currency];
        const formatted = new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: currency === 'JPY' ? 0 : 2,
            maximumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(value);
        return formatted;
    }, [currency]);

    return (
        <LocaleContext.Provider value={{ language, currency, setLanguage, setCurrency, t, fmt }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    return useContext(LocaleContext);
}
