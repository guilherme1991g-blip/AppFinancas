import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FILTERS = ['Todos', 'Receitas', 'Despesas'];

export default function TransactionsScreen() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [filter, setFilter] = useState('Todos');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchData() {
        try {
            const type = filter === 'Receitas' ? 'income' : filter === 'Despesas' ? 'expense' : undefined;
            const [txs, cats] = await Promise.all([
                api.getTransactions({ month, year, limit: 100, ...(type ? { type } : {}) }) as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
            ]);
            setTransactions(txs);
            setCategories(cats);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [month, year, filter]));

    function prevMonth() {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    }
    function nextMonth() {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    }

    function getCat(id: string) { return categories.find(c => c.id === id); }

    async function handleDelete(id: string) {
        Alert.alert('Excluir', 'Deseja excluir esta transação?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await api.deleteTransaction(id); fetchData(); }
                    catch (e: any) { Alert.alert('Erro', e.message); }
                }
            },
        ]);
    }

    async function handlePay(id: string) {
        try {
            await api.payTransaction(id);
            fetchData();
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        }
    }

    const renderItem = ({ item: tx }: { item: any }) => {
        const cat = getCat(tx.category_id);
        const date = new Date(tx.date);
        return (
            <TouchableOpacity style={styles.txItem} onPress={() => router.push(`/transaction/${tx.id}` as any)}>
                <View style={[styles.txIcon, { backgroundColor: (cat?.color || '#636E72') + '25' }]}>
                    <Ionicons name={(cat?.icon || 'ellipsis-horizontal') as any} size={20} color={cat?.color || '#636E72'} />
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                    <Text style={styles.txMeta}>{cat?.name || '—'} · {date.getDate()}/{MONTHS[date.getMonth()]}</Text>
                </View>
                <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: tx.type === 'income' ? Colors.income : Colors.expense }]}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {!tx.is_paid && (
                            <TouchableOpacity
                                style={[styles.miniPayBtn, { backgroundColor: tx.type === 'income' ? Colors.income : Colors.expense }]}
                                onPress={() => handlePay(tx.id)}
                            >
                                <Text style={styles.miniPayBtnText}>{tx.type === 'income' ? 'Receber' : 'Pagar'}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(tx.id)} style={styles.deleteBtn}>
                            <Ionicons name="trash-outline" size={14} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Transações</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/transaction/new' as any)}>
                    <Ionicons name="add" size={22} color={Colors.background} />
                </TouchableOpacity>
            </View>

            {/* Month selector */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={styles.arrow}><Ionicons name="chevron-back" size={18} color={Colors.text} /></TouchableOpacity>
                <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.arrow}><Ionicons name="chevron-forward" size={18} color={Colors.text} /></TouchableOpacity>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {FILTERS.map(f => (
                    <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>Nenhuma transação</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 56 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.text },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    arrow: { padding: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: Radius.full },
    monthText: { fontSize: 15, fontWeight: '600', color: Colors.text, width: 90, textAlign: 'center' },
    filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
    filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.surfaceLight },
    filterActive: { backgroundColor: Colors.primary },
    filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    filterTextActive: { color: '#000', fontWeight: '700' },
    txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
    txIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 14, fontWeight: '600', color: Colors.text },
    txMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    txRight: { alignItems: 'flex-end', gap: 6 },
    txAmount: { fontSize: 14, fontWeight: '700' },
    miniPayBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    miniPayBtnText: { color: Colors.background, fontSize: 11, fontWeight: '800' },
    deleteBtn: { padding: 4 },
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
    emptyText: { color: Colors.textSecondary, fontSize: 15 },
});
