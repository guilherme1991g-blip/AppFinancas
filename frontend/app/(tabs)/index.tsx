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
    const [overdueTransactions, setOverdueTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);

    async function fetchData() {
        try {
            const [s, txs, accs, cats, buds, overdue] = await Promise.all([
                api.getSummary({ month, year }) as Promise<any>,
                api.getTransactions({ month, year, limit: 5 }) as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
                api.getBudgets({ month, year }) as Promise<any[]>,
                api.getTransactions({ is_paid: false, type: 'expense', limit: 10 }) as Promise<any[]>,
            ]);
            setSummary(s); setTransactions(txs); setAccounts(accs);
            setCategories(cats); setBudgets(buds);

            // Filter only those that are truly overdue (date < today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setOverdueTransactions(overdue.filter(t => new Date(t.date) < today));
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
                    { icon: 'arrow-down-circle', label: 'Receita', color: colors.income, route: '/transaction/new?type=income' },
                    { icon: 'arrow-up-circle', label: 'Despesa', color: colors.expense, route: '/transaction/new?type=expense' },
                    { icon: 'swap-horizontal', label: 'Transferir', color: colors.secondary, route: '/transfer/new' },
                ].map(a => (
                    <TouchableOpacity key={a.label} style={styles.quickItem} onPress={() => router.push(a.route as any)}>
                        <View style={[styles.quickIcon, { backgroundColor: a.color + '15' }]}>
                            <Ionicons name={a.icon as any} size={26} color={a.color} />
                        </View>
                        <Text style={styles.quickLabel}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Credit Cards Highlight Card */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Meus Cartões</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/cards' as any)}>
                        <Text style={styles.seeAll}>Gerenciar</Text>
                    </TouchableOpacity>
                </View>

                {accounts.filter(acc => acc.type === 'credit_card').length === 0 ? (
                    <TouchableOpacity style={styles.cardsPrimaryCard} onPress={() => router.push('/(tabs)/cards' as any)}>
                        <View style={styles.cardsIconCircle}>
                            <Ionicons name="card" size={28} color={colors.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardsCardTitle}>Nenhum cartão</Text>
                            <Text style={styles.cardsCardSub}>Toque para cadastrar seu primeiro cartão de crédito.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {accounts.filter(acc => acc.type === 'credit_card').map(card => (
                            <TouchableOpacity
                                key={card.id}
                                style={[styles.miniCreditCard, { backgroundColor: card.color || colors.primary }]}
                                onPress={() => router.push('/(tabs)/cards' as any)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardChip} />
                                    <Text style={styles.cardBrand}>CARD</Text>
                                </View>
                                <View>
                                    <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
                                    <Text style={styles.cardBalance}>{fmt(card.balance)}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.addCardMini}
                            onPress={() => router.push('/account/new?type=credit_card' as any)}
                        >
                            <Ionicons name="add" size={24} color={colors.textMuted} />
                            <Text style={styles.addCardTxt}>Novo Cartão</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </View>


            {/* Overdue Expenses */}
            {overdueTransactions.length > 0 && (
                <View style={[styles.section, { marginBottom: 12 }]}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="alert-circle" size={20} color={colors.expense} />
                            <Text style={[styles.sectionTitle, { color: colors.expense }]}>Despesas Vencidas</Text>
                        </View>
                        <Text style={[styles.overdueCount, { color: colors.expense }]}>{overdueTransactions.length}</Text>
                    </View>
                    {overdueTransactions.map(tx => {
                        const cat = getCat(tx.category_id);
                        return (
                            <TouchableOpacity key={tx.id} style={styles.overdueRow} onPress={() => router.push(`/transaction/${tx.id}` as any)}>
                                <View style={[styles.txIcon, { backgroundColor: colors.expense + '15' }]}>
                                    <Ionicons name={(cat?.icon || 'alert-circle-outline') as any} size={18} color={colors.expense} />
                                </View>
                                <View style={styles.txInfo}>
                                    <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                    <Text style={[styles.txDate, { color: colors.expense }]}>Venceu em {new Date(tx.date).toLocaleDateString('pt-BR')}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Text style={[styles.txAmount, { color: colors.expense }]}>{fmt(tx.amount)}</Text>
                                    <TouchableOpacity
                                        style={styles.payNowBtn}
                                        onPress={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                await api.payTransaction(tx.id);
                                                fetchData();
                                            } catch (err: any) {
                                                alert(err.message);
                                            }
                                        }}
                                    >
                                        <Text style={styles.payNowTxt}>Pagar</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Budgets overview */}
            {budgets.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Metas</Text>
                        <TouchableOpacity onPress={() => router.push('/budget/new' as any)}>
                            <Text style={styles.seeAll}>+ Nova</Text>
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

    cardsPrimaryCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
        borderRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4
    },
    cardsIconCircle: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    cardsCardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    cardsCardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18, fontWeight: '500' },

    miniCreditCard: {
        width: 180, height: 110, borderRadius: 24, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
        justifyContent: 'space-between'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardBrand: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    cardChip: { width: 32, height: 24, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 8 },
    cardName: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    cardBalance: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 2 },
    addCardMini: {
        width: 120, height: 110, borderRadius: 24, backgroundColor: colors.surface,
        borderWidth: 2, borderColor: colors.border, borderStyle: 'dotted',
        alignItems: 'center', justifyContent: 'center', gap: 8
    },
    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    seeAll: { fontSize: 13, color: colors.primary, fontWeight: '800' },

    overdueCount: { fontSize: 13, fontWeight: '800', backgroundColor: colors.expense + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    overdueRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: colors.expense + '30' },
    txDate: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    payNowBtn: { backgroundColor: colors.expense, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    payNowTxt: { color: colors.white, fontSize: 11, fontWeight: '800' },

    txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 15, fontWeight: '800', color: colors.text },
    txAmount: { fontSize: 15, fontWeight: '900' },

    budgetItem: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border, gap: 12 },
    budgetItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    catDot: { width: 12, height: 12, borderRadius: 6 },
    budgetName: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '800' },
    budgetPct: { fontSize: 15, fontWeight: '900' },
    progressBg: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
    progressFg: { height: '100%', borderRadius: 4 },
    budgetSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
