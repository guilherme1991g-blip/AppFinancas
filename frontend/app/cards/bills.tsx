import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, FlatList
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const STATUS_LABELS: Record<string, string> = {
    open: 'Aberta',
    closed: 'Fechada',
    paid: 'Paga',
    overdue: 'Atrasada',
};

const STATUS_COLORS: Record<string, string> = {
    open: '#3B82F6',
    closed: '#F59E0B',
    paid: '#10B981',
    overdue: '#EF4444',
};

export default function CardBillsScreen() {
    const { id, name } = useLocalSearchParams<{ id: string, name?: string }>();
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            style={styles.billCard}
            onPress={() => router.push({ pathname: '/cards/bill-details', params: { billId: item.id, name: `${item.month}/${item.year}` } } as any)}
        >
            <View style={styles.billInfo}>
                <Text style={styles.billDate}>{`${new Date(item.closing_date).toLocaleString('pt-BR', { month: 'long' })} / ${item.year}`}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{STATUS_LABELS[item.status]}</Text>
                </View>
            </View>
            <View style={styles.billAmountWrap}>
                <Text style={styles.billAmount}>{formatCurrency(item.amount)}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: `Faturas - ${name || 'Cartão'}`, headerTransparent: true, headerTintColor: Colors.text }} />

            <View style={styles.headerSpacer} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.primary} size="large" />
                </View>
            ) : bills.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="receipt-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>Nenhuma fatura encontrada</Text>
                    <Text style={styles.emptySub}>As faturas aparecerão aqui conforme você lançar despesas.</Text>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerSpacer: { height: 100 },
    list: { padding: Spacing.lg, gap: Spacing.md },
    billCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
    },
    billInfo: { gap: 6 },
    billDate: { fontSize: 16, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    billAmountWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    billAmount: { fontSize: 16, fontWeight: '800', color: Colors.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 20 },
    emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 10 },
});
