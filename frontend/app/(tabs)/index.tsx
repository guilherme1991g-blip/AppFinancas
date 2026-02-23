import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function DashboardScreen() {
    const { user, logout } = useAuth();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [summary, setSummary] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);

    async function fetchData() {
        try {
            const [s, txs, accs, cats] = await Promise.all([
                api.getSummary({ month, year }) as Promise<any>,
                api.getTransactions({ month, year, limit: 5 }) as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
            ]);
            setSummary(s);
            setTransactions(txs);
            setAccounts(accs);
            setCategories(cats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, [month, year]));

    function prevMonth() {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    }
    function nextMonth() {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    }

    function getCategoryInfo(id: string) {
        return categories.find(c => c.id === id);
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
                    <Text style={styles.headerSub}>Seu resumo financeiro</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Month Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                    <Ionicons name="chevron-back" size={20} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.monthText}>{MONTH_NAMES[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.text} />
                </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                    <Text style={styles.balanceLabel}>Saldo Total</Text>
                    <TouchableOpacity onPress={() => setBalanceVisible(v => !v)}>
                        <Ionicons name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.balanceValue}>
                    {balanceVisible ? formatCurrency(summary?.total_balance || 0) : '••••••'}
                </Text>
                <View style={styles.balanceSplit}>
                    <View style={styles.balanceSplitItem}>
                        <View style={styles.incomeIcon}>
                            <Ionicons name="arrow-down" size={14} color={Colors.income} />
                        </View>
                        <View>
                            <Text style={styles.splitLabel}>Receitas</Text>
                            <Text style={[styles.splitValue, { color: Colors.income }]}>
                                {formatCurrency(summary?.income || 0)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.balanceSplitItem}>
                        <View style={styles.expenseIcon}>
                            <Ionicons name="arrow-up" size={14} color={Colors.expense} />
                        </View>
                        <View>
                            <Text style={styles.splitLabel}>Despesas</Text>
                            <Text style={[styles.splitValue, { color: Colors.expense }]}>
                                {formatCurrency(summary?.expense || 0)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                {[
                    { label: 'Receita', icon: 'add-circle', color: Colors.income, route: '/transaction/new?type=income' },
                    { label: 'Despesa', icon: 'remove-circle', color: Colors.expense, route: '/transaction/new?type=expense' },
                    { label: 'Transferir', icon: 'swap-horizontal', color: Colors.secondary, route: '/transfer/new' },
                    { label: 'Conta', icon: 'wallet', color: Colors.warning, route: '/account/new' },
                ].map((a) => (
                    <TouchableOpacity key={a.label} style={styles.quickAction} onPress={() => router.push(a.route as any)}>
                        <View style={[styles.quickActionIcon, { backgroundColor: a.color + '20' }]}>
                            <Ionicons name={a.icon as any} size={22} color={a.color} />
                        </View>
                        <Text style={styles.quickActionLabel}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Accounts */}
            {accounts.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Minhas Contas</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsRow}>
                        {accounts.map((acc) => (
                            <View key={acc.id} style={[styles.accountCard, { borderLeftColor: acc.color }]}>
                                <Ionicons name={acc.icon || 'wallet'} size={18} color={acc.color} />
                                <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text>
                                <Text style={[styles.accountBalance, { color: acc.balance >= 0 ? Colors.income : Colors.expense }]}>
                                    {balanceVisible ? formatCurrency(acc.balance) : '••••'}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Recent Transactions */}
            <View style={styles.section}>
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Últimas Transações</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                        <Text style={styles.seeAll}>Ver todas</Text>
                    </TouchableOpacity>
                </View>
                {transactions.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>Nenhuma transação neste mês</Text>
                        <TouchableOpacity onPress={() => router.push('/transaction/new?type=expense' as any)} style={styles.emptyBtn}>
                            <Text style={styles.emptyBtnText}>Adicionar transação</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    transactions.map((tx) => {
                        const cat = getCategoryInfo(tx.category_id);
                        return (
                            <TouchableOpacity key={tx.id} style={styles.txItem} onPress={() => router.push(`/transaction/${tx.id}` as any)}>
                                <View style={[styles.txIcon, { backgroundColor: (cat?.color || '#636E72') + '25' }]}>
                                    <Ionicons name={(cat?.icon || 'ellipsis-horizontal') as any} size={18} color={cat?.color || '#636E72'} />
                                </View>
                                <View style={styles.txInfo}>
                                    <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                    <Text style={styles.txCat}>{cat?.name || 'Sem categoria'}</Text>
                                </View>
                                <Text style={[styles.txAmount, { color: tx.type === 'income' ? Colors.income : Colors.expense }]}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 56 },
    greeting: { fontSize: 20, fontWeight: '700', color: Colors.text },
    headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    logoutBtn: { padding: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: Radius.full },
    monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, gap: Spacing.md },
    monthArrow: { padding: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: Radius.full },
    monthText: { fontSize: 15, fontWeight: '600', color: Colors.text, width: 90, textAlign: 'center' },
    balanceCard: {
        marginHorizontal: Spacing.lg, borderRadius: Radius.xl,
        backgroundColor: Colors.primary,
        padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    balanceLabel: { fontSize: 13, color: 'rgba(0,0,0,0.6)', fontWeight: '500' },
    balanceValue: { fontSize: 32, fontWeight: '800', color: '#000', marginBottom: Spacing.md },
    balanceSplit: { flexDirection: 'row', alignItems: 'center' },
    balanceSplitItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    incomeIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
    expenseIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
    splitLabel: { fontSize: 11, color: 'rgba(0,0,0,0.6)' },
    splitValue: { fontSize: 14, fontWeight: '700' },
    divider: { width: 1, height: 36, backgroundColor: 'rgba(0,0,0,0.2)', marginHorizontal: Spacing.md },
    quickActions: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg },
    quickAction: { flex: 1, alignItems: 'center', gap: 6 },
    quickActionIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    quickActionLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
    section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
    seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
    accountsRow: { marginBottom: Spacing.sm },
    accountCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.md, marginRight: Spacing.md,
        borderLeftWidth: 3, minWidth: 130,
    },
    accountName: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, marginBottom: 4 },
    accountBalance: { fontSize: 15, fontWeight: '700' },
    emptyCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.xl, alignItems: 'center', gap: Spacing.md,
    },
    emptyText: { color: Colors.textSecondary, fontSize: 14 },
    emptyBtn: { backgroundColor: Colors.primary + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    emptyBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
    txItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md,
    },
    txIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 14, fontWeight: '600', color: Colors.text },
    txCat: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: '700' },
});
