import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setUnauthorizedListener } from '@/services/api';

interface User {
    id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
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

    async function login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const res = await api.login({ email: normalizedEmail, password }) as { token: string; user: User };
        await AsyncStorage.setItem('auth_token', res.token);
        setUser(res.user);
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
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
