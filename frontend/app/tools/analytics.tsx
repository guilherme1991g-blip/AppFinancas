import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Dimensions, Animated
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect, Line, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';

const { width: SCREEN_W } = Dimensions.get('window');

function fmtShort(v: number) {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toFixed(0);
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/* ──────────────── SVG Donut Chart ──────────────── */
function DonutChart({ data, size = 180, strokeWidth = 22, colors: themeColors }: { data: { label: string; value: number; color: string }[]; size?: number; strokeWidth?: number; colors: any }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let accumulated = 0;
    const arcs = data.map(d => {
        const pct = total > 0 ? d.value / total : 0;
        const dashArray = `${pct * circumference} ${circumference}`;
        const rotation = (accumulated / total) * 360 - 90;
        accumulated += d.value;
        return { ...d, pct, dashArray, rotation };
    });

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size}>
                {/* Background ring */}
                <Circle cx={center} cy={center} r={radius} stroke={themeColors.border} strokeWidth={strokeWidth} fill="none" opacity={0.5} />
                {arcs.map((arc, i) => (
                    <Circle
                        key={i}
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={arc.color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={arc.dashArray}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform={`rotate(${arc.rotation} ${center} ${center})`}
                    />
                ))}
            </Svg>
            {/* Center label */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: themeColors.textMuted, fontWeight: '700' }}>Total</Text>
                <Text style={{ fontSize: 18, color: themeColors.text, fontWeight: '900' }}>{fmt(total)}</Text>
            </View>
        </View>
    );
}

/* ──────────────── SVG Bar Chart ──────────────── */
function BarChart({ data, colors: themeColors, currentMonth }: { data: any[]; colors: any; currentMonth: number }) {
    const chartW = Math.max(SCREEN_W - 80, data.length * 46);
    const chartH = 140;
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    const barW = 10;
    const gap = chartW / data.length;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ paddingBottom: 4 }}>
                <Svg width={chartW + 20} height={chartH + 30}>
                    <Defs>
                        <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={themeColors.income} stopOpacity="1" />
                            <Stop offset="1" stopColor={themeColors.income} stopOpacity="0.4" />
                        </LinearGradient>
                        <LinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={themeColors.expense} stopOpacity="1" />
                            <Stop offset="1" stopColor={themeColors.expense} stopOpacity="0.4" />
                        </LinearGradient>
                    </Defs>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                        <Line key={i} x1={10} y1={chartH * (1 - pct)} x2={chartW + 10} y2={chartH * (1 - pct)} stroke={themeColors.border} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
                    ))}
                    {data.map((d, i) => {
                        const x = 10 + i * gap + gap / 2;
                        const incH = maxVal > 0 ? (d.income / maxVal) * chartH : 0;
                        const expH = maxVal > 0 ? (d.expense / maxVal) * chartH : 0;
                        const isCurrent = d.month === currentMonth;
                        return (
                            <G key={i}>
                                <Rect x={x - barW - 1} y={chartH - incH} width={barW} height={Math.max(incH, 1)} rx={5} fill="url(#incomeGrad)" opacity={isCurrent ? 1 : 0.6} />
                                <Rect x={x + 1} y={chartH - expH} width={barW} height={Math.max(expH, 1)} rx={5} fill="url(#expenseGrad)" opacity={isCurrent ? 1 : 0.6} />
                                <SvgText
                                    x={x}
                                    y={chartH + 18}
                                    textAnchor="middle"
                                    fontSize={10}
                                    fontWeight={isCurrent ? '900' : '500'}
                                    fill={isCurrent ? themeColors.primary : themeColors.textMuted}
                                >{MONTHS[d.month - 1]}</SvgText>
                            </G>
                        );
                    })}
                </Svg>
            </View>
        </ScrollView>
    );
}

/* ──────────────── Progress Bar ──────────────── */
function ProgressBar({ value, max, color, colors: c }: { value: number; max: number; color: string; colors: any }) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    return (
        <View style={{ height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden', flex: 1 }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
        </View>
    );
}

/* ══════════════════════════════════════════════════ */
/*               MAIN SCREEN COMPONENT              */
/* ══════════════════════════════════════════════════ */
export default function FinancialAnalysisScreen() {
    const { colors, mode } = useTheme();
    const { fmt } = useLocale();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [tab, setTab] = useState<'expense' | 'income'>('expense');
    const [summary, setSummary] = useState<any>(null);
    const [byCategory, setByCategory] = useState<any[]>([]);
    const [cashflow, setCashflow] = useState<any[]>([]);
    const [dre, setDre] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchData() {
        try {
            const [s, bc, cf, d] = await Promise.all([
                api.getSummary({ month, year }) as Promise<any>,
                api.getByCategory({ month, year, type: tab, is_paid: true }) as Promise<any[]>,
                api.getCashflow({ year }) as Promise<any[]>,
                api.getDRE({ month, year }) as Promise<any>,
            ]);
            setSummary(s);
            setByCategory(bc);
            setCashflow(cf);
            setDre(d);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [month, year, tab]));

    function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
    function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }

    const totalCat = useMemo(() => byCategory.reduce((s, i) => s + i.total, 0), [byCategory]);
    const donutData = useMemo(() => byCategory.map(c => ({ label: c.category_name, value: c.total, color: c.category_color })), [byCategory]);

    const balanceColor = (summary?.balance || 0) >= 0 ? colors.income : colors.expense;
    const savingsRate = summary && summary.income > 0 ? ((summary.income - summary.expense) / summary.income * 100) : 0;

    const styles = s(colors, mode);

    return (
        <ScrollView
            style={styles.root}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        >
            {/* ──── Header ──── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Análise Financeira</Text>
                <Text style={styles.headerSub}>Visão completa da sua saúde financeira</Text>
            </View>

            {/* ──── Month Selector ──── */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}><Ionicons name="chevron-back" size={18} color={colors.text} /></TouchableOpacity>
                <View style={styles.monthCenter}>
                    <Text style={styles.monthName}>{MONTH_FULL[month - 1]}</Text>
                    <Text style={styles.monthYear}>{year}</Text>
                </View>
                <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}><Ionicons name="chevron-forward" size={18} color={colors.text} /></TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} size="large" /> : (
                <>
                    {/* ══════ KPI Hero Cards ══════ */}
                    <View style={styles.kpiRow}>
                        <View style={[styles.kpiCard, { borderLeftColor: colors.income }]}>
                            <View style={[styles.kpiIconWrap, { backgroundColor: colors.income + '15' }]}>
                                <Ionicons name="trending-up" size={20} color={colors.income} />
                            </View>
                            <Text style={styles.kpiLabel}>Receitas</Text>
                            <Text style={[styles.kpiValue, { color: colors.income }]}>{fmt(summary?.income || 0)}</Text>
                            {summary?.pending_income > 0 && (
                                <Text style={styles.kpiPending}>+ {fmt(summary.pending_income)} pendente</Text>
                            )}
                        </View>
                        <View style={[styles.kpiCard, { borderLeftColor: colors.expense }]}>
                            <View style={[styles.kpiIconWrap, { backgroundColor: colors.expense + '15' }]}>
                                <Ionicons name="trending-down" size={20} color={colors.expense} />
                            </View>
                            <Text style={styles.kpiLabel}>Despesas</Text>
                            <Text style={[styles.kpiValue, { color: colors.expense }]}>{fmt(summary?.expense || 0)}</Text>
                            {summary?.pending_expense > 0 && (
                                <Text style={styles.kpiPending}>+ {fmt(summary.pending_expense)} pendente</Text>
                            )}
                        </View>
                    </View>

                    {/* ══════ Balance + HealthScore Card ══════ */}
                    <View style={styles.balanceCard}>
                        <View style={styles.balanceRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.balanceLabel}>Resultado do Mês</Text>
                                <Text style={[styles.balanceValue, { color: balanceColor }]}>{fmt(summary?.balance || 0)}</Text>
                            </View>
                            <View style={[styles.balanceBadge, { backgroundColor: balanceColor + '15' }]}>
                                <Ionicons name={(summary?.balance || 0) >= 0 ? 'checkmark-circle' : 'alert-circle'} size={28} color={balanceColor} />
                            </View>
                        </View>

                        <View style={styles.healthRow}>
                            <View style={styles.healthItem}>
                                <Text style={styles.healthLabel}>Saldo Total</Text>
                                <Text style={styles.healthVal}>{fmt(summary?.total_balance || 0)}</Text>
                            </View>
                            <View style={[styles.healthDivider]} />
                            <View style={styles.healthItem}>
                                <Text style={styles.healthLabel}>Previsão</Text>
                                <Text style={[styles.healthVal, { color: (summary?.forecast || 0) >= 0 ? colors.income : colors.expense }]}>{fmt(summary?.forecast || 0)}</Text>
                            </View>
                            <View style={[styles.healthDivider]} />
                            <View style={styles.healthItem}>
                                <Text style={styles.healthLabel}>% Economia</Text>
                                <Text style={[styles.healthVal, { color: savingsRate >= 0 ? colors.income : colors.expense }]}>{savingsRate.toFixed(1)}%</Text>
                            </View>
                        </View>
                    </View>

                    {/* ══════ Cashflow Chart ══════ */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Fluxo de Caixa</Text>
                                <Text style={styles.sectionSub}>Comparativo mensal do ano de {year}</Text>
                            </View>
                            <View style={styles.sectionBadge}>
                                <Ionicons name="bar-chart" size={16} color={colors.primary} />
                            </View>
                        </View>
                        <View style={styles.chartCard}>
                            <BarChart data={cashflow} colors={colors} currentMonth={month} />
                            <View style={styles.legendRow}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
                                    <Text style={styles.legendText}>Receitas</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
                                    <Text style={styles.legendText}>Despesas</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ══════ Category Breakdown ══════ */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Composição por Categoria</Text>
                                <Text style={styles.sectionSub}>Onde seu dinheiro está indo</Text>
                            </View>
                            <View style={styles.sectionBadge}>
                                <Ionicons name="pie-chart" size={16} color={colors.primary} />
                            </View>
                        </View>

                        {/* Tab Toggle */}
                        <View style={styles.tabRow}>
                            <TouchableOpacity style={[styles.tabBtn, tab === 'expense' && styles.tabActive]} onPress={() => setTab('expense')}>
                                <Ionicons name="arrow-up-circle-outline" size={16} color={tab === 'expense' ? colors.white : colors.textSecondary} />
                                <Text style={[styles.tabText, tab === 'expense' && styles.tabTextActive]}>Despesas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tabBtn, tab === 'income' && styles.tabActive]} onPress={() => setTab('income')}>
                                <Ionicons name="arrow-down-circle-outline" size={16} color={tab === 'income' ? colors.white : colors.textSecondary} />
                                <Text style={[styles.tabText, tab === 'income' && styles.tabTextActive]}>Receitas</Text>
                            </TouchableOpacity>
                        </View>

                        {byCategory.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons name="pie-chart-outline" size={48} color={colors.textMuted} />
                                </View>
                                <Text style={styles.emptyTitle}>Sem dados</Text>
                                <Text style={styles.emptySub}>Nenhum registro encontrado para este período.</Text>
                            </View>
                        ) : (
                            <>
                                {/* Donut */}
                                <View style={styles.donutWrap}>
                                    <DonutChart data={donutData} colors={colors} />
                                </View>

                                {/* Category List */}
                                <View style={styles.catCard}>
                                    {byCategory.map((item, idx) => {
                                        const pct = totalCat > 0 ? ((item.total / totalCat) * 100) : 0;
                                        return (
                                            <View key={item.category_id} style={[styles.catRow, idx === byCategory.length - 1 && { borderBottomWidth: 0 }]}>
                                                <View style={[styles.catIconWrap, { backgroundColor: item.category_color + '18' }]}>
                                                    <Ionicons name={(item.category_icon || 'tag') as any} size={18} color={item.category_color} />
                                                </View>
                                                <View style={{ flex: 1, gap: 6 }}>
                                                    <View style={styles.catHeader}>
                                                        <Text style={styles.catName}>{item.category_name}</Text>
                                                        <Text style={styles.catValue}>{fmt(item.total)}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                        <ProgressBar value={item.total} max={totalCat} color={item.category_color} colors={colors} />
                                                        <View style={[styles.pctBadge, { backgroundColor: item.category_color + '18' }]}>
                                                            <Text style={[styles.pctText, { color: item.category_color }]}>{pct.toFixed(1)}%</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.catCount}>{item.count} {item.count === 1 ? 'transação' : 'transações'}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </View>

                    {/* ══════ DRE – Demonstração de Resultado ══════ */}
                    {dre && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View>
                                    <Text style={styles.sectionTitle}>Demonstração de Resultado</Text>
                                    <Text style={styles.sectionSub}>DRE simplificado do mês</Text>
                                </View>
                                <View style={styles.sectionBadge}>
                                    <Ionicons name="document-text" size={16} color={colors.primary} />
                                </View>
                            </View>
                            <View style={styles.dreCard}>
                                {/* Receitas */}
                                <View style={styles.dreSection}>
                                    <View style={styles.dreSectionHeader}>
                                        <Text style={[styles.dreSectionTitle, { color: colors.income }]}>Receitas</Text>
                                        <Text style={[styles.dreSectionTotal, { color: colors.income }]}>{fmt(dre.total_receita)}</Text>
                                    </View>
                                    {dre.receitas.map((r: any, i: number) => (
                                        <View key={i} style={styles.dreItem}>
                                            <View style={styles.dreItemLeft}>
                                                <View style={[styles.dreDot, { backgroundColor: r.color }]} />
                                                <Text style={styles.dreItemName}>{r.category}</Text>
                                            </View>
                                            <Text style={styles.dreItemValue}>{fmt(r.total)}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.dreDivider} />

                                {/* Despesas */}
                                <View style={styles.dreSection}>
                                    <View style={styles.dreSectionHeader}>
                                        <Text style={[styles.dreSectionTitle, { color: colors.expense }]}>Despesas</Text>
                                        <Text style={[styles.dreSectionTotal, { color: colors.expense }]}>{fmt(dre.total_despesa)}</Text>
                                    </View>
                                    {dre.despesas.map((d: any, i: number) => (
                                        <View key={i} style={styles.dreItem}>
                                            <View style={styles.dreItemLeft}>
                                                <View style={[styles.dreDot, { backgroundColor: d.color }]} />
                                                <Text style={styles.dreItemName}>{d.category}</Text>
                                            </View>
                                            <Text style={styles.dreItemValue}>{fmt(d.total)}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.dreDivider} />

                                {/* Resultado */}
                                <View style={styles.dreResultRow}>
                                    <Text style={styles.dreResultLabel}>Resultado Líquido</Text>
                                    <Text style={[styles.dreResultValue, { color: dre.resultado >= 0 ? colors.income : colors.expense }]}>{fmt(dre.resultado)}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ══════ KPI Stats Grid ══════ */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Indicadores do Mês</Text>
                                <Text style={styles.sectionSub}>Métricas complementares</Text>
                            </View>
                            <View style={styles.sectionBadge}>
                                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                            </View>
                        </View>
                        <View style={styles.statsGrid}>
                            {[
                                { icon: 'receipt-outline', label: 'Nº Receitas', value: `${summary?.income_count || 0}`, color: colors.income },
                                { icon: 'cart-outline', label: 'Nº Despesas', value: `${summary?.expense_count || 0}`, color: colors.expense },
                                { icon: 'cash-outline', label: 'Ticket Médio Rec.', value: summary?.income_count > 0 ? fmt(summary.income / summary.income_count) : 'R$ 0', color: colors.income },
                                { icon: 'card-outline', label: 'Ticket Médio Desp.', value: summary?.expense_count > 0 ? fmt(summary.expense / summary.expense_count) : 'R$ 0', color: colors.expense },
                            ].map((stat, i) => (
                                <View key={i} style={styles.statCard}>
                                    <View style={[styles.statIconWrap, { backgroundColor: stat.color + '12' }]}>
                                        <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                                    </View>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 120 }} />
                </>
            )}
        </ScrollView>
    );
}


/* ══════════════════════════════════════════ */
/*                  STYLES                   */
/* ══════════════════════════════════════════ */
const s = (colors: any, mode: string) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    /* Header */
    header: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 4 },

    /* Month Selector */
    monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 20 },
    monthArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    monthCenter: { alignItems: 'center' },
    monthName: { fontSize: 18, fontWeight: '800', color: colors.text },
    monthYear: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },

    /* KPI Cards */
    kpiRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
    kpiCard: {
        flex: 1, backgroundColor: colors.surface, borderRadius: 24, padding: 18,
        borderLeftWidth: 4, gap: 8, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2
    },
    kpiIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    kpiLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    kpiValue: { fontSize: 18, fontWeight: '900' },
    kpiPending: { fontSize: 10, color: colors.warning, fontWeight: '700', marginTop: -4 },

    /* Balance Card */
    balanceCard: {
        marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 28,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3
    },
    balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    balanceLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '700', marginBottom: 6 },
    balanceValue: { fontSize: 28, fontWeight: '900' },
    balanceBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, padding: 14 },
    healthItem: { flex: 1, alignItems: 'center' },
    healthLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
    healthVal: { fontSize: 13, fontWeight: '800', color: colors.text },
    healthDivider: { width: 1, height: 28, backgroundColor: colors.border },

    /* Section */
    section: { paddingHorizontal: 20, marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    sectionSub: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    sectionBadge: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center' },

    /* Chart Card */
    chartCard: {
        backgroundColor: colors.surface, borderRadius: 24, padding: 18,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2
    },
    legendRow: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginTop: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

    /* Tab Toggle */
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
    tabTextActive: { color: colors.white },

    /* Donut */
    donutWrap: { alignItems: 'center', marginBottom: 24 },

    /* Category List */
    catCard: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    catRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    catIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catName: { fontSize: 15, color: colors.text, fontWeight: '700' },
    catValue: { fontSize: 15, color: colors.text, fontWeight: '800' },
    pctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    pctText: { fontSize: 11, fontWeight: '800' },
    catCount: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },

    /* Empty State */
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    emptySub: { fontSize: 13, color: colors.textMuted, fontWeight: '500', textAlign: 'center' },

    /* DRE */
    dreCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border },
    dreSection: { gap: 10 },
    dreSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    dreSectionTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    dreSectionTotal: { fontSize: 16, fontWeight: '900' },
    dreItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16 },
    dreItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dreDot: { width: 8, height: 8, borderRadius: 4 },
    dreItemName: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    dreItemValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
    dreDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
    dreResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
    dreResultLabel: { fontSize: 16, fontWeight: '900', color: colors.text },
    dreResultValue: { fontSize: 20, fontWeight: '900' },

    /* Stats Grid */
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: (SCREEN_W - 52) / 2, backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 8,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1
    },
    statIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    statValue: { fontSize: 16, fontWeight: '900' },
});
