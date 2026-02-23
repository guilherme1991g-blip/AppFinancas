import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function NewTransferScreen() {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getAccounts().then((accs: any) => setAccounts(accs)).catch(console.error);
    }, []);

    async function handleSave() {
        if (!amount || !fromAccount || !toAccount || fromAccount === toAccount) {
            Alert.alert('Atenção', 'Selecione contas diferentes e informe o valor');
            return;
        }
        setLoading(true);
        try {
            await api.createTransfer({
                from_account_id: fromAccount,
                to_account_id: toAccount,
                amount: parseFloat(amount.replace(',', '.')),
                description: description || 'Transferência',
                date: new Date().toISOString(),
                notes: '',
            });
            router.back();
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Transferência</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>{loading ? '...' : 'Salvar'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Amount */}
                <View style={styles.amountContainer}>
                    <Text style={styles.currency}>R$</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amount} onChangeText={setAmount}
                        placeholder="0,00" placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* From → To */}
                <View style={styles.transferRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>De</Text>
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[styles.accBtn, fromAccount === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '15' }]}
                                onPress={() => setFromAccount(acc.id)}
                            >
                                <View style={[styles.accDot, { backgroundColor: acc.color }]} />
                                <Text style={styles.accName} numberOfLines={1}>{acc.name}</Text>
                                {fromAccount === acc.id && <Text style={[styles.accBal, { color: acc.color }]}>{formatCurrency(acc.balance)}</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Ionicons name="arrow-forward" size={24} color={Colors.textMuted} style={{ marginTop: 30 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Para</Text>
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[styles.accBtn, toAccount === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '15' }]}
                                onPress={() => setToAccount(acc.id)}
                            >
                                <View style={[styles.accDot, { backgroundColor: acc.color }]} />
                                <Text style={styles.accName} numberOfLines={1}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Descrição</Text>
                    <TextInput
                        style={styles.fieldInput}
                        value={description} onChangeText={setDescription}
                        placeholder="Ex: Poupança mensal" placeholderTextColor={Colors.textMuted}
                    />
                </View>
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
    saveBtn: { backgroundColor: Colors.secondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
    content: { padding: Spacing.lg },
    amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
    currency: { fontSize: 28, fontWeight: '700', color: Colors.textSecondary },
    amountInput: { fontSize: 48, fontWeight: '800', color: Colors.text, minWidth: 120, textAlign: 'center' },
    transferRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', marginBottom: Spacing.lg },
    fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.sm },
    accBtn: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 },
    accDot: { width: 8, height: 8, borderRadius: 4 },
    accName: { fontSize: 12, color: Colors.text, fontWeight: '500', flex: 1 },
    accBal: { fontSize: 11, fontWeight: '600' },
    fieldGroup: { marginBottom: Spacing.lg },
    fieldInput: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
});
