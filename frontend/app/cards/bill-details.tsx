import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, FlatList, Alert
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function BillDetailsScreen() {
    const { billId, name } = useLocalSearchParams<{ billId: string, name: string }>();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

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
        // In a real app, we'd open a modal to select the payment account
        // For simplicity, let's assume the user has a main account they use.
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
                            // Dummy: using first account found for payment for now or asking (simulated)
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
            <View style={[styles.txIcon, { backgroundColor: Colors.surfaceLight }]}>
                <Ionicons name="cart" size={18} color={Colors.textSecondary} />
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
            <Stack.Screen options={{ title: `Fatura ${name}`, headerTransparent: true, headerTintColor: Colors.text }} />
            <View style={styles.headerSpacer} />

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total da Fatura</Text>
                <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
                <TouchableOpacity
                    style={[styles.payBtn, paying && { opacity: 0.7 }]}
                    onPress={handlePay}
                    disabled={paying}
                >
                    {paying ? <ActivityIndicator color="#000" /> : <Text style={styles.payBtnTxt}>Pagar Agora</Text>}
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Lançamentos</Text>

            {loading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            ) : transactions.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>Nenhum lançamento nesta fatura</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id || Math.random().toString()}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerSpacer: { height: 100 },
    summaryCard: {
        margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.xl,
        padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    },
    summaryLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
    summaryValue: { color: Colors.text, fontSize: 32, fontWeight: '800', marginVertical: Spacing.md },
    payBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: Radius.full },
    payBtnTxt: { color: '#000', fontWeight: '800', fontSize: 15 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginLeft: Spacing.lg, textTransform: 'uppercase', letterSpacing: 1 },
    list: { padding: Spacing.lg },
    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm },
    txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 15, fontWeight: '600', color: Colors.text },
    txDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    txAmount: { fontSize: 15, fontWeight: '700', color: Colors.text },
    empty: { alignItems: 'center', padding: 40 },
    emptyText: { color: Colors.textMuted, fontSize: 14 }
});
