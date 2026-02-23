import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function TransactionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [tx, setTx] = useState<any>(null);
    const [cat, setCat] = useState<any>(null);
    const [acc, setAcc] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
        Alert.alert('Excluir', 'Deseja excluir esta transação?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await api.deleteTransaction(id); router.back(); }
                    catch (e: any) { Alert.alert('Erro', e.message); }
                }
            },
        ]);
    }

    if (loading) return <View style={styles.container}><ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} /></View>;
    if (!tx) return <View style={styles.container}><Text style={{ color: Colors.textSecondary, margin: 40 }}>Transação não encontrada</Text></View>;

    const date = new Date(tx.date);

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Detalhe</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.expense} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Main Amount */}
                <View style={[styles.amountCard, { backgroundColor: tx.type === 'income' ? Colors.income + '15' : Colors.expense + '15' }]}>
                    <View style={[styles.typeIcon, { backgroundColor: tx.type === 'income' ? Colors.income : Colors.expense }]}>
                        <Ionicons name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'} size={24} color="#fff" />
                    </View>
                    <Text style={[styles.amount, { color: tx.type === 'income' ? Colors.income : Colors.expense }]}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                    <Text style={styles.description}>{tx.description}</Text>
                    <Text style={styles.date}>{date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                </View>

                {/* Details */}
                {[
                    { label: 'Categoria', value: cat?.name || '—', icon: cat?.icon, color: cat?.color },
                    { label: 'Conta', value: acc?.name || '—', icon: 'wallet', color: acc?.color },
                    { label: 'Tipo', value: tx.type === 'income' ? 'Receita' : 'Despesa', icon: null, color: null },
                ].map(item => (
                    <View key={item.label} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{item.label}</Text>
                        <View style={styles.detailValueRow}>
                            {item.icon && <Ionicons name={item.icon as any} size={14} color={item.color || Colors.textSecondary} />}
                            <Text style={styles.detailValue}>{item.value}</Text>
                        </View>
                    </View>
                ))}

                {tx.notes && (
                    <View style={styles.notes}>
                        <Text style={styles.detailLabel}>Observações</Text>
                        <Text style={styles.notesText}>{tx.notes}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    closeBtn: { padding: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: Radius.full },
    title: { fontSize: 17, fontWeight: '700', color: Colors.text },
    deleteBtn: { padding: Spacing.sm, backgroundColor: Colors.expense + '20', borderRadius: Radius.full },
    content: { padding: Spacing.lg, gap: Spacing.sm },
    amountCard: { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    typeIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    amount: { fontSize: 36, fontWeight: '800' },
    description: { fontSize: 16, color: Colors.text, fontWeight: '500' },
    date: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.md },
    detailLabel: { fontSize: 13, color: Colors.textSecondary },
    detailValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailValue: { fontSize: 14, color: Colors.text, fontWeight: '500' },
    notes: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
    notesText: { fontSize: 14, color: Colors.text },
});
