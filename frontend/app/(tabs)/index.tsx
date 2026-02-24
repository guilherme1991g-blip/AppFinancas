import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Dimensions
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// Simple bar chart component
function SpendingBar({ income, expense }: { income: number; expense: number }) {
    const max = Math.max(income, expense, 1);
    const incomeH = (income / max) * 80;
    const expenseH = (expense / max) * 80;
    return (
        <View style={bar.container}>
            <View style={bar.col}>
                <View style={[bar.fill, { height: incomeH, backgroundColor: '#00D09C' }]} />
                <Text style={bar.label}>Receita</Text>
            </View>
            <View style={bar.col}>
                <View style={[bar.fill, { height: expenseH, backgroundColor: '#FF6B6B' }]} />
                <Text style={bar.label}>Despesa</Text>
            </View>
        </View>
    );
}

const bar = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 100, paddingBottom: 20 },
    col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    fill: { width: '100%', borderRadius: 6, minHeight: 4 },
    label: { fontSize: 11, color: '#9CA3AF' },
});

export default function DashboardScreen() {
    const { user } = useAuth();
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

    if (loading) return (
        <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={Colors.primary} size="large" />
        </View>
    );

    return (
        <ScrollView
            style={s.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        >
            {/* Header */}
            <View style={s.header}>
                <View>
                    <Text style={s.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
                    <Text style={s.greetingSub}>{MONTH_NAMES[month - 1]} {year}</Text>
                </View>
                <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/(tabs)/more')}>
                    <Text style={s.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {/* Month selector */}
            <View style={s.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={s.monthArrow}>
                    <Ionicons name="chevron-back" size={18} color={Colors.text} />
                </TouchableOpacity>
                <Text style={s.monthLabel}>{MONTH_SHORT[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={s.monthArrow}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.text} />
                </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View style={s.balanceCard}>
                <View style={s.balanceTop}>
                    <View>
                        <Text style={s.balanceLabel}>Saldo Total</Text>
                        <Text style={s.balanceValue}>
                            {balanceVisible ? fmt(summary?.total_balance || 0) : '••••••'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setBalanceVisible(v => !v)} style={s.eyeBtn}>
                        <Ionicons name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="rgba(0,0,0,0.5)" />
                    </TouchableOpacity>
                </View>

                <View style={s.balanceRow}>
                    <View style={s.balanceItem}>
                        <View style={s.incBadge}>
                            <Ionicons name="arrow-down" size={12} color="#00D09C" />
                        </View>
                        <View>
                            <Text style={s.balanceItemLabel}>Receitas</Text>
                            <Text style={[s.balanceItemVal, { color: '#00D09C' }]}>{fmt(summary?.income || 0)}</Text>
                        </View>
                    </View>
                    <View style={s.balanceDivider} />
                    <View style={s.balanceItem}>
                        <View style={s.expBadge}>
                            <Ionicons name="arrow-up" size={12} color="#FF6B6B" />
                        </View>
                        <View>
                            <Text style={s.balanceItemLabel}>Despesas</Text>
                            <Text style={[s.balanceItemVal, { color: '#FF6B6B' }]}>{fmt(summary?.expense || 0)}</Text>
                        </View>
                    </View>
                </View>

                {/* Savings rate bar */}
                <View style={s.savingsRow}>
                    <Text style={s.savingsLabel}>Taxa de poupança: {savingsRate.toFixed(0)}%</Text>
                </View>
                <View style={s.savingsBar}>
                    <View style={[s.savingsFill, { width: `${savingsRate}%` as any }]} />
                </View>
            </View>

            {/* Quick Actions */}
            <View style={s.quickRow}>
                {[
                    { icon: 'add-circle', label: 'Receita', color: '#00D09C', route: '/transaction/new?type=income' },
                    { icon: 'remove-circle', label: 'Despesa', color: '#FF6B6B', route: '/transaction/new?type=expense' },
                    { icon: 'swap-horizontal', label: 'Transferir', color: '#6C5ECF', route: '/transfer/new' },
                    { icon: 'settings-outline', label: 'Config.', color: '#F59E0B', route: '/(tabs)/more' },
                ].map(a => (
                    <TouchableOpacity key={a.label} style={s.quickItem} onPress={() => router.push(a.route as any)}>
                        <View style={[s.quickIcon, { backgroundColor: a.color + '20' }]}>
                            <Ionicons name={a.icon as any} size={22} color={a.color} />
                        </View>
                        <Text style={s.quickLabel}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Charts */}
            <View style={s.chartCard}>
                <Text style={s.sectionTitle}>Receita vs Despesa</Text>
                <SpendingBar income={summary?.income || 0} expense={summary?.expense || 0} />
            </View>

            {/* Accounts */}
            {accounts.length > 0 && (
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Minhas Contas</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/accounts' as any)}>
                            <Text style={s.seeAll}>Ver todas</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {accounts.map(acc => (
                            <View key={acc.id} style={[s.accCard, { borderTopColor: acc.color }]}>
                                <Ionicons name={acc.icon || 'wallet'} size={20} color={acc.color} />
                                <Text style={s.accName} numberOfLines={1}>{acc.name}</Text>
                                <Text style={[s.accBalance, { color: acc.balance >= 0 ? '#00D09C' : '#FF6B6B' }]}>
                                    {balanceVisible ? fmt(acc.balance) : '••••'}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Budgets overview */}
            {budgets.length > 0 && (
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Orçamentos</Text>
                        <TouchableOpacity onPress={() => router.push('/budget/new' as any)}>
                            <Text style={s.seeAll}>+ Novo</Text>
                        </TouchableOpacity>
                    </View>
                    {budgets.slice(0, 3).map(b => {
                        const cat = getCat(b.category_id);
                        const pct = b.amount > 0 ? Math.min(b.spent / b.amount, 1) : 0;
                        const over = b.spent > b.amount;
                        return (
                            <View key={b.id} style={s.budgetItem}>
                                <View style={s.budgetItemHeader}>
                                    <View style={[s.catDot, { backgroundColor: cat?.color || Colors.secondary }]} />
                                    <Text style={s.budgetName}>{cat?.name || 'Categoria'}</Text>
                                    <Text style={[s.budgetPct, { color: over ? '#FF6B6B' : '#00D09C' }]}>{(pct * 100).toFixed(0)}%</Text>
                                </View>
                                <View style={s.progressBg}>
                                    <View style={[s.progressFg, { width: `${pct * 100}%` as any, backgroundColor: over ? '#FF6B6B' : '#00D09C' }]} />
                                </View>
                                <Text style={s.budgetSub}>{fmt(b.spent)} de {fmt(b.amount)}</Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Recent Transactions */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Últimas Transações</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/transactions' as any)}>
                        <Text style={s.seeAll}>Ver todas</Text>
                    </TouchableOpacity>
                </View>
                {transactions.length === 0 ? (
                    <View style={s.emptyBox}>
                        <Ionicons name="receipt-outline" size={36} color="#374151" />
                        <Text style={s.emptyText}>Nenhuma transação neste mês</Text>
                        <TouchableOpacity onPress={() => router.push('/transaction/new?type=expense' as any)} style={s.emptyBtn}>
                            <Text style={s.emptyBtnTxt}>Adicionar transação</Text>
                        </TouchableOpacity>
                    </View>
                ) : transactions.map(tx => {
                    const cat = getCat(tx.category_id);
                    return (
                        <TouchableOpacity key={tx.id} style={s.txRow} onPress={() => router.push(`/transaction/${tx.id}` as any)}>
                            <View style={[s.txIcon, { backgroundColor: (cat?.color || '#6B7280') + '20' }]}>
                                <Ionicons name={(cat?.icon || 'ellipsis-horizontal') as any} size={18} color={cat?.color || '#6B7280'} />
                            </View>
                            <View style={s.txInfo}>
                                <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                                <Text style={s.txCat}>{cat?.name || 'Sem categoria'}</Text>
                            </View>
                            <Text style={[s.txAmount, { color: tx.type === 'income' ? '#00D09C' : '#FF6B6B' }]}>
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

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0F1E' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
    greeting: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
    greetingSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    avatarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6C5ECF', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
    monthArrow: { padding: 8, backgroundColor: '#111827', borderRadius: 10 },
    monthLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', width: 80, textAlign: 'center' },

    balanceCard: {
        marginHorizontal: 20, borderRadius: 20,
        backgroundColor: '#00D09C',
        padding: 20, marginBottom: 20,
    },
    balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    balanceLabel: { fontSize: 13, color: 'rgba(0,0,0,0.6)', fontWeight: '500', marginBottom: 4 },
    balanceValue: { fontSize: 32, fontWeight: '800', color: '#000' },
    eyeBtn: { padding: 4 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    balanceItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    balanceDivider: { width: 1, height: 36, backgroundColor: 'rgba(0,0,0,0.2)', marginHorizontal: 16 },
    incBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
    expBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
    balanceItemLabel: { fontSize: 11, color: 'rgba(0,0,0,0.6)' },
    balanceItemVal: { fontSize: 14, fontWeight: '700' },
    savingsRow: { marginBottom: 6 },
    savingsLabel: { fontSize: 11, color: 'rgba(0,0,0,0.6)' },
    savingsBar: { height: 6, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 3, overflow: 'hidden' },
    savingsFill: { height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 3 },

    quickRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
    quickItem: { flex: 1, alignItems: 'center', gap: 6 },
    quickIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

    chartCard: { marginHorizontal: 20, backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },

    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    seeAll: { fontSize: 13, color: '#00D09C', fontWeight: '600' },

    accCard: { backgroundColor: '#111827', borderRadius: 14, padding: 14, marginRight: 12, minWidth: 130, borderTopWidth: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    accName: { fontSize: 12, color: '#9CA3AF', marginTop: 8, marginBottom: 4 },
    accBalance: { fontSize: 14, fontWeight: '700' },

    budgetItem: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 8 },
    budgetItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    budgetName: { flex: 1, fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
    budgetPct: { fontSize: 13, fontWeight: '700' },
    progressBg: { height: 5, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
    progressFg: { height: '100%', borderRadius: 3 },
    budgetSub: { fontSize: 11, color: '#6B7280' },

    emptyBox: { backgroundColor: '#111827', borderRadius: 14, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    emptyText: { color: '#6B7280', fontSize: 14 },
    emptyBtn: { backgroundColor: 'rgba(0,208,156,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,208,156,0.2)' },
    emptyBtnTxt: { color: '#00D09C', fontWeight: '600', fontSize: 13 },

    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
    txCat: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: '700' },
});
