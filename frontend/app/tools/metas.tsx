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

export default function MetasListScreen() {
    const { colors } = useTheme();
    const now = new Date();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        try {
            const [b, cats] = await Promise.all([
                api.getBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }) as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
            ]);
            setBudgets(b); setCategories(cats);
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false); setLoading(false);
        }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    function getCat(id: string) { return categories.find(c => c.id === id); }

    const styles = s(colors);

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Minhas Metas</Text>
                    <Text style={styles.sub}>Planejamento de {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(now)}</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/budget/new' as any)}>
                    <Ionicons name="add" size={24} color={colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : budgets.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="trending-up-outline" size={64} color={colors.border} />
                        <Text style={styles.emptyTxt}>Nenhuma meta definida para este mês</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/budget/new' as any)}>
                            <Text style={styles.emptyBtnTxt}>Criar primeira meta</Text>
                        </TouchableOpacity>
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
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    title: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    budgetCard: { backgroundColor: colors.surface, borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    budgetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    dot: { width: 12, height: 12, borderRadius: 6 },
    budgetName: { flex: 1, fontSize: 17, color: colors.text, fontWeight: '800' },
    budgetPct: { fontSize: 16, fontWeight: '900' },
    progressTrack: { height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
    progressBar: { height: '100%', borderRadius: 5 },
    budgetFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetVal: { fontSize: 15, color: colors.text, fontWeight: '700' },
    overTxt: { fontSize: 11, color: colors.danger, fontWeight: '800', textTransform: 'uppercase' },
    emptyState: { padding: 60, alignItems: 'center', gap: 20 },
    emptyTxt: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24, fontWeight: '600' },
    emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    emptyBtnTxt: { color: colors.white, fontWeight: '800' },
});
