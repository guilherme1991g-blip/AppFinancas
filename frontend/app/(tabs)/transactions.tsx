import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert, Switch, Modal, ScrollView
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import PaymentModal from '@/components/PaymentModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TX_MONTHS: Record<string, string[]> = {
    'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    'en': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    'es': ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
};


export default function TransactionsScreen() {
    const { mode, colors } = useTheme();
    const { t, fmt, language } = useLocale();
    const MONTHS = TX_MONTHS[language] || TX_MONTHS['pt-BR'];
    const insets = useSafeAreaInsets();
    const now = new Date();

    // State
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [transactions, setTransactions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Selection state for payment
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Filter state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState({
        type: 'Todos',
        accountId: 'Todas',
        categoryId: 'Todas',
        status: 'Todos',
        isCustomDate: false,
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date()
    });
    const [expandedSections, setExpandedSections] = useState<string[]>(['type']);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const toggleSection = (id: string) => {
        setExpandedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    async function fetchData() {
        try {
            const type = filters.type === 'Receitas' ? 'income' : filters.type === 'Despesas' ? 'expense' : undefined;
            const isPaid = filters.status === 'Pagos' ? true : filters.status === 'Pendentes' ? false : undefined;

            const params: any = {
                limit: 200,
                ...(type ? { type } : {}),
                ...(isPaid !== undefined ? { is_paid: isPaid } : {}),
                ...(filters.accountId !== 'Todas' ? { account_id: filters.accountId } : {}),
                ...(filters.categoryId !== 'Todas' ? { category_id: filters.categoryId } : {})
            };

            if (filters.isCustomDate) {
                params.start_date = filters.startDate.toISOString();
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                params.end_date = end.toISOString();
            } else {
                params.month = month;
                params.year = year;
            }

            const [txs, cats, accs] = await Promise.all([
                api.getTransactions(params) as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
            ]);

            setCategories(cats);
            setAccounts(accs);

            const cards = accs.filter(a => a.type === 'credit_card');
            const cardBills: any[] = [];

            // Only show bills if "Receitas" filter is NOT active (bills are expenses/debts)
            if (filters.type !== 'Receitas') {
                for (const card of cards) {
                    // Skip if filtering by specific account and it's not this card
                    if (filters.accountId !== 'Todas' && filters.accountId !== card.id) continue;

                    const bills = await api.getBills(card.id) as any[];
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

            // Sort everything by date descending
            const combined = [...cardBills, ...filteredTxs].sort((a, b) => {
                const dateA = a.isBill ? new Date(a.closing_date).getTime() : new Date(a.date).getTime();
                const dateB = b.isBill ? new Date(b.closing_date).getTime() : new Date(b.date).getTime();
                return dateB - dateA;
            });

            setTransactions(combined);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [month, year, filters]));

    const togglePayment = async (item: any, value: boolean) => {
        if (value) {
            // Opening payment
            setSelectedItem(item);
            setShowPaymentModal(true);
        } else {
            // Closing/Unpaying
            if (item.isBill) {
                Alert.alert("Ação não permitida", "Pagamentos de fatura de cartão não podem ser desfeitos manualmente por aqui.");
                return;
            }

            Alert.alert("Desfazer Pagamento", "Deseja marcar este lançamento como pendente novamente?", [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim",
                    onPress: async () => {
                        try {
                            await api.unpayTransaction(item.id);
                            fetchData();
                        } catch (e: any) {
                            Alert.alert("Erro", e.message);
                        }
                    }
                }
            ]);
        }
    };

    async function handleDelete(item: any) {
        const title = item.isBill ? 'Excluir Fatura' : 'Excluir';
        const msg = item.isBill ? 'Deseja excluir os dados físicos desta fatura? Isso não removerá as transações vinculadas.' : 'Deseja excluir esta transação?';

        Alert.alert(title, msg, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        if (item.isBill) {
                            // Only delete physical bill if needed, but usually we just want to delete txs
                            Alert.alert("Aviso", "IDs de faturas físicas não podem ser deletados desta forma. Delete as transações internas.");
                        } else {
                            await api.deleteTransaction(item.id);
                        }
                        fetchData();
                    }
                    catch (e: any) { Alert.alert('Erro', e.message); }
                }
            },
        ]);
    }

    const renderItem = ({ item: it }: { item: any }) => {
        const statusColor = it.isBill ?
            (it.status === 'paid' ? colors.income : (it.status === 'overdue' ? colors.expense : (it.status === 'partially_paid' ? colors.warning : colors.primary))) :
            (it.is_paid ? colors.income : (new Date(it.date) < new Date() ? colors.expense : colors.primary));

        const cat = categories.find(c => c.id === it.category_id);
        const date = new Date(it.isBill ? it.closing_date : it.date);
        const isPaid = it.isBill ? it.status === 'paid' : it.is_paid;

        return (
            <TouchableOpacity
                style={[styles.txItem, { borderLeftColor: statusColor }]}
                onPress={() => it.isBill ?
                    router.push({ pathname: '/cards/bill-details', params: { billId: it.id, name: `${it.month}/${it.year}` } } as any) :
                    router.push(`/transaction/${it.id}` as any)
                }
            >
                <View style={[styles.txIcon, { backgroundColor: (it.isBill ? statusColor : (cat?.color || colors.textMuted)) + '15' }]}>
                    <Ionicons
                        name={it.isBill ? "receipt" : (cat?.icon || 'ellipsis-horizontal') as any}
                        size={18}
                        color={it.isBill ? statusColor : (cat?.color || colors.textMuted)}
                    />
                </View>

                <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{it.isBill ? `Fatura ${it.cardName}` : it.description}</Text>
                    <Text style={styles.txMeta}>
                        {it.isBill ? `FECHAMENTO ${date.getDate()}/${MONTHS[date.getMonth()]}` : `${cat?.name || '—'} · ${date.getDate()}/${MONTHS[date.getMonth()]}`}
                    </Text>
                </View>

                <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: it.type === 'income' ? colors.income : (it.amount < 0 && it.isBill ? colors.income : colors.text) }]}>
                        {it.type === 'income' ? '+' : ''}{fmt(it.amount)}
                    </Text>

                    <View style={styles.txActions}>
                        <Switch
                            value={isPaid}
                            onValueChange={(val) => togglePayment(it, val)}
                            trackColor={{ false: colors.border, true: colors.income + '80' }}
                            thumbColor={isPaid ? colors.income : colors.textMuted}
                            ios_backgroundColor={colors.border}
                            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }], marginRight: -8 }}
                        />
                        <TouchableOpacity onPress={() => handleDelete(it)} style={styles.deleteBtn}>
                            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const styles = s(colors, mode);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <View>
                    <Text style={styles.title}>{t('transactions.title')}</Text>
                    <Text style={styles.subtitle}>
                        {filters.isCustomDate
                            ? `${format(filters.startDate, 'dd/MM')} — ${format(filters.endDate, 'dd/MM')}`
                            : `${MONTHS[month - 1]} ${year}`
                        }
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowFilterModal(true)}>
                        <Ionicons name="filter-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/transaction/new' as any)}>
                        <Ionicons name="add" size={22} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Quick Month Picker */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={() => { setFilters(f => ({ ...f, isCustomDate: false })); if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }} style={styles.arrow}><Ionicons name="chevron-back" size={18} color={colors.text} /></TouchableOpacity>
                <TouchableOpacity style={styles.monthLabel} onPress={() => { setFilters(f => ({ ...f, isCustomDate: false })); setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}>
                    <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setFilters(f => ({ ...f, isCustomDate: false })); if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }} style={styles.arrow}><Ionicons name="chevron-forward" size={18} color={colors.text} /></TouchableOpacity>
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
                            <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Filter Modal */}
            <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.filterModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filtros</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.filterContent}>
                            {/* Tipo Section */}
                            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('type')}>
                                <Text style={styles.filterLabel}>Tipo de Lançamento</Text>
                                <Ionicons name={expandedSections.includes('type') ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                            {expandedSections.includes('type') && (
                                <View style={styles.filterGroup}>
                                    {['Todos', 'Receitas', 'Despesas'].map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.chip, filters.type === t && styles.chipActive]}
                                            onPress={() => setFilters(prev => ({ ...prev, type: t }))}
                                        >
                                            <Text style={[styles.chipText, filters.type === t && styles.chipTextActive]}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Status Section */}
                            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('status')}>
                                <Text style={styles.filterLabel}>Status de Pagamento</Text>
                                <Ionicons name={expandedSections.includes('status') ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                            {expandedSections.includes('status') && (
                                <View style={styles.filterGroup}>
                                    {['Todos', 'Pagos', 'Pendentes'].map(s => (
                                        <TouchableOpacity
                                            key={s}
                                            style={[styles.chip, filters.status === s && styles.chipActive]}
                                            onPress={() => setFilters(prev => ({ ...prev, status: s }))}
                                        >
                                            <Text style={[styles.chipText, filters.status === s && styles.chipTextActive]}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Periodo Section */}
                            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('period')}>
                                <Text style={styles.filterLabel}>Período</Text>
                                <Ionicons name={expandedSections.includes('period') ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                            {expandedSections.includes('period') && (
                                <View style={{ gap: 12 }}>
                                    <View style={styles.filterGroup}>
                                        {['Mês Atual', 'Personalizado'].map(p => (
                                            <TouchableOpacity
                                                key={p}
                                                style={[styles.chip, (p === 'Personalizado' ? filters.isCustomDate : !filters.isCustomDate) && styles.chipActive]}
                                                onPress={() => setFilters(prev => ({ ...prev, isCustomDate: p === 'Personalizado' }))}
                                            >
                                                <Text style={[styles.chipText, (p === 'Personalizado' ? filters.isCustomDate : !filters.isCustomDate) && styles.chipTextActive]}>{p}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {filters.isCustomDate && (
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowStartPicker(true)}>
                                                <Text style={styles.dateSelectorLabel}>Início</Text>
                                                <Text style={styles.dateSelectorVal}>{format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR })}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowEndPicker(true)}>
                                                <Text style={styles.dateSelectorLabel}>Fim</Text>
                                                <Text style={styles.dateSelectorVal}>{format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR })}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {showStartPicker && (
                                        <DateTimePicker
                                            value={filters.startDate}
                                            mode="date"
                                            display="default"
                                            onChange={(e, d) => { setShowStartPicker(false); if (d) setFilters(p => ({ ...p, startDate: d })); }}
                                        />
                                    )}
                                    {showEndPicker && (
                                        <DateTimePicker
                                            value={filters.endDate}
                                            mode="date"
                                            display="default"
                                            onChange={(e, d) => { setShowEndPicker(false); if (d) setFilters(p => ({ ...p, endDate: d })); }}
                                        />
                                    )}
                                </View>
                            )}

                            {/* Conta Section */}
                            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('account')}>
                                <Text style={styles.filterLabel}>Conta / Cartão</Text>
                                <Ionicons name={expandedSections.includes('account') ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                            {expandedSections.includes('account') && (
                                <View style={styles.filterGrid}>
                                    <TouchableOpacity
                                        style={[styles.chip, filters.accountId === 'Todas' && styles.chipActive]}
                                        onPress={() => setFilters(prev => ({ ...prev, accountId: 'Todas' }))}
                                    >
                                        <Text style={[styles.chipText, filters.accountId === 'Todas' && styles.chipTextActive]}>Todas</Text>
                                    </TouchableOpacity>
                                    {accounts.map(acc => (
                                        <TouchableOpacity
                                            key={acc.id}
                                            style={[styles.chip, filters.accountId === acc.id && styles.chipActive]}
                                            onPress={() => setFilters(prev => ({ ...prev, accountId: acc.id }))}
                                        >
                                            <Text style={[styles.chipText, filters.accountId === acc.id && { color: colors.white }]}>{acc.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Categoria Section */}
                            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('category')}>
                                <Text style={styles.filterLabel}>Categoria</Text>
                                <Ionicons name={expandedSections.includes('category') ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                            {expandedSections.includes('category') && (
                                <View style={styles.filterGrid}>
                                    <TouchableOpacity
                                        style={[styles.chip, filters.categoryId === 'Todas' && styles.chipActive]}
                                        onPress={() => setFilters(prev => ({ ...prev, categoryId: 'Todas' }))}
                                    >
                                        <Text style={[styles.chipText, filters.categoryId === 'Todas' && styles.chipTextActive]}>Todas</Text>
                                    </TouchableOpacity>
                                    {categories.map(cat => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.chip, filters.categoryId === cat.id && styles.chipActive]}
                                            onPress={() => setFilters(prev => ({ ...prev, categoryId: cat.id }))}
                                        >
                                            <Text style={[styles.chipText, filters.categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                            <Text style={styles.applyBtnText}>Ver Resultados</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <PaymentModal
                visible={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={() => fetchData()}
                initialAmount={Math.abs(selectedItem?.amount || 0)}
                title={selectedItem?.title || ''}
                type={selectedItem?.isBill ? 'bill' : 'transaction'}
                id={selectedItem?.id || ''}
                accountId={selectedItem?.account_id}
            />
        </View>
    );
}

const s = (colors: any, mode: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '700', marginTop: -2 },
    headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 12 },
    arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 10 },
    monthLabel: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.surface },
    monthText: { fontSize: 14, fontWeight: '800', color: colors.text },

    txItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: 16,
        paddingVertical: 10, paddingHorizontal: 12,
        marginBottom: 8, gap: 12,
        borderWidth: 1, borderColor: colors.border,
        borderLeftWidth: 4
    },
    txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 14, fontWeight: '800', color: colors.text },
    txMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1, fontWeight: '700', textTransform: 'uppercase' },
    txRight: { alignItems: 'flex-end', justifyContent: 'center' },
    txAmount: { fontSize: 15, fontWeight: '900' },
    txActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    deleteBtn: { padding: 4, borderRadius: 8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    filterModal: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
    filterContent: { marginBottom: 20 },
    filterLabel: { fontSize: 14, fontWeight: '800', color: colors.textMuted, marginBottom: 12, marginTop: 16, textTransform: 'uppercase' },
    filterGroup: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
    chipTextActive: { color: colors.white, fontWeight: '800' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
    dateSelector: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
    dateSelectorLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    dateSelectorVal: { fontSize: 13, fontWeight: '700', color: colors.text },

    applyBtn: { backgroundColor: colors.primary, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    applyBtnText: { color: colors.white, fontSize: 16, fontWeight: '900' },

    empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
    emptyText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
});
