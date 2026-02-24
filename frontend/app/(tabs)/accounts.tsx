import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

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
    const { mode, colors } = useTheme();
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
    const styles = s(colors);

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Contas</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={styles.cardsBtn} onPress={() => router.push('/cards' as any)}>
                        <Ionicons name="card-outline" size={20} color={colors.primary} />
                        <Text style={styles.cardsBtnTxt}>Cartões</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/account/new' as any)}>
                        <Ionicons name="add" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Total */}
            <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Patrimônio Total</Text>
                <Text style={[styles.totalValue, { color: totalBalance >= 0 ? colors.income : colors.expense }]}>
                    {formatCurrency(totalBalance)}
                </Text>
                <Text style={styles.totalSub}>{accounts.length} conta{accounts.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* Accounts */}
            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : accounts.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>Nenhuma conta cadastrada</Text>
                    <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/account/new' as any)}>
                        <Text style={styles.emptyBtnText}>+ Adicionar conta</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.list}>
                    {accounts.map((acc) => (
                        <View key={acc.id} style={styles.accountCard}>
                            <View style={[styles.accountIconWrap, { backgroundColor: acc.color + '20' }]}>
                                <Ionicons name={(ACCOUNT_ICONS[acc.type] || 'wallet') as any} size={24} color={acc.color} />
                            </View>
                            <View style={styles.accountInfo}>
                                <Text style={styles.accountName}>{acc.name}</Text>
                                <Text style={styles.accountType}>{acc.bank ? `${acc.bank} · ` : ''}{ACCOUNT_LABELS[acc.type] || acc.type}</Text>
                            </View>
                            <View style={styles.accountRight}>
                                <Text style={[styles.accountBalance, { color: acc.balance >= 0 ? colors.text : colors.expense }]}>
                                    {formatCurrency(acc.balance)}
                                </Text>
                                <TouchableOpacity onPress={() => handleDelete(acc.id)}>
                                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
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

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -1 },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

    totalCard: {
        marginHorizontal: 20, backgroundColor: colors.surface,
        borderRadius: 28, padding: 24, marginBottom: 24,
        borderWidth: 1, borderColor: colors.border, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3
    },
    totalLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    totalValue: { fontSize: 34, fontWeight: '900', marginVertical: 8, letterSpacing: -1 },
    totalSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

    list: { paddingHorizontal: 20, gap: 12 },
    accountCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
        borderRadius: 20, padding: 16, gap: 16, borderWidth: 1, borderColor: colors.border
    },
    accountIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    accountInfo: { flex: 1 },
    accountName: { fontSize: 16, fontWeight: '800', color: colors.text },
    accountType: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
    accountRight: { alignItems: 'flex-end', gap: 8 },
    accountBalance: { fontSize: 16, fontWeight: '900' },

    empty: { alignItems: 'center', paddingTop: 60, gap: 18 },
    emptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
    emptyBtn: { backgroundColor: colors.primary + '15', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.primary + '30' },
    emptyBtnText: { color: colors.primary, fontWeight: '800' },

    cardsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    cardsBtnTxt: { color: colors.primary, fontSize: 13, fontWeight: '800' },
});
