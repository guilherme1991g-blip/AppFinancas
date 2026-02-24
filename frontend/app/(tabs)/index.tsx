import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Dimensions
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// Simple bar chart component
function SpendingBar({ income, expense, colors }: { income: number; expense: number; colors: any }) {
    const max = Math.max(income, expense, 1);
    const incomeH = (income / max) * 80;
    const expenseH = (expense / max) * 80;
    const barStyles = b(colors);
    return (
        <View style={barStyles.container}>
            <View style={barStyles.col}>
                <View style={[barStyles.fill, { height: incomeH, backgroundColor: colors.income }]} />
                <Text style={barStyles.label}>Receita</Text>
            </View>
            <View style={barStyles.col}>
                <View style={[barStyles.fill, { height: expenseH, backgroundColor: colors.expense }]} />
                <Text style={barStyles.label}>Despesa</Text>
            </View>
        </View>
    );
}

const b = (colors: any) => StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 100, paddingBottom: 20 },
    col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    fill: { width: '100%', borderRadius: 8, minHeight: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    label: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});

export default function DashboardScreen() {
    const { user } = useAuth();
    const { mode, colors } = useTheme();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [summary, setSummary] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);

    async function fetchData() {
        try {
            const [s, txs, accs, cats, buds] = await Promise.all([
                api.getSummary({ month, year }) as Promise<any>,
                api.getTransactions({ month, year, limit: 5 }) as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
                api.getBudgets({ month, year }) as Promise<any[]>,
            ]);
            setSummary(s); setTransactions(txs); setAccounts(accs);
            setCategories(cats); setBudgets(buds);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, [month, year]));

    function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
    function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }
    function getCat(id: string) { return categories.find(c => c.id === id); }

    const savingsRate = summary?.income > 0
        ? Math.max(0, Math.min(100, ((summary.income - summary.expense) / summary.income) * 100))
        : 0;

    const styles = s(colors);

    if (loading) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={colors.primary} size="large" />
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
                    <Text style={styles.greetingSub}>{MONTH_NAMES[month - 1]} {year}</Text>
                </View>
                <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/more')}>
                    <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {/* Month selector */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{MONTH_SHORT[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <View style={styles.balanceTop}>
                    <View>
                        <Text style={styles.balanceLabel}>Saldo Total</Text>
                        <Text style={styles.balanceValue}>
                            {balanceVisible ? fmt(summary?.total_balance || 0) : '••••••'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setBalanceVisible(v => !v)} style={styles.eyeBtn}>
                        <Ionicons name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.balanceRow}>
                    <View style={styles.balanceItem}>
                        <View style={styles.incBadge}>
                            <Ionicons name="arrow-down" size={12} color="#FFF" />
                        </View>
                        <View>
                            <Text style={styles.balanceItemLabel}>Receitas</Text>
                            <Text style={styles.balanceItemVal}>{fmt(summary?.income || 0)}</Text>
                        </View>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                        <View style={styles.expBadge}>
                            <Ionicons name="arrow-up" size={12} color="#FFF" />
                        </View>
                        <View>
                            <Text style={styles.balanceItemLabel}>Despesas</Text>
                            <Text style={styles.balanceItemVal}>{fmt(summary?.expense || 0)}</Text>
                        </View>
                    </View>
                </View>

                {/* Savings rate bar */}
                <View style={styles.savingsRow}>
                    <Text style={styles.savingsLabel}>Taxa de poupança: {savingsRate.toFixed(0)}%</Text>
                </View>
                <View style={styles.savingsBar}>
                    <View style={[styles.savingsFill, { width: `${savingsRate}%` as any }]} />
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickRow}>
                {[
                    { icon: 'add-circle', label: 'Receita', color: colors.income, route: '/transaction/new?type=income' },
                    { icon: 'remove-circle', label: 'Despesa', color: colors.expense, route: '/transaction/new?type=expense' },
                    { icon: 'swap-horizontal', label: 'Transferir', color: colors.secondary, route: '/transfer/new' },
                    { icon: 'settings-outline', label: 'Config.', color: colors.warning, route: '/(tabs)/more' },
                ].map(a => (
                    <TouchableOpacity key={a.label} style={styles.quickItem} onPress={() => router.push(a.route as any)}>
                        <View style={[styles.quickIcon, { backgroundColor: a.color + '15' }]}>
                            <Ionicons name={a.icon as any} size={22} color={a.color} />
                        </View>
                        <Text style={styles.quickLabel}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Charts */}
            <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Receita vs Despesa</Text>
                <SpendingBar income={summary?.income || 0} expense={summary?.expense || 0} colors={colors} />
            </View>

            {/* Accounts */}
            {accounts.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Minhas Contas</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/accounts' as any)}>
                            <Text style={styles.seeAll}>Ver todas</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {accounts.map(acc => (
                            <View key={acc.id} style={[styles.accCard, { borderTopColor: acc.color }]}>
                                <Ionicons name={acc.icon || 'wallet'} size={20} color={acc.color} />
                                <Text style={styles.accName} numberOfLines={1}>{acc.name}</Text>
                                <Text style={[styles.accBalance, { color: acc.balance >= 0 ? colors.income : colors.expense }]}>
                                    {balanceVisible ? fmt(acc.balance) : '••••'}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Budgets overview */}
            {budgets.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Orçamentos</Text>
                        <TouchableOpacity onPress={() => router.push('/budget/new' as any)}>
                            <Text style={styles.seeAll}>+ Novo</Text>
                        </TouchableOpacity>
                    </View>
                    {budgets.slice(0, 3).map(b => {
                        const cat = getCat(b.category_id);
                        const pct = b.amount > 0 ? Math.min(b.spent / b.amount, 1) : 0;
                        const over = b.spent > b.amount;
                        return (
                            <View key={b.id} style={styles.budgetItem}>
                                <View style={styles.budgetItemHeader}>
                                    <View style={[styles.catDot, { backgroundColor: cat?.color || colors.secondary }]} />
                                    <Text style={styles.budgetName}>{cat?.name || 'Categoria'}</Text>
                                    <Text style={[styles.budgetPct, { color: over ? colors.danger : colors.income }]}>{(pct * 100).toFixed(0)}%</Text>
                                </View>
                                <View style={styles.progressBg}>
                                    <View style={[styles.progressFg, { width: `${pct * 100}%` as any, backgroundColor: over ? colors.danger : colors.income }]} />
                                </View>
                                <Text style={styles.budgetSub}>{fmt(b.spent)} de {fmt(b.amount)}</Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Recent Transactions */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Últimas Transações</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/transactions' as any)}>
                        <Text style={styles.seeAll}>Ver todas</Text>
                    </TouchableOpacity>
                </View>
                {transactions.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
                        <Text style={styles.emptyText}>Nenhuma transação neste mês</Text>
                        <TouchableOpacity onPress={() => router.push('/transaction/new?type=expense' as any)} style={styles.emptyBtn}>
                            <Text style={styles.emptyBtnTxt}>Adicionar transação</Text>
                        </TouchableOpacity>
                    </View>
                ) : transactions.map(tx => {
                    const cat = getCat(tx.category_id);
                    return (
                        <TouchableOpacity key={tx.id} style={styles.txRow} onPress={() => router.push(`/transaction/${tx.id}` as any)}>
                            <View style={[styles.txIcon, { backgroundColor: (cat?.color || colors.textMuted) + '15' }]}>
                                <Ionicons name={(cat?.icon || 'ellipsis-horizontal') as any} size={18} color={cat?.color || colors.textMuted} />
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                <Text style={styles.txCat}>{cat?.name || 'Sem categoria'}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.income : colors.expense }]}>
                                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
    greeting: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    greetingSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    avatarText: { color: colors.white, fontWeight: '800', fontSize: 16 },

    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
    monthArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    monthLabel: { fontSize: 14, fontWeight: '800', color: colors.text, width: 90, textAlign: 'center' },

    balanceCard: {
        marginHorizontal: 20, borderRadius: 32,
        backgroundColor: colors.primary,
        padding: 28, marginBottom: 24,
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10
    },
    balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    balanceLabel: { fontSize: 13, color: colors.white + 'A0', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue: { fontSize: 36, fontWeight: '900', color: colors.white, letterSpacing: -1 },
    eyeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white + '20', borderRadius: 12 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    balanceItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    balanceDivider: { width: 1, height: 36, backgroundColor: colors.white + '30', marginHorizontal: 8 },
    incBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white + '20', alignItems: 'center', justifyContent: 'center' },
    expBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white + '20', alignItems: 'center', justifyContent: 'center' },
    balanceItemLabel: { fontSize: 11, color: colors.white + '90', fontWeight: '700', textTransform: 'uppercase' },
    balanceItemVal: { fontSize: 16, fontWeight: '900', color: colors.white, marginTop: 1 },
    savingsRow: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    savingsLabel: { fontSize: 11, color: colors.white + 'D0', fontWeight: '800' },
    savingsBar: { height: 8, backgroundColor: colors.white + '20', borderRadius: 4, overflow: 'hidden' },
    savingsFill: { height: '100%', backgroundColor: colors.white, borderRadius: 4 },

    quickRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 28 },
    quickItem: { flex: 1, alignItems: 'center', gap: 10 },
    quickIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    quickLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '800' },

    chartCard: { marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 28, padding: 24, marginBottom: 28, borderWidth: 1, borderColor: colors.border },

    section: { paddingHorizontal: 20, marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    seeAll: { fontSize: 13, color: colors.primary, fontWeight: '800' },

    accCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, marginRight: 14, minWidth: 160, borderTopWidth: 6, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    accName: { fontSize: 13, color: colors.textMuted, marginTop: 12, marginBottom: 4, fontWeight: '700' },
    accBalance: { fontSize: 17, fontWeight: '900' },

    budgetItem: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border, gap: 12 },
    budgetItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    catDot: { width: 12, height: 12, borderRadius: 6 },
    budgetName: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '800' },
    budgetPct: { fontSize: 15, fontWeight: '900' },
    progressBg: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
    progressFg: { height: '100%', borderRadius: 4 },
    budgetSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

    emptyBox: { backgroundColor: colors.surface, borderRadius: 28, padding: 40, alignItems: 'center', gap: 18, borderWidth: 1, borderColor: colors.border },
    emptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
    emptyBtn: { backgroundColor: colors.primary + '15', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.primary + '30' },
    emptyBtnTxt: { color: colors.primary, fontWeight: '800', fontSize: 15 },

    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12, gap: 16, borderWidth: 1, borderColor: colors.border },
    txIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 16, fontWeight: '800', color: colors.text },
    txCat: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
    txAmount: { fontSize: 16, fontWeight: '900' },
});
