import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = () => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return envUrl;
    }
    // Default to the production domain with /api prefix as configured in Nginx
    return 'https://meudindin.integrareplus.com/api';
};

const BASE_URL = getBaseUrl();

async function getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
}

let onUnauthorized: (() => void) | null = null;
let onPlanLimit: ((message: string) => void) | null = null;

export const setUnauthorizedListener = (callback: () => void) => {
    onUnauthorized = callback;
};

export const setPlanLimitListener = (callback: (message: string) => void) => {
    onPlanLimit = callback;
};

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
            signal: controller.signal
        });
        clearTimeout(id);

        if (response.status === 401) {
            if (onUnauthorized) onUnauthorized();
            const err = await response.json().catch(() => ({ detail: 'Sessão expirada' }));
            throw new Error(err.detail || 'Sua sessão expirou. Por favor, entre novamente.');
        }

        if (response.status === 403) {
            const err = await response.json().catch(() => ({ detail: 'Limite do plano atingido' }));
            const msg = err.detail || 'Limite do plano atingido';
            if (onPlanLimit) {
                onPlanLimit(msg);
                // Throw with flag so callers can silently ignore
                const error: any = new Error(msg);
                error.status = 403;
                error.planLimitHandled = true;
                throw error;
            }
            const error: any = new Error(msg);
            error.status = 403;
            throw error;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Erro na requisição' }));
            throw new Error(err.detail || 'Erro desconhecido');
        }
        return response.json();
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('A requisição demorou demais. Verifique sua conexão.');
        }
        throw error;
    }
}

export const api = {
    // Auth
    register: (data: { name: string; email: string; password: string; phone?: string; cpf?: string }) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request(`/auth/me?cb=${Date.now()}`),

    // Accounts
    getAccounts: () => request('/accounts'),
    createAccount: (data: any) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    updateAccount: (id: string, data: any) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAccount: (id: string) => request(`/accounts/${id}`, { method: 'DELETE' }),

    // Categories
    getCategories: () => request('/categories'),
    seedCategories: () => request('/categories/seed', { method: 'POST' }),
    createCategory: (data: any) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id: string, data: any) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

    // Transactions
    getTransactions: (params?: Record<string, any>) => {
        const query = params ? '?' + new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ) : '';
        return request(`/transactions${query}`);
    },
    createTransaction: (data: any) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    updateTransaction: (id: string, data: any) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTransaction: (id: string, mode?: string) => request(`/transactions/${id}${mode ? `?mode=${mode}` : ''}`, { method: 'DELETE' }),

    // Transfers
    getTransfers: () => request('/transfers'),
    createTransfer: (data: any) => request('/transfers', { method: 'POST', body: JSON.stringify(data) }),
    deleteTransfer: (id: string) => request(`/transfers/${id}`, { method: 'DELETE' }),

    // Metas (ex-Budgets)
    getBudgets: (params?: { month?: number; year?: number }) => {
        const query = params ? '?' + new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ) : '';
        return request(`/metas${query}`);
    },
    createBudget: (data: any) => request('/metas', { method: 'POST', body: JSON.stringify(data) }),
    updateBudget: (id: string, data: any) => request(`/metas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBudget: (id: string) => request(`/metas/${id}`, { method: 'DELETE' }),

    // Recurring
    getRecurring: () => request('/recurring'),
    createRecurring: (data: any) => request('/recurring', { method: 'POST', body: JSON.stringify(data) }),
    updateRecurring: (id: string, data: any) => request(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRecurring: (id: string, mode?: string) => request(`/recurring/${id}${mode ? `?mode=${mode}` : ''}`, { method: 'DELETE' }),

    // Companies
    getCompanies: () => request('/companies'),
    createCompany: (data: any) => request('/companies', { method: 'POST', body: JSON.stringify(data) }),
    updateCompany: (id: string, data: any) => request(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCompany: (id: string) => request(`/companies/${id}`, { method: 'DELETE' }),

    // Analytics
    getSummary: (params?: { month?: number; year?: number; company_id?: string }) => {
        const query = params ? '?' + new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ) : '';
        return request(`/analytics/summary${query}`);
    },
    getByCategory: (params?: { month?: number; year?: number; type?: string; is_paid?: boolean }) => {
        const query = params ? '?' + new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ) : '';
        return request(`/analytics/by-category${query}`);
    },
    getCashflow: (params?: { year?: number }) => {
        const query = params ? '?' + new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ) : '';
        return request(`/analytics/cashflow${query}`);
    },
    getDRE: (params?: { month?: number; year?: number; company_id?: string }) => {
        const query = params ? '?' + new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ) : '';
        return request(`/analytics/dre${query}`);
    },

    // Bills (Faturas)
    getBills: (accountId: string) => request(`/bills/${accountId}`),
    getBillTransactions: (billId: string) => request(`/bills/${billId}/transactions`),
    payBill: (billId: string, data: { payment_account_id: string; amount?: number; date?: string }) =>
        request(`/bills/${billId}/pay`, { method: 'POST', body: JSON.stringify(data) }),
    payTransaction: (id: string, data?: { date?: string; amount?: number }) => request(`/transactions/${id}/pay`, { method: 'POST', body: JSON.stringify(data || {}) }),
    unpayTransaction: (id: string) => request(`/transactions/${id}/unpay`, { method: 'POST' }),
    extractPix: async (file: any) => {
        const token = await getToken();
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/pdf',
        } as any);

        const response = await fetch(`${BASE_URL}/transactions/extract-pix`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Erro ao processar PDF' }));
            throw new Error(err.detail || 'Erro na extração');
        }
        return response.json();
    },
    extractReceiptImage: async (image: any) => {
        const token = await getToken();
        const formData = new FormData();
        formData.append('file', {
            uri: image.uri,
            name: 'receipt.jpg',
            type: 'image/jpeg',
        } as any);

        const response = await fetch(`${BASE_URL}/transactions/extract-receipt`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Erro ao processar imagem' }));
            throw new Error(err.detail || 'Erro na extração');
        }
        return response.json();
    },

    // Profile & Preferences
    getMe: () => request('/auth/me'),
    getPreferences: () => request('/preferences'),
    updatePreferences: (data: any) => request('/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
    updatePushToken: (token: string) => request('/preferences/push-token', { method: 'POST', body: JSON.stringify({ token }) }),
    changePassword: (currentPassword: string, newPassword: string) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
    updateProfile: (data: {
        name?: string;
        email?: string;
        phone?: string;
        ddi?: string;
        cpf?: string;
        is_brazilian?: boolean;
        cep?: string;
        city?: string;
        state?: string;
        address?: string;
        birth_date?: string;
        education?: string;
        occupation?: string;
        salary_range?: string;
        housing_type?: string;
        household_size?: number;
        has_vehicle?: boolean;
        vehicle_type?: string;
        equity?: number;
    }) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    deleteUserAccount: (deleteProfile: boolean = true) => request(`/auth/account?delete_profile=${deleteProfile}`, { method: 'DELETE' }),
    startTrial: () => request('/auth/start-trial', { method: 'POST' }),

    // Sonhos
    getSonhos: () => request('/sonhos'),
    createSonho: (data: any) => request('/sonhos', { method: 'POST', body: JSON.stringify(data) }),
    updateSonho: (id: string, data: any) => request(`/sonhos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSonho: (id: string) => request(`/sonhos/${id}`, { method: 'DELETE' }),

    // Compromissos (Agenda)
    getCompromissos: () => request('/compromissos'),
    createCompromisso: (data: any) => request('/compromissos', { method: 'POST', body: JSON.stringify(data) }),
    updateCompromisso: (id: string, data: any) => request(`/compromissos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCompromisso: (id: string) => request(`/compromissos/${id}`, { method: 'DELETE' }),

    // Notifications
    getNotifications: () => request('/notifications'),
    markNotificationAsRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
    markAllNotificationsAsRead: () => request('/notifications/read-all', { method: 'POST' }),
    sendTestNotification: () => request('/notifications/test', { method: 'POST' }),

    // Data Management
    exportData: () => request('/data/export'),
    importData: (data: any) => request('/data/import', { method: 'POST', body: JSON.stringify(data) }),
};
