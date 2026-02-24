import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function ToolsScreen() {
    const { colors } = useTheme();
    const now = new Date();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'budgets' | 'recurring'>('budgets');

    async function fetchData() {
        try {
            const [b, r, cats] = await Promise.all([
                api.getBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }) as Promise<any[]>,
                api.getRecurring() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
            ]);
            setBudgets(b); setRecurring(r); setCategories(cats);
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); setLoading(false); }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    function getCat(id: string) { return categories.find(c => c.id === id); }

    const styles = s(colors);

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Ferramentas</Text>
                        <Text style={styles.sub}>Gestão e análises avançadas</Text>
                    </View>
                </View>

                {/* Main Tools Row */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.analyticsCard} onPress={() => router.push('/tools/analytics' as any)}>
                        <View style={styles.analyticsIcon}>
                            <Ionicons name="pie-chart" size={32} color={colors.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.analyticsTitle}>Análise de Gastos</Text>
                            <Text style={styles.analyticsSub}>Relatórios detalhados, fluxo de caixa e comparativos mensais.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Tabs Selector */}
                <View style={styles.tabSelector}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'budgets' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('budgets')}
                    >
                        <Ionicons name="pie-chart-outline" size={18} color={activeTab === 'budgets' ? colors.white : colors.textSecondary} />
                        <Text style={[styles.tabBtnTxt, activeTab === 'budgets' && styles.tabBtnTxtActive]}>Orçamentos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'recurring' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('recurring')}
                    >
                        <Ionicons name="repeat-outline" size={18} color={activeTab === 'recurring' ? colors.white : colors.textSecondary} />
                        <Text style={[styles.tabBtnTxt, activeTab === 'recurring' && styles.tabBtnTxtActive]}>Recorrentes</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                <View style={styles.tabContentArea}>
                    {loading && !refreshing ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                    ) : activeTab === 'budgets' ? (
                        <View>
                            <View style={styles.tabHeader}>
                                <Text style={styles.tabHeaderTitle}>Meus Orçamentos</Text>
                                <TouchableOpacity style={styles.miniAddBtn} onPress={() => router.push('/budget/new' as any)}>
                                    <Ionicons name="add" size={18} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                            {budgets.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="pie-chart-outline" size={48} color={colors.border} />
                                    <Text style={styles.emptyTxt}>Nenhum orçamento definido para este mês</Text>
                                </View>
                            ) : (
                                budgets.map(b => {
                                    const cat = getCat(b.category_id);
                                    const pct = b.amount > 0 ? Math.min(b.spent / b.amount, 1) : 0;
                                    const over = b.spent > b.amount;
                                    return (
                                        <TouchableOpacity key={b.id} style={styles.budgetCard} onPress={() => { }}>
                                            <View style={styles.budgetHead}>
                                                <View style={[styles.dot, { backgroundColor: cat?.color || colors.primary }]} />
                                                <Text style={styles.budgetName}>{cat?.name || 'Geral'}</Text>
                                                <Text style={[styles.budgetPct, { color: over ? colors.danger : colors.primary }]}>{(pct * 100).toFixed(0)}%</Text>
                                            </View>
                                            <View style={styles.progressTrack}>
                                                <View style={[styles.progressBar, { width: `${pct * 100}%` as any, backgroundColor: over ? colors.danger : colors.primary }]} />
                                            </View>
                                            <View style={styles.budgetFlex}>
                                                <Text style={styles.budgetVal}>{fmt(b.spent)} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>de {fmt(b.amount)}</Text></Text>
                                                {over && <Text style={styles.overTxt}>Excedido</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    ) : (
                        <View>
                            <View style={styles.tabHeader}>
                                <Text style={styles.tabHeaderTitle}>Lançamentos Recorrentes</Text>
                                <TouchableOpacity style={styles.miniAddBtn} onPress={() => router.push('/recurring/new' as any)}>
                                    <Ionicons name="add" size={18} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                            {recurring.filter(r => r.is_active).length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="repeat-outline" size={48} color={colors.border} />
                                    <Text style={styles.emptyTxt}>Nenhum lançamento recorrente ativo</Text>
                                </View>
                            ) : (
                                <View style={styles.listCard}>
                                    {recurring.filter(r => r.is_active).map((r, idx) => (
                                        <View key={r.id} style={[styles.listItem, idx === recurring.filter(r => r.is_active).length - 1 && { borderBottomWidth: 0 }]}>
                                            <View style={[styles.recIconWrap, { backgroundColor: r.type === 'income' ? colors.income + '15' : colors.expense + '15' }]}>
                                                <Ionicons name="repeat" size={18} color={r.type === 'income' ? colors.income : colors.expense} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemTitle}>{r.description}</Text>
                                                <Text style={styles.itemSub}>{FR_LABEL[r.frequency]}</Text>
                                            </View>
                                            <Text style={[styles.itemVal, { color: r.type === 'income' ? colors.income : colors.expense }]}>
                                                {r.type === 'income' ? '+' : '-'}{fmt(r.amount)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24 },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },

    section: { paddingHorizontal: 20, marginBottom: 24 },
    analyticsCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
        borderRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4
    },
    analyticsIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    analyticsTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    analyticsSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18, fontWeight: '500' },

    tabSelector: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabBtnTxt: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    tabBtnTxtActive: { color: colors.white },

    tabContentArea: { paddingHorizontal: 20 },
    tabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    tabHeaderTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    miniAddBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },

    budgetCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    budgetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    budgetName: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '800' },
    budgetPct: { fontSize: 15, fontWeight: '900' },
    progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    progressBar: { height: '100%', borderRadius: 4 },
    budgetFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetVal: { fontSize: 14, color: colors.text, fontWeight: '700' },
    overTxt: { fontSize: 11, color: colors.danger, fontWeight: '800', textTransform: 'uppercase' },

    listCard: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },
    recIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 15, color: colors.text, fontWeight: '700' },
    itemSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    itemVal: { fontSize: 16, fontWeight: '800' },

    emptyState: { padding: 40, alignItems: 'center', gap: 16 },
    emptyTxt: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
});
