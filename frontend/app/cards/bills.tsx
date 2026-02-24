import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, FlatList
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const STATUS_LABELS: Record<string, string> = {
    open: 'Aberta',
    closed: 'Fechada',
    paid: 'Paga',
    overdue: 'Atrasada',
};

export default function CardBillsScreen() {
    const { colors } = useTheme();
    const { id, name } = useLocalSearchParams<{ id: string, name?: string }>();
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const STATUS_COLORS: Record<string, string> = {
        open: colors.primary,
        closed: '#F59E0B',
        paid: colors.income,
        overdue: colors.expense,
    };

    const styles = s(colors);

    useEffect(() => {
        async function load() {
            try {
                const data = await api.getBills(id!) as any[];
                setBills(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    const renderBill = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.billCard, item.status === 'overdue' && { backgroundColor: colors.expense + '05', borderColor: colors.expense + '30' }]}
            onPress={() => router.push({ pathname: '/cards/bill-details', params: { billId: item.id, name: `${item.month}/${item.year}` } } as any)}
        >
            <View style={styles.billInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.billDate}>{`${new Date(item.closing_date).toLocaleString('pt-BR', { month: 'long' })} / ${item.year}`}</Text>
                    {item.status === 'overdue' && (
                        <Ionicons name="alert-circle" size={18} color={colors.expense} />
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '15', borderColor: STATUS_COLORS[item.status] + '30' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{STATUS_LABELS[item.status]}</Text>
                </View>
            </View>
            <View style={styles.billAmountWrap}>
                <Text style={[styles.billAmount, item.status === 'overdue' && { color: colors.expense }]}>{formatCurrency(item.amount)}</Text>
                <View style={styles.chevronWrap}>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: `Faturas - ${name || 'Cartão'}`,
                headerTransparent: true,
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '800' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={() => router.push(`/account/${id}` as any)} style={{ marginRight: 20 }}>
                        <Ionicons name="create-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.headerSpacer} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : bills.length === 0 ? (
                <View style={styles.center}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="receipt-outline" size={64} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Nenhuma fatura encontrada</Text>
                    <Text style={styles.emptySub}>As faturas aparecerão aqui conforme você lançar despesas no seu cartão.</Text>
                </View>
            ) : (
                <FlatList
                    data={bills}
                    renderItem={renderBill}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSpacer: { height: 110 },
    backBtn: { marginLeft: 0, paddingRight: 20 },
    list: { padding: 20, gap: 16 },
    billCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface, borderRadius: 24, padding: 20,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    billInfo: { gap: 8 },
    billDate: { fontSize: 17, fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    billAmountWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    billAmount: { fontSize: 18, fontWeight: '900', color: colors.text },
    chevronWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
    emptySub: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
});
