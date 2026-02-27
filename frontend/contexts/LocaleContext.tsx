import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LangCode } from '@/constants/translations';

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
            const savedLang = await AsyncStorage.getItem('user-language');
            const savedCur = await AsyncStorage.getItem('user-currency');
            if (savedLang && (savedLang === 'pt-BR' || savedLang === 'en' || savedLang === 'es')) {
                setLang(savedLang as LangCode);
            }
            if (savedCur && savedCur in CURRENCY_CONFIG) {
                setCur(savedCur as CurrencyCode);
            }
        })();
    }, []);

    const setLanguage = useCallback(async (lang: LangCode) => {
        setLang(lang);
        await AsyncStorage.setItem('user-language', lang);
    }, []);

    const setCurrency = useCallback(async (cur: CurrencyCode) => {
        setCur(cur);
        await AsyncStorage.setItem('user-currency', cur);
    }, []);

    const t = useCallback((key: string): string => {
        return translations[language]?.[key] || translations['pt-BR']?.[key] || key;
    }, [language]);

    const fmt = useCallback((value: number): string => {
        const config = CURRENCY_CONFIG[currency];
        // Format with the proper locale for number formatting but replace the currency symbol
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
