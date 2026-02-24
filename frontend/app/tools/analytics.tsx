import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function SimpleBar({ value, max, color, colors }: { value: number; max: number; color: string; colors: any }) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    return (
        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', flex: 1 }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
        </View>
    );
}

export default function ReportsScreen() {
    const { colors } = useTheme();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [tab, setTab] = useState<'expense' | 'income'>('expense');
    const [summary, setSummary] = useState<any>(null);
    const [byCategory, setByCategory] = useState<any[]>([]);
    const [cashflow, setCashflow] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchData() {
        try {
            const [s, bc, cf] = await Promise.all([
                api.getSummary({ month, year }) as Promise<any>,
                api.getByCategory({ month, year, type: tab }) as Promise<any[]>,
                api.getCashflow({ year }) as Promise<any[]>,
            ]);
            setSummary(s);
            setByCategory(bc);
            setCashflow(cf);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [month, year, tab]));

    function prevMonth() {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    }
    function nextMonth() {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    }

    const maxCF = Math.max(...cashflow.map(m => Math.max(m.income, m.expense)), 1);
    const styles = s(colors);

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Relatórios</Text>
            </View>

            {/* Month selector */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={styles.arrow}><Ionicons name="chevron-back" size={18} color={colors.text} /></TouchableOpacity>
                <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.arrow}><Ionicons name="chevron-forward" size={18} color={colors.text} /></TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
                <>
                    {/* Summary Cards */}
                    <View style={styles.summaryRow}>
                        {[
                            { label: 'Receitas', value: summary?.income || 0, color: colors.income, icon: 'arrow-down-circle' },
                            { label: 'Despesas', value: summary?.expense || 0, color: colors.expense, icon: 'arrow-up-circle' },
                        ].map(card => (
                            <View key={card.label} style={[styles.summaryCard, { borderLeftColor: card.color }]}>
                                <Ionicons name={card.icon as any} size={20} color={card.color} />
                                <Text style={styles.summaryLabel}>{card.label}</Text>
                                <Text style={[styles.summaryValue, { color: card.color }]}>{formatCurrency(Math.abs(card.value))}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Result */}
                    <View style={styles.resultCard}>
                        <View>
                            <Text style={styles.resultLabel}>Resultado do mês</Text>
                            <Text style={[styles.resultValue, { color: (summary?.balance || 0) >= 0 ? colors.income : colors.expense }]}>
                                {formatCurrency(summary?.balance || 0)}
                            </Text>
                        </View>
                        <View style={[styles.resultBadge, { backgroundColor: (summary?.balance || 0) >= 0 ? colors.income + '15' : colors.expense + '15' }]}>
                            <Ionicons
                                name={(summary?.balance || 0) >= 0 ? 'trending-up' : 'trending-down'}
                                size={20}
                                color={(summary?.balance || 0) >= 0 ? colors.income : colors.expense}
                            />
                        </View>
                    </View>

                    {/* Cashflow 12m */}
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Fluxo de Caixa {year}</Text>
                            <Ionicons name="bar-chart-outline" size={16} color={colors.textMuted} />
                        </View>
                        <View style={styles.cfBarContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.cfChart}>
                                    {cashflow.map((m) => (
                                        <View key={m.month} style={styles.cfColumn}>
                                            <View style={styles.cfBars}>
                                                <View style={{ height: maxCF > 0 ? (m.income / maxCF) * 80 : 0, width: 8, backgroundColor: colors.income, borderRadius: 4 }} />
                                                <View style={{ height: maxCF > 0 ? (m.expense / maxCF) * 80 : 0, width: 8, backgroundColor: colors.expense, borderRadius: 4 }} />
                                            </View>
                                            <Text style={styles.cfLabel}>{MONTHS[m.month - 1]}</Text>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                        <View style={styles.cfLegend}>
                            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.income }]} /><Text style={styles.legendText}>Receitas</Text></View>
                            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.expense }]} /><Text style={styles.legendText}>Despesas</Text></View>
                        </View>
                    </View>

                    {/* By Category */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Por Categoria</Text>
                        <View style={styles.tabRow}>
                            <TouchableOpacity style={[styles.tabBtn, tab === 'expense' && styles.tabActive]} onPress={() => setTab('expense')}>
                                <Text style={[styles.tabText, tab === 'expense' && styles.tabTextActive]}>Despesas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tabBtn, tab === 'income' && styles.tabActive]} onPress={() => setTab('income')}>
                                <Text style={[styles.tabText, tab === 'income' && styles.tabTextActive]}>Receitas</Text>
                            </TouchableOpacity>
                        </View>
                        {byCategory.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="pie-chart-outline" size={48} color={colors.border} />
                                <Text style={styles.empty}>Nenhum dado para este período</Text>
                            </View>
                        ) : (
                            <View style={styles.catListCard}>
                                {byCategory.map((item, idx) => {
                                    const total = byCategory.reduce((s, i) => s + i.total, 0);
                                    const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
                                    return (
                                        <View key={item.category_id} style={[styles.catRow, idx === byCategory.length - 1 && { borderBottomWidth: 0 }]}>
                                            <View style={[styles.catDot, { backgroundColor: item.category_color }]} />
                                            <View style={{ flex: 1, gap: 6 }}>
                                                <View style={styles.catHeader}>
                                                    <Text style={styles.catName}>{item.category_name}</Text>
                                                    <Text style={styles.catValue}>{formatCurrency(item.total)}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    <SimpleBar value={item.total} max={total} color={item.category_color} colors={colors} />
                                                    <Text style={styles.catPct}>{pct}%</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </>
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 20, paddingTop: 64 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
    arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
    monthText: { fontSize: 16, fontWeight: '700', color: colors.text, width: 110, textAlign: 'center' },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
    summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderLeftWidth: 4, gap: 6, borderWidth: 1, borderColor: colors.border },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    summaryValue: { fontSize: 17, fontWeight: '800' },
    resultCard: {
        marginHorizontal: 20, backgroundColor: colors.surface,
        borderRadius: 20, padding: 18, marginBottom: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: colors.border
    },
    resultLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
    resultValue: { fontSize: 22, fontWeight: '900' },
    resultBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },

    cfBarContainer: { backgroundColor: colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border },
    cfChart: { flexDirection: 'row', gap: 12 },
    cfColumn: { alignItems: 'center', gap: 6, width: 40 },
    cfBars: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 80 },
    cfLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
    cfLegend: { flexDirection: 'row', gap: 20, marginTop: 12, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
    tabTextActive: { color: colors.white },

    catListCard: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    catRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    catDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catName: { fontSize: 15, color: colors.text, fontWeight: '700' },
    catValue: { fontSize: 15, color: colors.text, fontWeight: '800' },
    catPct: { fontSize: 12, color: colors.textMuted, fontWeight: '600', width: 40, textAlign: 'right' },

    emptyContainer: { padding: 40, alignItems: 'center', gap: 16 },
    empty: { color: colors.textMuted, textAlign: 'center', fontSize: 14, fontWeight: '500' },
});
