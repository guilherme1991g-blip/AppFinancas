import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Svg, G, Path, Circle } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Função unificada para formatar valores, tratando o sinal de menos.
function fmt(v: number) {
    const absValue = Math.abs(v);
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(absValue);
    // Só adicionamos o sinal de menos se o valor real for negativo (crédito no cartão)
    return v < 0 ? `-${formatted}` : formatted;
}


export default function DashboardScreen() {
    const { user } = useAuth();
    const { mode, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [summary, setSummary] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [byCategory, setByCategory] = useState<any[]>([]);
    const [overdueTransactions, setOverdueTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [cardIndex, setCardIndex] = useState(0);

    async function fetchData() {
        try {
            const [s, txs, accs, cats, buds, overdue, byCat] = await Promise.all([
                api.getSummary({ month, year }) as Promise<any>,
                api.getTransactions({ month, year, limit: 5 }) as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
                api.getBudgets({ month, year }) as Promise<any[]>,
                api.getTransactions({ is_paid: false, type: 'expense', limit: 10 }) as Promise<any[]>,
                api.getByCategory({ month, year, type: 'expense' }) as Promise<any[]>,
            ]);
            setSummary(s); setTransactions(txs); setAccounts(accs);
            setCategories(cats); setBudgets(buds); setByCategory(byCat.slice(0, 4));

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
            contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) }}
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

            {/* Cards Carousel */}
            <View>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                        setCardIndex(idx);
                    }}
                >
                    {/* Balance Card */}
                    <View style={{ width }}>
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
                                        <Text style={styles.balanceItemVal}>{fmt(Math.abs(summary?.income || 0))}</Text>
                                    </View>
                                </View>
                                <View style={styles.balanceDivider} />
                                <View style={styles.balanceItem}>
                                    <View style={styles.expBadge}>
                                        <Ionicons name="arrow-up" size={12} color="#FFF" />
                                    </View>
                                    <View>
                                        <Text style={styles.balanceItemLabel}>Despesas</Text>
                                        <Text style={styles.balanceItemVal}>{fmt(Math.abs(summary?.expense || 0))}</Text>
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
                    </View>

                    {/* Monthly Forecast Card */}
                    <View style={{ width }}>
                        <View style={styles.forecastCard}>
                            <View style={styles.forecastTop}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="trending-up" size={18} color={colors.primary} />
                                    <Text style={styles.forecastTitle}>Previsão do Mês</Text>
                                </View>
                                <Text style={styles.forecastDate}>{MONTH_SHORT[month - 1]} {year}</Text>
                            </View>
                            <View style={styles.forecastMain}>
                                <Text style={styles.forecastValue}>{fmt(summary?.forecast || 0)}</Text>
                                <Text style={styles.forecastSub}>Saldo projetado se tudo for recebido/pago</Text>
                            </View>
                            <View style={styles.forecastDetails}>
                                <View style={styles.forecastDetailItem}>
                                    <Text style={styles.forecastDetailLabel}>A RECEBER</Text>
                                    <Text style={[styles.forecastDetailVal, { color: colors.income }]}>{fmt(Math.abs(summary?.pending_income || 0))}</Text>
                                </View>
                                <View style={styles.forecastDetailDivider} />
                                <View style={styles.forecastDetailItem}>
                                    <Text style={styles.forecastDetailLabel}>A PAGAR</Text>
                                    <Text style={[styles.forecastDetailVal, { color: colors.expense }]}>{fmt(Math.abs(summary?.pending_expense || 0))}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Pagination Dots */}
                <View style={styles.dotsRow}>
                    {[0, 1].map(i => (
                        <View key={i} style={[styles.dot, cardIndex === i && styles.dotActive]} />
                    ))}
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

            {/* Credit Cards Highlight Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cartões de Crédito</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/cards' as any)}>
                        <Text style={styles.seeAll}>Gerenciar</Text>
                    </TouchableOpacity>
                </View>

                {(() => {
                    const creditCards = accounts.filter(acc => acc.type === 'credit_card');
                    if (creditCards.length === 0) {
                        return (
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
                        );
                    }

                    return (
                        <View style={styles.invoiceList}>
                            {creditCards.map(card => {
                                const today = new Date().getDate();
                                const cDay = card.closing_day || 25;
                                const dDay = card.due_day || 5;

                                // Simple logic: if between closing and due, it's CLOSED. 
                                // Else it's OPEN (spending for next cycle or current till close)
                                let isClosed = false;
                                if (dDay > cDay) {
                                    isClosed = today > cDay && today <= dDay;
                                } else {
                                    // Crosses month boundary (e.g close 25, due 05)
                                    isClosed = today > cDay || today <= dDay;
                                }

                                return (
                                    <TouchableOpacity
                                        key={card.id}
                                        style={styles.invoiceRow}
                                        onPress={() => router.push('/(tabs)/cards' as any)}
                                    >
                                        <View style={[styles.invoiceIcon, { backgroundColor: (card.color || colors.primary) + '15' }]}>
                                            <Ionicons name="card" size={20} color={card.color || colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.invoiceName}>{card.name}</Text>
                                            <Text style={styles.invoiceDue}>
                                                Vence dia {String(dDay).padStart(2, '0')}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.invoiceAmount}>{fmt(Math.abs(card.balance))}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: isClosed ? colors.expense + '15' : colors.income + '15' }]}>
                                                <Text style={[styles.statusText, { color: isClosed ? colors.expense : colors.income }]}>
                                                    Fatura {isClosed ? 'Fechada' : 'Aberta'}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    );
                })()}
            </View>

            {/* Overdue Expenses (Conditional) */}
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


            {/* Spending by Category Chart */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Distribuição de Gastos</Text>
                    <TouchableOpacity onPress={() => router.push('/tools/analytics' as any)}>
                        <Text style={styles.seeAll}>Ver tudo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.spendingCard}>
                    {byCategory.length === 0 ? (
                        <View style={styles.emptyInternal}>
                            <Ionicons name="pie-chart-outline" size={24} color={colors.textMuted} />
                            <Text style={styles.emptyInternalTxt}>Sem gastos nesta categoria no mês</Text>
                        </View>
                    ) : (
                        <View style={styles.chartContainer}>
                            {/* Modern Donut Chart */}
                            <View style={styles.chartWrapper}>
                                <Svg width={180} height={180} viewBox="0 0 100 100">
                                    <G rotation="-90" origin="50, 50">
                                        {(() => {
                                            let currentAngle = 0;
                                            const totalExpense = summary?.expense || 1;
                                            return byCategory.map((cat, idx) => {
                                                const pct = (cat.total / totalExpense);
                                                const angle = pct * 360;

                                                // Calculate path for the arc
                                                const x1 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
                                                const y1 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
                                                currentAngle += angle;
                                                const x2 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
                                                const y2 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);

                                                const largeArc = angle > 180 ? 1 : 0;
                                                const d = `M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2}`;

                                                return (
                                                    <Path
                                                        key={cat.category_id}
                                                        d={d}
                                                        fill="none"
                                                        stroke={cat.category_color}
                                                        strokeWidth="12"
                                                        strokeLinecap="round"
                                                    />
                                                );
                                            });
                                        })()}
                                        <Circle cx="50" cy="50" r="40" stroke={colors.border + '30'} strokeWidth="1" fill="none" />
                                    </G>
                                </Svg>
                                <View style={styles.chartCenter}>
                                    <Text style={styles.chartCenterLabel}>TOTAL</Text>
                                    <Text style={styles.chartCenterValue}>{fmt(summary?.expense || 0).split(',')[0]}</Text>
                                </View>
                            </View>

                            {/* Legend */}
                            <View style={styles.legendContainer}>
                                {byCategory.slice(0, 4).map((cat) => {
                                    const pct = summary?.expense > 0 ? (cat.total / summary.expense) * 100 : 0;
                                    return (
                                        <View key={cat.category_id} style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: cat.category_color }]} />
                                            <Text style={styles.legendName} numberOfLines={1}>{cat.category_name}</Text>
                                            <Text style={styles.legendPct}>{pct.toFixed(0)}%</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Budgets overview */}
            {(() => {
                const totalTarget = budgets.reduce((acc, b) => acc + b.amount, 0);
                const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
                const totalPct = totalTarget > 0 ? Math.min(totalSpent / totalTarget, 1) : 0;
                const totalOver = totalSpent > totalTarget;

                return (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Saúde das Metas</Text>
                                <Text style={styles.greetingSub}>
                                    {budgets.length === 0 ? 'Defina metas para economizar' : (totalOver ? 'Você ultrapassou o planejado' : 'Dentro do orçamento esperado')}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/budget/new' as any)}>
                                <Text style={styles.seeAll}>+ Nova</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Global Health Card */}
                        <View style={[styles.healthCard, { borderColor: totalOver ? colors.expense + '30' : colors.income + '30' }]}>
                            {budgets.length === 0 ? (
                                <View style={styles.emptyInternal}>
                                    <Ionicons name="flag-outline" size={24} color={colors.textMuted} />
                                    <Text style={styles.emptyInternalTxt}>Toque no "+" para criar sua primeira meta.</Text>
                                </View>
                            ) : (
                                <View style={styles.healthTop}>
                                    <View style={[styles.healthBadge, { backgroundColor: (totalOver ? colors.expense : colors.income) + '15' }]}>
                                        <Ionicons name={totalOver ? 'warning' : 'checkmark-circle'} size={24} color={totalOver ? colors.expense : colors.income} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <Text style={styles.healthVal}>{(totalPct * 100).toFixed(0)}%</Text>
                                            <Text style={styles.healthSub}>{fmt(totalSpent)} / {fmt(totalTarget)}</Text>
                                        </View>
                                        <View style={styles.healthBarBg}>
                                            <View style={[styles.healthBarFg, { width: `${totalPct * 100}%` as any, backgroundColor: totalOver ? colors.expense : colors.income }]} />
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>

                        {budgets.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 12, marginTop: 8 }]}>Destaques</Text>
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
                            </>
                        )}
                    </View>
                );
            })()}


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

    forecastCard: {
        marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 28,
        padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    forecastTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    forecastTitle: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' },
    forecastDate: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    forecastMain: { alignItems: 'center', marginBottom: 20 },
    forecastValue: { fontSize: 28, fontWeight: '900', color: colors.text },
    forecastSub: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
    forecastDetails: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 20, padding: 12 },
    forecastDetailItem: { flex: 1, alignItems: 'center' },
    forecastDetailDivider: { width: 1, height: '60%', backgroundColor: colors.border, alignSelf: 'center' },
    forecastDetailLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginBottom: 4 },
    forecastDetailVal: { fontSize: 14, fontWeight: '900' },

    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24, marginTop: -8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { width: 14, backgroundColor: colors.primary },

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

    invoiceList: { gap: 10 },
    invoiceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 16, borderWidth: 1, borderColor: colors.border },
    invoiceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    invoiceName: { fontSize: 16, fontWeight: '800', color: colors.text },
    invoiceDue: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    invoiceAmount: { fontSize: 16, fontWeight: '900', color: colors.text },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
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

    catPctText: { fontSize: 12, color: colors.textMuted, fontWeight: '800', width: 35, textAlign: 'right' },

    chartContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    chartWrapper: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
    chartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    chartCenterLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
    chartCenterValue: { fontSize: 20, fontWeight: '900', color: colors.text },
    legendContainer: { flex: 1, gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    legendPct: { fontSize: 13, fontWeight: '800', color: colors.text, width: 35, textAlign: 'right' },

    healthCard: { backgroundColor: colors.surface, borderRadius: 28, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    healthTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    healthBadge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    healthVal: { fontSize: 24, fontWeight: '900', color: colors.text },
    healthSub: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
    healthBarBg: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
    healthBarFg: { height: '100%', borderRadius: 4 },

    emptyInternal: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 10 },
    emptyInternalTxt: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },

    overdueEmpty: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.income + '30' },
    overdueEmptyTxt: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
});
