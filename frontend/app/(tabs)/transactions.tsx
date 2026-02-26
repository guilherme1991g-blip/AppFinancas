import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import PaymentModal from '@/components/PaymentModal';

function formatCurrency(v: number) {
    const absValue = Math.abs(v);
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(absValue);
    return v < 0 ? `-${formatted}` : formatted;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FILTERS = ['Todos', 'Receitas', 'Despesas'];

export default function TransactionsScreen() {
    const { mode, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [filter, setFilter] = useState('Todos');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    async function fetchData() {
        try {
            const type = filter === 'Receitas' ? 'income' : filter === 'Despesas' ? 'expense' : undefined;
            const [txs, cats, accs] = await Promise.all([
                api.getTransactions({ month, year, limit: 100, ...(type ? { type } : {}) }) as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
            ]);

            const cards = accs.filter(a => a.type === 'credit_card');
            const cardBills: any[] = [];

            // Only show bills that actually exist (filtered by backend)
            if (filter === 'Todos' || filter === 'Despesas') {
                for (const card of cards) {
                    const bills = await api.getBills(card.id) as any[];
                    // Backend already filters out empty months or invalid totals
                    const bill = bills.find(b => b.month === month && b.year === year);
                    if (bill) {
                        cardBills.push({
                            ...bill,
                            isBill: true,
                            cardName: card.name,
                            color: card.color
                        });
                    }
                }
            }

            const cardAccIds = new Set(cards.map(c => c.id));
            const filteredTxs = txs.filter(t => !cardAccIds.has(t.account_id));

            setTransactions([...cardBills, ...filteredTxs]);
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

    const styles = s(colors);

    async function handleDelete(item: any) {
        if (item.recurring_id) {
            Alert.alert(
                'Lançamento Recorrente',
                'Como deseja excluir este lançamento automático?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Apenas este',
                        style: 'destructive',
                        onPress: async () => {
                            try { await api.deleteTransaction(item.id, 'single'); fetchData(); }
                            catch (e: any) { Alert.alert('Erro', e.message); }
                        }
                    },
                    {
                        text: 'Este e todos pendentes',
                        style: 'destructive',
                        onPress: async () => {
                            try { await api.deleteTransaction(item.id, 'future'); fetchData(); }
                            catch (e: any) { Alert.alert('Erro', e.message); }
                        }
                    },
                    {
                        text: 'Todos (incluindo pagos)',
                        style: 'destructive',
                        onPress: async () => {
                            try { await api.deleteTransaction(item.id, 'series'); fetchData(); }
                            catch (e: any) { Alert.alert('Erro', e.message); }
                        }
                    }
                ]
            );
        } else {
            Alert.alert('Excluir', 'Deseja excluir esta transação?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir', style: 'destructive', onPress: async () => {
                        try { await api.deleteTransaction(item.id); fetchData(); }
                        catch (e: any) { Alert.alert('Erro', e.message); }
                    }
                },
            ]);
        }
    }

    function handlePay(item: any) {
        setSelectedItem(item);
        setShowPaymentModal(true);
    }

    const renderItem = ({ item: it }: { item: any }) => {
        let statusColor = colors.primary;
        let isPaid = false;
        let isOverdue = false;

        if (it.isBill) {
            isPaid = it.status === 'paid';
            isOverdue = it.status === 'overdue';
            statusColor = isPaid ? colors.income : (isOverdue ? colors.expense : colors.primary);
        } else {
            isPaid = it.is_paid;
            isOverdue = !isPaid && new Date(it.date) < new Date();
            statusColor = isPaid ? colors.income : (isOverdue ? colors.expense : colors.primary);
        }

        const itemBg = statusColor + (mode === 'dark' ? '20' : '12');

        if (it.isBill) {
            return (
                <TouchableOpacity
                    style={[styles.txItem, { backgroundColor: itemBg, borderColor: statusColor + '20', borderLeftWidth: 4, borderLeftColor: statusColor }]}
                    onPress={() => router.push({ pathname: '/cards/bill-details', params: { billId: it.id, name: `${it.month}/${it.year}` } } as any)}
                >
                    <View style={[styles.txIcon, { backgroundColor: (it.color || colors.primary) + '15' }]}>
                        <Ionicons name="receipt" size={22} color={it.color || colors.primary} />
                    </View>
                    <View style={styles.txInfo}>
                        <Text style={styles.txDesc} numberOfLines={1}>Fatura {it.cardName}</Text>
                        <Text style={styles.txMeta}>FECHAMENTO EM {it.month}/{it.year}</Text>
                    </View>
                    <View style={styles.txRight}>
                        <Text style={[styles.txAmount, { color: it.amount < 0 ? colors.income : colors.text }]}>
                            {formatCurrency(it.amount)}
                        </Text>
                        <View style={[styles.statusBadgeSmall, {
                            backgroundColor: it.status === 'paid' ? colors.income + '15' :
                                it.status === 'overdue' ? colors.expense + '15' : colors.primary + '15'
                        }]}>
                            <Text style={[styles.statusTextSmall, {
                                color: it.status === 'paid' ? colors.income :
                                    it.status === 'overdue' ? colors.expense : colors.primary
                            }]}>
                                {it.status === 'paid' ? 'Paga' :
                                    it.status === 'overdue' ? 'Vencida' :
                                        it.status === 'closed' ? 'Fechada' : 'Aberta'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        const cat = getCat(it.category_id);
        const date = new Date(it.date);
        return (
            <TouchableOpacity
                style={[styles.txItem, { backgroundColor: itemBg, borderColor: statusColor + '20', borderLeftWidth: 4, borderLeftColor: statusColor }]}
                onPress={() => router.push(`/transaction/${it.id}` as any)}
            >
                <View style={[styles.txIcon, { backgroundColor: (cat?.color || colors.textMuted) + '20' }]}>
                    <Ionicons name={(cat?.icon || 'ellipsis-horizontal') as any} size={20} color={cat?.color || colors.textMuted} />
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{it.description}</Text>
                    <Text style={styles.txMeta}>{cat?.name || '—'} · {date.getDate()}/{MONTHS[date.getMonth()]}</Text>
                </View>
                <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: it.type === 'income' ? colors.income : colors.expense }]}>
                        {it.type === 'income' ? '+' : ''}{formatCurrency(it.amount)}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {(() => {
                            const statusText = isPaid ? 'Pago' : (isOverdue ? 'Vencido' : 'Pendente');

                            return (
                                <View style={[styles.statusBadgeSmall, { backgroundColor: statusColor + '15', marginTop: 0 }]}>
                                    <Text style={[styles.statusTextSmall, { color: statusColor }]}>{statusText}</Text>
                                </View>
                            );
                        })()}

                        {!it.is_paid && (
                            <TouchableOpacity
                                style={[styles.miniPayBtn, { backgroundColor: it.type === 'income' ? colors.income : colors.expense }]}
                                onPress={() => handlePay(it)}
                            >
                                <Text style={styles.miniPayBtnText}>{it.type === 'income' ? 'Receber' : 'Pagar'}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(it)} style={styles.deleteBtn}>
                            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <Text style={styles.title}>Transações</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/transaction/new' as any)}>
                    <Ionicons name="add" size={24} color={colors.white} />
                </TouchableOpacity>
            </View>

            {/* Month selector */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={prevMonth} style={styles.arrow}><Ionicons name="chevron-back" size={18} color={colors.text} /></TouchableOpacity>
                <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.arrow}><Ionicons name="chevron-forward" size={18} color={colors.text} /></TouchableOpacity>
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
                <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>Nenhuma transação</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <PaymentModal
                visible={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={() => fetchData()}
                initialAmount={selectedItem?.amount || 0}
                title={selectedItem?.type === 'income' ? 'Receber' : 'Pagar'}
                type="transaction"
                id={selectedItem?.id || ''}
            />
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -1 },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
    arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    monthText: { fontSize: 16, fontWeight: '800', color: colors.text, width: 110, textAlign: 'center' },

    filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
    filterBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '800' },
    filterTextActive: { color: colors.white, fontWeight: '900' },

    txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12, gap: 16, borderWidth: 1, borderColor: colors.border },
    txIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 16, fontWeight: '800', color: colors.text },
    txMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
    txRight: { alignItems: 'flex-end', gap: 10 },
    txAmount: { fontSize: 16, fontWeight: '900' },

    miniPayBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
    miniPayBtnText: { color: colors.white, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight, borderRadius: 10 },

    statusBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    statusTextSmall: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

    empty: { alignItems: 'center', paddingTop: 80, gap: 18 },
    emptyText: { color: colors.textSecondary, fontSize: 16, fontWeight: '700' },
});
