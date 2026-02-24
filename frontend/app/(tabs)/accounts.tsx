import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const ACCOUNT_ICONS: Record<string, string> = {
    checking: 'business', savings: 'piggy-bank', credit_card: 'card',
    wallet: 'wallet', investment: 'trending-up',
};
const ACCOUNT_LABELS: Record<string, string> = {
    checking: 'Conta Corrente', savings: 'Poupança',
    credit_card: 'Cartão de Crédito', wallet: 'Carteira', investment: 'Investimento',
};

export default function AccountsScreen() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchData() {
        try { setAccounts(await api.getAccounts() as any[]); }
        catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    async function handleDelete(id: string) {
        Alert.alert('Excluir conta', 'Deseja excluir esta conta?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await api.deleteAccount(id); fetchData(); }
                    catch (e: any) { Alert.alert('Erro', e.message); }
                }
            },
        ]);
    }

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Contas</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={styles.cardsBtn} onPress={() => router.push('/cards' as any)}>
                        <Ionicons name="card-outline" size={20} color={Colors.primary} />
                        <Text style={styles.cardsBtnTxt}>Cartões</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/account/new' as any)}>
                        <Ionicons name="add" size={22} color={Colors.background} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Total */}
            <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Patrimônio Total</Text>
                <Text style={[styles.totalValue, { color: totalBalance >= 0 ? Colors.income : Colors.expense }]}>
                    {formatCurrency(totalBalance)}
                </Text>
                <Text style={styles.totalSub}>{accounts.length} conta{accounts.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* Accounts */}
            {loading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            ) : accounts.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="wallet-outline" size={48} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>Nenhuma conta cadastrada</Text>
                    <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/account/new' as any)}>
                        <Text style={styles.emptyBtnText}>+ Adicionar conta</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.list}>
                    {accounts.map((acc) => (
                        <View key={acc.id} style={styles.accountCard}>
                            <View style={[styles.accountIconWrap, { backgroundColor: acc.color + '25' }]}>
                                <Ionicons name={(ACCOUNT_ICONS[acc.type] || 'wallet') as any} size={24} color={acc.color} />
                            </View>
                            <View style={styles.accountInfo}>
                                <Text style={styles.accountName}>{acc.name}</Text>
                                <Text style={styles.accountType}>{acc.bank ? `${acc.bank} · ` : ''}{ACCOUNT_LABELS[acc.type] || acc.type}</Text>
                            </View>
                            <View style={styles.accountRight}>
                                <Text style={[styles.accountBalance, { color: acc.balance >= 0 ? Colors.text : Colors.expense }]}>
                                    {formatCurrency(acc.balance)}
                                </Text>
                                <TouchableOpacity onPress={() => handleDelete(acc.id)}>
                                    <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 56 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.text },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    totalCard: {
        marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
        borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    },
    totalLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    totalValue: { fontSize: 32, fontWeight: '800', marginVertical: Spacing.sm },
    totalSub: { fontSize: 12, color: Colors.textMuted },
    list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
    accountCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
        borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md,
    },
    accountIconWrap: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    accountInfo: { flex: 1 },
    accountName: { fontSize: 15, fontWeight: '600', color: Colors.text },
    accountType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    accountRight: { alignItems: 'flex-end', gap: 6 },
    accountBalance: { fontSize: 15, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
    emptyText: { color: Colors.textSecondary, fontSize: 15 },
    emptyBtn: { backgroundColor: Colors.primary + '20', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    emptyBtnText: { color: Colors.primary, fontWeight: '600' },
    cardsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
    cardsBtnTxt: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
});
