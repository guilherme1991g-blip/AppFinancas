import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, FlatList, Alert
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function BillDetailsScreen() {
    const { colors } = useTheme();
    const { billId, name } = useLocalSearchParams<{ billId: string, name: string }>();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

    const styles = s(colors);

    useEffect(() => {
        async function load() {
            try {
                const data = await api.getBillTransactions(billId!) as any[];
                setTransactions(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [billId]);

    const total = transactions.reduce((acc, t) => acc + t.amount, 0);

    const handlePay = async () => {
        Alert.alert(
            "Pagar Fatura",
            `Deseja pagar o valor total de ${formatCurrency(total)}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar",
                    onPress: async () => {
                        setPaying(true);
                        try {
                            const accounts = await api.getAccounts() as any[];
                            const payAcc = accounts.find(a => a.type !== 'credit_card');
                            if (!payAcc) throw new Error("Nenhuma conta encontrada para pagamento");

                            await api.payBill(billId!, payAcc.id);
                            Alert.alert("Sucesso", "Fatura paga com sucesso!");
                            router.back();
                        } catch (e: any) {
                            Alert.alert("Erro", e.message);
                        } finally {
                            setPaying(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.txRow}>
            <View style={styles.txIcon}>
                <Ionicons name="cart-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{item.description}</Text>
                <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
            </View>
            <Text style={styles.txAmount}>{formatCurrency(item.amount)}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: `Fatura ${name}`,
                headerTransparent: true,
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '800' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                )
            }} />
            <View style={styles.headerSpacer} />

            <View style={styles.summaryCard}>
                <View style={styles.summaryBadge}>
                    <Ionicons name="receipt" size={24} color={colors.primary} />
                </View>
                <Text style={styles.summaryLabel}>Total da Fatura</Text>
                <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
                <TouchableOpacity
                    style={[styles.payBtn, paying && { opacity: 0.7 }]}
                    onPress={handlePay}
                    disabled={paying}
                >
                    {paying ? <ActivityIndicator color={colors.white} /> : <Text style={styles.payBtnTxt}>Pagar Fatura</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Lançamentos</Text>
                <Text style={styles.txCount}>{transactions.length} itens</Text>
            </View>

            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : transactions.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="file-tray-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>Nenhum lançamento nesta fatura</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id || Math.random().toString()}
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
    backBtn: { paddingRight: 20 },
    summaryCard: {
        margin: 20, backgroundColor: colors.surface, borderRadius: 32,
        padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4
    },
    summaryBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    summaryLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    summaryValue: { color: colors.text, fontSize: 34, fontWeight: '900', marginVertical: 12 },
    payBtn: { backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    payBtnTxt: { color: colors.white, fontWeight: '800', fontSize: 16 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, marginTop: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    txCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    txIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary + '08', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 16, fontWeight: '700', color: colors.text },
    txDate: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
    txAmount: { fontSize: 16, fontWeight: '800', color: colors.text },

    empty: { alignItems: 'center', padding: 60, gap: 16 },
    emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' }
});
