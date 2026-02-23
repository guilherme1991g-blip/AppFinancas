import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function SimpleBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    return (
        <View style={{ height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4, overflow: 'hidden', flex: 1 }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
        </View>
    );
}

export default function ReportsScreen() {
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

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Relatórios</Text>
            </View>

            {/* Month selector */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={styles.arrow}><Ionicons name="chevron-back" size={18} color={Colors.text} /></TouchableOpacity>
                <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.arrow}><Ionicons name="chevron-forward" size={18} color={Colors.text} /></TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
                <>
                    {/* Summary Cards */}
                    <View style={styles.summaryRow}>
                        {[
                            { label: 'Receitas', value: summary?.income || 0, color: Colors.income, icon: 'arrow-down-circle' },
                            { label: 'Despesas', value: summary?.expense || 0, color: Colors.expense, icon: 'arrow-up-circle' },
                        ].map(card => (
                            <View key={card.label} style={[styles.summaryCard, { borderLeftColor: card.color }]}>
                                <Ionicons name={card.icon as any} size={20} color={card.color} />
                                <Text style={styles.summaryLabel}>{card.label}</Text>
                                <Text style={[styles.summaryValue, { color: card.color }]}>{formatCurrency(card.value)}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Result */}
                    <View style={styles.resultCard}>
                        <Text style={styles.resultLabel}>Resultado do mês</Text>
                        <Text style={[styles.resultValue, { color: (summary?.balance || 0) >= 0 ? Colors.income : Colors.expense }]}>
                            {formatCurrency(summary?.balance || 0)}
                        </Text>
                    </View>

                    {/* Cashflow 12m */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Fluxo de Caixa {year}</Text>
                        <View style={styles.cfChart}>
                            {cashflow.map((m) => (
                                <View key={m.month} style={styles.cfColumn}>
                                    <View style={styles.cfBars}>
                                        <View style={{ height: maxCF > 0 ? (m.income / maxCF) * 80 : 0, width: 8, backgroundColor: Colors.income, borderRadius: 4 }} />
                                        <View style={{ height: maxCF > 0 ? (m.expense / maxCF) * 80 : 0, width: 8, backgroundColor: Colors.expense, borderRadius: 4 }} />
                                    </View>
                                    <Text style={styles.cfLabel}>{MONTHS[m.month - 1]}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.cfLegend}>
                            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.income }]} /><Text style={styles.legendText}>Receitas</Text></View>
                            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.expense }]} /><Text style={styles.legendText}>Despesas</Text></View>
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
                            <Text style={styles.empty}>Nenhum dado para este período</Text>
                        ) : (
                            byCategory.map((item) => {
                                const total = byCategory.reduce((s, i) => s + i.total, 0);
                                const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
                                return (
                                    <View key={item.category_id} style={styles.catRow}>
                                        <View style={[styles.catDot, { backgroundColor: item.category_color }]} />
                                        <View style={{ flex: 1, gap: 4 }}>
                                            <View style={styles.catHeader}>
                                                <Text style={styles.catName}>{item.category_name}</Text>
                                                <Text style={styles.catValue}>{formatCurrency(item.total)}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                                <SimpleBar value={item.total} max={total} color={item.category_color} />
                                                <Text style={styles.catPct}>{pct}%</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </>
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { padding: Spacing.lg, paddingTop: 56 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.text },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
    arrow: { padding: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: Radius.full },
    monthText: { fontSize: 15, fontWeight: '600', color: Colors.text, width: 90, textAlign: 'center' },
    summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.md },
    summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderLeftWidth: 3, gap: 4 },
    summaryLabel: { fontSize: 12, color: Colors.textSecondary },
    summaryValue: { fontSize: 16, fontWeight: '700' },
    resultCard: {
        marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
        borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between',
    },
    resultLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
    resultValue: { fontSize: 20, fontWeight: '800' },
    section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
    cfChart: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md },
    cfColumn: { alignItems: 'center', gap: 4, flex: 1 },
    cfBars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: 80 },
    cfLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '500' },
    cfLegend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: Colors.textSecondary },
    tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    tabBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.surfaceLight },
    tabActive: { backgroundColor: Colors.primary },
    tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    tabTextActive: { color: '#000', fontWeight: '700' },
    catRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
    catDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
    catValue: { fontSize: 14, color: Colors.text, fontWeight: '700' },
    catPct: { fontSize: 11, color: Colors.textMuted, width: 36, textAlign: 'right' },
    empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg },
});
