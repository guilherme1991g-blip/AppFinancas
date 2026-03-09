import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setUnauthorizedListener } from '@/services/api';
import * as SecureStore from 'expo-secure-store';

const SECURE_AUTH_KEY = 'auth_credentials';

interface User {
    id: string;
    name: string;
    email: string;
    plan?: string;
    plan_limits?: {
        max_accounts: number;
        max_credit_cards: number;
        max_transactions_month: number;
        max_agendamentos: number;
        whatsapp_enabled: boolean;
        tools_enabled: boolean;
    };
    trial_used?: boolean;
    trial_active?: boolean;
    trial_expires_at?: string;
    trial_days_left?: number;
    plan_expires_at?: string;
    plan_days_left?: number;
    plan_expired?: boolean;
    stored_plan?: string;
    is_admin?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string, saveSecure?: boolean) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    getBiometricCredentials: () => Promise<{ email: string; password: string } | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setUnauthorizedListener(() => {
            logout();
        });
        loadUser();
    }, []);

    async function loadUser() {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
                const me = await api.me() as User;
                setUser(me);
            }
        } catch {
            await AsyncStorage.removeItem('auth_token');
        } finally {
            setIsLoading(false);
        }
    }

    async function login(email: string, password: string, saveSecure: boolean = false) {
        const normalizedEmail = email.trim().toLowerCase();
        const res = await api.login({ email: normalizedEmail, password }) as { token: string; user: User };
        await AsyncStorage.setItem('auth_token', res.token);

        if (saveSecure) {
            await SecureStore.setItemAsync(SECURE_AUTH_KEY, JSON.stringify({ email: normalizedEmail, password }));
        }

        setUser(res.user);
    }

    async function getBiometricCredentials() {
        const data = await SecureStore.getItemAsync(SECURE_AUTH_KEY);
        return data ? JSON.parse(data) : null;
    }

    async function register(name: string, email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const res = await api.register({ name: name.trim(), email: normalizedEmail, password }) as { token: string; user: User };
        await AsyncStorage.setItem('auth_token', res.token);
        setUser(res.user);
        // Seed default categories on first register
        try { await api.seedCategories(); } catch { }
    }

    async function logout() {
        await AsyncStorage.removeItem('auth_token');
        await SecureStore.deleteItemAsync(SECURE_AUTH_KEY);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, getBiometricCredentials }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
