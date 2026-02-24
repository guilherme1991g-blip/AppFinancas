import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://217.216.86.94:8000';

async function getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
}

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
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
            signal: controller.signal
        });
        clearTimeout(id);

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
    register: (data: { name: string; email: string; password: string }) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),

    // Accounts
    getAccounts: () => request('/accounts'),
    createAccount: (data: any) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    updateAccount: (id: string, data: any) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBankAccount: (id: string) => request(`/accounts/${id}`, { method: 'DELETE' }),

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
    deleteTransaction: (id: string) => request(`/transactions/${id}`, { method: 'DELETE' }),

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
    deleteRecurring: (id: string) => request(`/recurring/${id}`, { method: 'DELETE' }),

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
    getByCategory: (params?: { month?: number; year?: number; type?: string }) => {
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
    payBill: (billId: string, paymentAccountId: string) =>
        request(`/bills/${billId}/pay?payment_account_id=${paymentAccountId}`, { method: 'POST' }),
    payTransaction: (id: string) => request(`/transactions/${id}/pay`, { method: 'POST' }),

    // Preferences
    getPreferences: () => request('/preferences'),
    updatePreferences: (data: any) => request('/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
    deleteUserAccount: () => request('/auth/account', { method: 'DELETE' }),
};
