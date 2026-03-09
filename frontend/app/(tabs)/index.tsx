import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    RefreshControl, ActivityIndicator, Dimensions, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Svg, G, Path, Circle } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/services/api';
import { getBrand } from '@/constants/Brands';
import PaymentModal from '@/components/PaymentModal';

const { width } = Dimensions.get('window');
const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SHORT_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const MONTHS: Record<string, string[]> = { 'pt-BR': MONTH_NAMES_PT, 'en': MONTH_NAMES_EN, 'es': MONTH_NAMES_ES };
const MONTHS_SHORT: Record<string, string[]> = { 'pt-BR': MONTH_SHORT_PT, 'en': MONTH_SHORT_EN, 'es': MONTH_SHORT_ES };

function BrandLogo({ brand, color, size = 28 }: { brand: any, color: string, size?: number }) {
    if (brand.logo) {
        return (
            <Image
                source={brand.logo}
                style={{ width: size, height: size }}
                resizeMode="contain"
            />
        );
    }
    return <Ionicons name={brand.icon || "card"} size={size * 0.8} color={color} />;
}



export default function DashboardScreen() {
    const { user } = useAuth();
    const { mode, colors } = useTheme();
    const { t, fmt, language } = useLocale();
    const monthNames = MONTHS[language] || MONTHS['pt-BR'];
    const monthShort = MONTHS_SHORT[language] || MONTHS_SHORT['pt-BR'];
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
    const [upcomingTransactions, setUpcomingTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [cardIndex, setCardIndex] = useState(0);
    const [ccCardIndex, setCcCardIndex] = useState(0);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [dashboardCards, setDashboardCards] = useState<any[]>([]);

    async function fetchData() {
        try {
            const [s, txs, accs, cats, buds, overdue, byCat, prefs] = await Promise.all([
                api.getSummary({ month, year }) as Promise<any>,
                api.getTransactions({ month, year, limit: 5 }) as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
                api.getBudgets({ month, year }) as Promise<any[]>,
                api.getTransactions({ is_paid: false, type: 'expense', limit: 10 }) as Promise<any[]>,
                api.getByCategory({ month, year, type: 'expense', is_paid: true }) as Promise<any[]>,
                api.getPreferences() as Promise<any>,
            ]);
            setSummary(s); setTransactions(txs); setAccounts(accs);
            setCategories(cats); setBudgets(buds); setByCategory(byCat);

            // Split overdue vs upcoming
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const in7Days = new Date();
            in7Days.setDate(today.getDate() + 7);
            in7Days.setHours(23, 59, 59, 999);

            setOverdueTransactions(overdue.filter(t => new Date(t.date) < today));
            setUpcomingTransactions(overdue.filter(t => {
                const d = new Date(t.date);
                return d >= today && d <= in7Days;
            }));

            const defaultCards = [
                { id: 'balance', enabled: true, order: 0 },
                { id: 'summary', enabled: true, order: 1 },
                { id: 'cards', enabled: true, order: 2 },
                { id: 'overdue_bills', enabled: true, order: 3 },
                { id: 'upcoming_bills', enabled: true, order: 4 },
                { id: 'transactions', enabled: true, order: 5 },
                { id: 'goals', enabled: false, order: 6 },
                { id: 'spending_categories', enabled: false, order: 7 },
                { id: 'budget_progress', enabled: false, order: 8 },
            ];

            if (prefs?.dashboard_cards && prefs.dashboard_cards.length > 0) {
                const existingIds = new Set(prefs.dashboard_cards.map((c: any) => c.id));
                const missingCards = defaultCards.filter(c => !existingIds.has(c.id));
                const combined = [...prefs.dashboard_cards, ...missingCards];

                // Remove duplicates if any (e.g. if overdue_bills was already there but not in defaultCards set previously)
                const uniqueCombined = Array.from(new Map(combined.map(c => [c.id, c])).values());
                setDashboardCards(uniqueCombined.sort((a, b: any) => a.order - b.order));
            } else {
                setDashboardCards(defaultCards);
            }
        } catch (e) {
            console.error("Dashboard fetchData error:", e);
            Alert.alert(t('common.error'), 'Não foi possível carregar os dados do dashboard.');
        }
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

    function renderCard(card: any) {
        if (!card.enabled) return null;

        switch (card.id) {
            case 'balance':
                return (
                    <View key="balance" style={{ width }}>
                        <View style={styles.balanceCard}>
                            <View style={styles.balanceTop}>
                                <View>
                                    <Text style={styles.balanceLabel}>{t('home.total_balance')}</Text>
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
                                        <Text style={styles.balanceItemLabel}>{t('home.income')}</Text>
                                        <Text style={styles.balanceItemVal}>{fmt(Math.abs(summary?.income || 0))}</Text>
                                    </View>
                                </View>
                                <View style={styles.balanceDivider} />
                                <View style={styles.balanceItem}>
                                    <View style={styles.expBadge}>
                                        <Ionicons name="arrow-up" size={12} color="#FFF" />
                                    </View>
                                    <View>
                                        <Text style={styles.balanceItemLabel}>{t('home.expense')}</Text>
                                        <Text style={styles.balanceItemVal}>{fmt(Math.abs(summary?.expense || 0))}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.savingsRow}>
                                <Text style={styles.savingsLabel}>Taxa de poupança: {savingsRate.toFixed(0)}%</Text>
                            </View>
                            <View style={styles.savingsBar}>
                                <View style={[styles.savingsFill, { width: `${savingsRate}%` as any }]} />
                            </View>
                        </View>
                    </View>
                );

            case 'summary':
                return (
                    <View key="summary" style={{ width }}>
                        <View style={styles.forecastCard}>
                            <View style={styles.forecastTop}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="trending-up" size={18} color={colors.primary} />
                                    <Text style={styles.forecastTitle}>{t('dashboard.card_summary')}</Text>
                                </View>
                                <Text style={styles.forecastDate}>{monthShort[month - 1]} {year}</Text>
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
                );

            case 'cards':
                const creditCards = accounts.filter(acc => acc.type === 'credit_card');
                return (
                    <View key="cards" style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('home.my_cards')}</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/cards' as any)}>
                                <Text style={styles.seeAll}>{t('home.manage')}</Text>
                            </TouchableOpacity>
                        </View>
                        {creditCards.length === 0 ? (
                            <TouchableOpacity style={styles.cardsPrimaryCard} onPress={() => router.push('/(tabs)/cards' as any)}>
                                <View style={styles.cardsIconCircle}>
                                    <Ionicons name="card" size={28} color={colors.white} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardsCardTitle}>{t('home.no_cards')}</Text>
                                    <Text style={styles.cardsCardSub}>Toque para cadastrar seu primeiro cartão.</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        ) : (
                            <View>
                                <ScrollView
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={(e) => {
                                        const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                                        setCcCardIndex(idx);
                                    }}
                                >
                                    {creditCards.map(card => {
                                        const today = new Date().getDate();
                                        const cDay = card.closing_day || 25;
                                        const dDay = card.due_day || 5;
                                        const limit = card.credit_limit || 0;
                                        const available = limit + (card.balance || 0);
                                        let isClosed = dDay > cDay ? (today > cDay && today <= dDay) : (today > cDay || today <= dDay);
                                        return (
                                            <View key={card.id} style={{ width: width - 40, paddingRight: 10 }}>
                                                <TouchableOpacity
                                                    activeOpacity={0.9}
                                                    style={[styles.ccItem, { borderLeftColor: card.color || colors.primary }]}
                                                    onPress={() => router.push({ pathname: '/cards/bills', params: { id: card.id, name: card.name } })}
                                                >
                                                    <View style={styles.ccHeader}>
                                                        <View style={[styles.ccIcon, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border }]}>
                                                            <BrandLogo brand={getBrand(card.card_brand || '')} color={card.color || colors.primary} />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.ccName} numberOfLines={1}>{card.name}</Text>
                                                            <Text style={styles.ccBrand}>{getBrand(card.card_brand || '').label} •••• {card.last_digits || '0000'}</Text>
                                                        </View>
                                                        <View style={[styles.ccStatus, { backgroundColor: isClosed ? colors.expense + '15' : colors.income + '15' }]}>
                                                            <Text style={[styles.ccStatusTxt, { color: isClosed ? colors.expense : colors.income }]}>
                                                                {isClosed ? 'Fechada' : 'Aberta'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.ccMain}>
                                                        <View>
                                                            <Text style={styles.ccLabel}>Fatura Atual</Text>
                                                            <Text style={styles.ccValue}>{fmt(summary?.credit_cards?.find((c: any) => c.account_id === card.id)?.bill_total || 0)}</Text>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={styles.ccLabel}>Vencimento</Text>
                                                            <Text style={styles.ccValueSmall}>Dia {String(dDay).padStart(2, '0')}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.ccFooter}>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                <Text style={styles.limitLabel}>Limite Disponível</Text>
                                                                <Text style={styles.limitValue}>{fmt(available)}</Text>
                                                            </View>
                                                            <View style={styles.limitBarBg}>
                                                                <View style={[styles.limitBarFg, { width: `${limit > 0 ? (available / limit) * 100 : 0}%` as any, backgroundColor: card.color || colors.primary }]} />
                                                            </View>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                                {creditCards.length > 1 && (
                                    <View style={[styles.dotsRow, { marginTop: 12, marginBottom: 0 }]}>
                                        {creditCards.map((_, i) => (
                                            <View key={i} style={[styles.dot, ccCardIndex === i && styles.dotActive]} />
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                );

            case 'overdue_bills':
                if (overdueTransactions.length === 0) return null;
                return (
                    <View key="overdue_bills" style={[styles.section, { marginBottom: 12 }]}>
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="alert-circle" size={20} color={colors.expense} />
                                <Text style={[styles.sectionTitle, { color: colors.expense }]}>{t('dashboard.card_overdue_bills')}</Text>
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
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setSelectedItem(tx);
                                                setShowPaymentModal(true);
                                            }}
                                        >
                                            <Text style={styles.payNowTxt}>Pagar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );

            case 'upcoming_bills':
                if (upcomingTransactions.length === 0) return null;
                return (
                    <View key="upcoming_bills" style={[styles.section, { marginBottom: 12 }]}>
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('dashboard.card_upcoming_bills')}</Text>
                            </View>
                            <Text style={[styles.overdueCount, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>{upcomingTransactions.length}</Text>
                        </View>
                        {upcomingTransactions.map(tx => {
                            const cat = getCat(tx.category_id);
                            return (
                                <TouchableOpacity key={tx.id} style={[styles.overdueRow, { borderColor: colors.border }]} onPress={() => router.push(`/transaction/${tx.id}` as any)}>
                                    <View style={[styles.txIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name={(cat?.icon || 'calendar-outline') as any} size={18} color={colors.primary} />
                                    </View>
                                    <View style={styles.txInfo}>
                                        <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                        <Text style={[styles.txDate, { color: colors.textSecondary }]}>Vence em {new Date(tx.date).toLocaleDateString('pt-BR')}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <Text style={[styles.txAmount, { color: colors.text }]}>{fmt(tx.amount)}</Text>
                                        <TouchableOpacity
                                            style={[styles.payNowBtn, { backgroundColor: colors.primary }]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setSelectedItem(tx);
                                                setShowPaymentModal(true);
                                            }}
                                        >
                                            <Text style={styles.payNowTxt}>Pagar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );

            case 'spending_categories':
                return (
                    <View key="spending_categories" style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('dashboard.card_spending_categories')}</Text>
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
                                    <View style={styles.chartWrapper}>
                                        <Svg width={180} height={180} viewBox="0 0 100 100">
                                            <G rotation="-90" origin="50, 50">
                                                {(() => {
                                                    let currentAngle = 0;
                                                    const totalExpense = summary?.expense || 1;
                                                    return byCategory.map((cat, idx) => {
                                                        const pct = (cat.total / totalExpense);
                                                        const angle = pct * 360;
                                                        const x1 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
                                                        const y1 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
                                                        currentAngle += angle;
                                                        const x2 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
                                                        const y2 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
                                                        const largeArc = angle > 180 ? 1 : 0;
                                                        const d = `M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2}`;
                                                        return (
                                                            <Path key={cat.category_id} d={d} fill="none" stroke={cat.category_color} strokeWidth="12" strokeLinecap="round" />
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
                                    <View style={styles.legendContainer}>
                                        {byCategory.slice(0, 4).map((cat) => {
                                            const totalCat = byCategory.reduce((acc, c) => acc + c.total, 0);
                                            const pct = totalCat > 0 ? (cat.total / totalCat) * 100 : 0;
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
                );

            case 'budget_progress':
                const totalTarget = budgets.reduce((acc, b) => acc + b.amount, 0);
                const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
                const totalPct = totalTarget > 0 ? Math.min(totalSpent / totalTarget, 1) : 0;
                const totalOver = totalSpent > totalTarget;
                return (
                    <View key="budget_progress" style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Saúde das Metas</Text>
                                <Text style={styles.greetingSub}>{budgets.length === 0 ? 'Defina metas para economizar' : (totalOver ? 'Você ultrapassou o planejado' : 'Dentro do orçamento esperado')}</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/budget/new' as any)}>
                                <Text style={styles.seeAll}>+ Nova</Text>
                            </TouchableOpacity>
                        </View>
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
                    </View>
                );

            case 'transactions':
                return (
                    <View key="transactions" style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('dashboard.card_transactions')}</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions' as any)}>
                                <Text style={styles.seeAll}>Ver tudo</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.spendingCard}>
                            {transactions.length === 0 ? (
                                <View style={styles.emptyInternal}>
                                    <Ionicons name="swap-horizontal-outline" size={24} color={colors.textMuted} />
                                    <Text style={styles.emptyInternalTxt}>Nenhuma transação recente</Text>
                                </View>
                            ) : (
                                transactions.map((tx, idx) => {
                                    const cat = getCat(tx.category_id);
                                    return (
                                        <TouchableOpacity key={tx.id} style={[styles.overdueRow, { borderColor: colors.border, marginBottom: idx === transactions.length - 1 ? 0 : 10 }]} onPress={() => router.push(`/transaction/${tx.id}` as any)}>
                                            <View style={[styles.txIcon, { backgroundColor: (tx.type === 'income' ? colors.income : colors.expense) + '15' }]}>
                                                <Ionicons name={(cat?.icon || 'cash-outline') as any} size={18} color={tx.type === 'income' ? colors.income : colors.expense} />
                                            </View>
                                            <View style={styles.txInfo}>
                                                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                                <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString('pt-BR')}</Text>
                                            </View>
                                            <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.income : colors.expense }]}>{tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}</Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    </View>
                );

            case 'goals':
                return (
                    <View key="goals" style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('dashboard.card_goals')}</Text>
                            <TouchableOpacity onPress={() => router.push('/goals' as any)}>
                                <Text style={styles.seeAll}>Ver todos</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.healthCard} onPress={() => router.push('/goals/new' as any)}>
                            <View style={styles.emptyInternal}>
                                <Ionicons name="trophy-outline" size={32} color={colors.primary} />
                                <Text style={styles.emptyInternalTxt}>Planeje seu futuro criando um objetivo.</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                );

            default: return null;
        }
    }

    if (loading) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={colors.primary} size="large" />
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingTop: Math.max(insets.top, 20), paddingBottom: 100 + insets.bottom }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
                    <Text style={styles.greetingSub}>{monthNames[month - 1]} {year}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                        style={styles.notifBtn}
                        onPress={() => router.push('/notifications' as any)}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        {(overdueTransactions.length > 0) && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{overdueTransactions.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/more')}>
                        <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Premium Banner */}
            {user?.trial_active && (
                <TouchableOpacity
                    style={styles.premiumBanner}
                    onPress={() => router.push('/(tabs)/more')}
                    activeOpacity={0.9}
                >
                    <View style={styles.premiumBannerContent}>
                        <View style={styles.premiumIconWrap}>
                            <Ionicons name="sparkles" size={20} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.premiumTitle}>Período Premium Ativo!</Text>
                            <Text style={styles.premiumSub}>
                                Você tem {user.trial_days_left} {user.trial_days_left === 1 ? 'dia' : 'dias'} de acesso total. Aproveite!
                            </Text>
                        </View>
                        <Ionicons name="star" size={24} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', right: -10, top: -5 }} />
                    </View>
                </TouchableOpacity>
            )}

            {/* Month selector */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}><Ionicons name="chevron-back" size={18} color={colors.text} /></TouchableOpacity>
                <Text style={styles.monthLabel}>{monthShort[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}><Ionicons name="chevron-forward" size={18} color={colors.text} /></TouchableOpacity>
            </View>

            {/* Dynamic Dashboard Cards */}
            {dashboardCards.filter(c => c.enabled).map((card, idx, filtered) => {
                // Special handling for 'balance' and 'summary' cards to be in a single scroll view
                if (card.id === 'balance' || card.id === 'summary') {
                    // We only want to render this ScrollView once, when we first encounter either 'balance' or 'summary'
                    // Check if this is the first occurrence of either in the filtered list
                    const firstCarouselCard = filtered.find(c => c.id === 'balance' || c.id === 'summary');
                    if (card === firstCarouselCard) {
                        const carouselCards = filtered.filter(c => c.id === 'balance' || c.id === 'summary');
                        return (
                            <View key="balance_summary_carousel">
                                <ScrollView
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={(e: any) => {
                                        const idx_scroll = Math.round(e.nativeEvent.contentOffset.x / width);
                                        setCardIndex(idx_scroll);
                                    }}
                                >
                                    {carouselCards.map(renderCard)}
                                </ScrollView>
                                {/* Pagination Dots */}
                                {carouselCards.length > 1 && (
                                    <View style={styles.dotsRow}>
                                        {carouselCards.map((_, i) => (
                                            <View key={i} style={[styles.dot, cardIndex === i && styles.dotActive]} />
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    }
                    return null;
                }
                return renderCard(card);
            })}

            <View style={{ height: 100 }} />

            <PaymentModal
                visible={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={() => fetchData()}
                initialAmount={selectedItem?.amount || 0}
                title="Pagar Despesa"
                type="transaction"
                id={selectedItem?.id || ''}
            />
        </ScrollView >
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
    greeting: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    greetingSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    avatarText: { color: colors.white, fontWeight: '800', fontSize: 16 },
    notifBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.expense, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background, paddingHorizontal: 4 },
    notifBadgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },

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

    ccItem: { backgroundColor: colors.surface, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 6 },
    ccHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    ccIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    ccName: { fontSize: 17, fontWeight: '800', color: colors.text },
    ccBrand: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
    ccStatus: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    ccStatusTxt: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    ccMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
    ccLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    ccValue: { fontSize: 24, fontWeight: '900', color: colors.text },
    ccValueSmall: { fontSize: 18, fontWeight: '800', color: colors.text },
    ccFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
    limitLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    limitValue: { fontSize: 11, fontWeight: '800', color: colors.text },
    limitBarBg: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
    limitBarFg: { height: '100%', borderRadius: 3 },

    section: { paddingHorizontal: 20, marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    seeAll: { fontSize: 13, color: colors.primary, fontWeight: '800' },
    spendingCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border },

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

    premiumBanner: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        backgroundColor: '#8B5CF6', // Purple Premium
        padding: 16,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        overflow: 'hidden',
    },
    premiumBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    premiumIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFF',
    },
    premiumSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginTop: 2,
    },
});
