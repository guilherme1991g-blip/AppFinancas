import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const FR = ['daily', 'weekly', 'monthly', 'yearly'];
const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function MoreScreen() {
    const { user, logout } = useAuth();
    const now = new Date();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchData() {
        try {
            const [b, r, c, cats] = await Promise.all([
                api.getBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }) as Promise<any[]>,
                api.getRecurring() as Promise<any[]>,
                api.getCompanies() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
            ]);
            setBudgets(b); setRecurring(r); setCompanies(c); setCategories(cats);
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    function getCat(id: string) { return categories.find(c => c.id === id); }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Mais</Text>
                <View style={styles.userBadge}>
                    <Text style={styles.userInitial}>{user?.name?.[0]?.toUpperCase()}</Text>
                </View>
            </View>

            {/* Quick Menu */}
            <View style={styles.menuGrid}>
                {[
                    { label: 'Orçamentos', icon: 'pie-chart', color: Colors.secondary, action: () => { } },
                    { label: 'Recorrentes', icon: 'repeat', color: Colors.warning, action: () => { } },
                    { label: 'Empresas', icon: 'business', color: '#74B9FF', action: () => { } },
                    { label: 'Categorias', icon: 'pricetag', color: '#FD79A8', action: () => { } },
                ].map(item => (
                    <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.action}>
                        <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                            <Ionicons name={item.icon as any} size={24} color={item.color} />
                        </View>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Budgets */}
            <View style={styles.section}>
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Orçamentos do Mês</Text>
                    <TouchableOpacity onPress={() => router.push('/budget/new' as any)}>
                        <Text style={styles.addLink}>+ Novo</Text>
                    </TouchableOpacity>
                </View>
                {budgets.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum orçamento definido</Text>
                ) : (
                    budgets.map(b => {
                        const cat = getCat(b.category_id);
                        const pct = b.amount > 0 ? Math.min(b.spent / b.amount, 1) : 0;
                        const over = b.spent > b.amount;
                        return (
                            <View key={b.id} style={styles.budgetCard}>
                                <View style={styles.budgetHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                        <View style={[styles.catDot, { backgroundColor: cat?.color || Colors.secondary }]} />
                                        <Text style={styles.budgetName}>{cat?.name || 'Categoria'}</Text>
                                    </View>
                                    <Text style={[styles.budgetPct, { color: over ? Colors.expense : Colors.income }]}>
                                        {(pct * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: over ? Colors.expense : Colors.income }]} />
                                </View>
                                <View style={styles.budgetFooter}>
                                    <Text style={styles.budgetSpent}>{formatCurrency(b.spent)} gastos</Text>
                                    <Text style={styles.budgetTotal}>de {formatCurrency(b.amount)}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>

            {/* Recurring */}
            <View style={styles.section}>
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Recorrentes</Text>
                    <TouchableOpacity onPress={() => router.push('/recurring/new' as any)}>
                        <Text style={styles.addLink}>+ Novo</Text>
                    </TouchableOpacity>
                </View>
                {recurring.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum lançamento recorrente</Text>
                ) : (
                    recurring.filter(r => r.is_active).map(r => (
                        <View key={r.id} style={styles.recCard}>
                            <View style={[styles.recIcon, { backgroundColor: r.type === 'income' ? Colors.income + '25' : Colors.expense + '25' }]}>
                                <Ionicons name="repeat" size={18} color={r.type === 'income' ? Colors.income : Colors.expense} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.recDesc}>{r.description}</Text>
                                <Text style={styles.recFreq}>{FR_LABEL[r.frequency]}</Text>
                            </View>
                            <Text style={[styles.recAmount, { color: r.type === 'income' ? Colors.income : Colors.expense }]}>
                                {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Companies */}
            <View style={styles.section}>
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Empresas</Text>
                    <TouchableOpacity onPress={() => router.push('/company/new' as any)}>
                        <Text style={styles.addLink}>+ Nova</Text>
                    </TouchableOpacity>
                </View>
                {companies.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhuma empresa cadastrada</Text>
                ) : (
                    companies.map(c => (
                        <TouchableOpacity key={c.id} style={styles.companyCard}>
                            <View style={[styles.companyIcon, { backgroundColor: c.color + '25' }]}>
                                <Ionicons name="business" size={20} color={c.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.companyName}>{c.name}</Text>
                                {c.cnpj && <Text style={styles.companyCnpj}>CNPJ: {c.cnpj}</Text>}
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color={Colors.expense} />
                <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 56 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.text },
    userBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
    userInitial: { color: Colors.white, fontWeight: '700', fontSize: 16 },
    menuGrid: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.lg },
    menuItem: { flex: 1, alignItems: 'center', gap: 8 },
    menuIcon: { width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    menuLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
    section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
    addLink: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
    emptyText: { color: Colors.textMuted, fontSize: 13 },
    budgetCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm },
    budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    budgetName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
    budgetPct: { fontSize: 13, fontWeight: '700' },
    progressBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    budgetFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    budgetSpent: { fontSize: 12, color: Colors.textSecondary },
    budgetTotal: { fontSize: 12, color: Colors.textMuted },
    recCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
    recIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    recDesc: { fontSize: 14, color: Colors.text, fontWeight: '500' },
    recFreq: { fontSize: 12, color: Colors.textSecondary },
    recAmount: { fontSize: 14, fontWeight: '700' },
    companyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
    companyIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    companyName: { fontSize: 14, color: Colors.text, fontWeight: '600' },
    companyCnpj: { fontSize: 12, color: Colors.textSecondary },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.md },
    logoutText: { color: Colors.expense, fontWeight: '600', fontSize: 15 },
});
