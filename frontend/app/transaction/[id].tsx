import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function TransactionDetailScreen() {
    const { colors } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [tx, setTx] = useState<any>(null);
    const [cat, setCat] = useState<any>(null);
    const [acc, setAcc] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const styles = s(colors);

    useEffect(() => {
        async function load() {
            try {
                const [txs, cats, accs] = await Promise.all([
                    api.getTransactions({}) as Promise<any[]>,
                    api.getCategories() as Promise<any[]>,
                    api.getAccounts() as Promise<any[]>,
                ]);
                const found = txs.find(t => t.id === id);
                if (found) {
                    setTx(found);
                    setCat(cats.find(c => c.id === found.category_id));
                    setAcc(accs.find(a => a.id === found.account_id));
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, [id]);

    async function handleDelete() {
        if (tx.recurring_id) {
            Alert.alert(
                'Lançamento Recorrente',
                'Este é um lançamento automático. Como deseja excluí-lo?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Apenas este',
                        style: 'destructive',
                        onPress: async () => {
                            try { await api.deleteTransaction(id, 'single'); router.back(); }
                            catch (e: any) { Alert.alert('Erro', e.message); }
                        }
                    },
                    {
                        text: 'Este e próximos',
                        style: 'destructive',
                        onPress: async () => {
                            try { await api.deleteTransaction(id, 'future'); router.back(); }
                            catch (e: any) { Alert.alert('Erro', e.message); }
                        }
                    },
                    {
                        text: 'Toda a série',
                        style: 'destructive',
                        onPress: async () => {
                            try { await api.deleteTransaction(id, 'series'); router.back(); }
                            catch (e: any) { Alert.alert('Erro', e.message); }
                        }
                    }
                ]
            );
        } else {
            Alert.alert('Excluir Transação', 'A exclusão é permanente e não poderá ser desfeita.', [
                { text: 'Manter', style: 'cancel' },
                {
                    text: 'Excluir', style: 'destructive', onPress: async () => {
                        try { await api.deleteTransaction(id); router.back(); }
                        catch (e: any) { Alert.alert('Erro', e.message); }
                    }
                },
            ]);
        }
    }

    if (loading) return (
        <View style={[styles.container, { justifyContent: 'center' }]}>
            <ActivityIndicator color={colors.primary} size="large" />
        </View>
    );

    if (!tx) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '600' }}>Transação não encontrada</Text>
        </View>
    );

    const date = new Date(tx.date);
    const isIncome = tx.type === 'income';

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Detalhes</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={22} color={colors.expense} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Main Amount Card */}
                <View style={[styles.amountCard, { backgroundColor: isIncome ? colors.income + '10' : colors.expense + '10' }]}>
                    <View style={[styles.typeBadge, { backgroundColor: isIncome ? colors.income : colors.expense }]}>
                        <Ionicons name={isIncome ? 'chevron-down' : 'chevron-up'} size={24} color={colors.white} />
                    </View>
                    <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
                        {isIncome ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </Text>
                    <Text style={styles.description}>{tx.description}</Text>
                    <View style={styles.dateLabel}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.dateText}>{date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.detailsList}>
                    {[
                        { label: 'Categoria', value: cat?.name || 'Sem Categoria', icon: cat?.icon || 'grid-outline', color: cat?.color },
                        { label: 'Conta de Fluxo', value: acc?.name || '—', icon: 'wallet-outline', color: acc?.color || colors.primary },
                        { label: 'Modalidade', value: isIncome ? 'Receita' : 'Despesa', icon: isIncome ? 'trending-up' : 'trending-down', color: isIncome ? colors.income : colors.expense },
                    ].map((item, idx) => (
                        <View key={idx} style={styles.detailRow}>
                            <View style={[styles.detailIcon, { backgroundColor: (item.color || colors.primary) + '15' }]}>
                                <Ionicons name={item.icon as any} size={18} color={item.color || colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>{item.label}</Text>
                                <Text style={styles.detailValue}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {tx.notes && (
                    <View style={styles.notesSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
                            <Text style={styles.sectionTitle}>Observações</Text>
                        </View>
                        <View style={styles.notesCard}>
                            <Text style={styles.notesText}>{tx.notes}</Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    title: { fontSize: 18, fontWeight: '900', color: colors.text },
    deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.expense + '15', alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 24 },

    amountCard: { borderRadius: 32, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border },
    typeBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    amount: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
    description: { fontSize: 18, color: colors.text, fontWeight: '800', textAlign: 'center' },
    dateLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    dateText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },

    detailsList: { gap: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border },
    detailIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    detailLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 15, color: colors.text, fontWeight: '800', marginTop: 1 },

    notesSection: { gap: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
    sectionTitle: { fontSize: 13, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase' },
    notesCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
    notesText: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, fontWeight: '500' },
});
