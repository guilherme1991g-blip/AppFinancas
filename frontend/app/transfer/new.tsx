import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';


export default function NewTransferScreen() {
    const { colors } = useTheme();
    const { fmt } = useLocale();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [toSonho, setToSonho] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [sonhos, setSonhos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const styles = s(colors);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.getAccounts(),
            api.getSonhos()
        ]).then(([accs, snh]: [any, any]) => {
            setAccounts(accs.filter((a: any) => a.type !== 'credit_card'));
            setSonhos(snh);
        })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        if (!amount || !fromAccount || (!toAccount && !toSonho) || fromAccount === toAccount) {
            Alert.alert('Atenção', 'Selecione contas diferentes e informe o valor');
            return;
        }
        setSaving(true);
        try {
            await api.createTransfer({
                from_account_id: fromAccount,
                to_account_id: toAccount || undefined,
                to_sonho_id: toSonho || undefined,
                amount: parseFloat(amount.replace(',', '.')),
                description: description || 'Transferência',
                date: new Date().toISOString(),
                notes: '',
            });
            router.back();
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Transferência</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
                    {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Enviar</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Amount */}
                <View style={styles.amountCard}>
                    <Text style={styles.currency}>R$</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0,00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        autoFocus
                    />
                    <Text style={styles.amountLabel}>Valor a transferir</Text>
                </View>

                {/* Transfer Map */}
                <View style={styles.transferSection}>
                    <View style={styles.selectionColumn}>
                        <Text style={styles.sectionLabel}>De onde sai?</Text>
                        <View style={styles.accList}>
                            {accounts.map(acc => (
                                <TouchableOpacity
                                    key={acc.id}
                                    style={[
                                        styles.accCard,
                                        fromAccount === acc.id && { borderColor: acc.color || colors.primary, backgroundColor: (acc.color || colors.primary) + '15' }
                                    ]}
                                    onPress={() => setFromAccount(acc.id)}
                                >
                                    <View style={[styles.accIcon, { backgroundColor: (acc.color || colors.primary) + '20' }]}>
                                        <Ionicons name="wallet-outline" size={16} color={acc.color || colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.accName, fromAccount === acc.id && { fontWeight: '800' }]} numberOfLines={1}>{acc.name}</Text>
                                        <Text style={styles.accBal}>{fmt(acc.balance)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.arrowWrap}>
                        <View style={styles.arrowLine} />
                        <View style={styles.arrowIconWrap}>
                            <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.arrowLine} />
                    </View>

                    <View style={styles.selectionColumn}>
                        <Text style={styles.sectionLabel}>Pra onde vai?</Text>
                        <View style={styles.accList}>
                            <Text style={styles.subCategoryLabel}>Contas</Text>
                            {accounts.map(acc => (
                                <TouchableOpacity
                                    key={acc.id}
                                    style={[
                                        styles.accCard,
                                        toAccount === acc.id && { borderColor: acc.color || colors.primary, backgroundColor: (acc.color || colors.primary) + '15' }
                                    ]}
                                    onPress={() => { setToAccount(acc.id); setToSonho(''); }}
                                >
                                    <View style={[styles.accIcon, { backgroundColor: (acc.color || colors.primary) + '20' }]}>
                                        <Ionicons name="wallet-outline" size={16} color={acc.color || colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.accName, toAccount === acc.id && { fontWeight: '800' }]} numberOfLines={1}>{acc.name}</Text>
                                        <Text style={styles.accBal}>{fmt(acc.balance)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {sonhos.length > 0 && (
                                <>
                                    <Text style={[styles.subCategoryLabel, { marginTop: 12 }]}>Objetivos</Text>
                                    {sonhos.map(sonho => (
                                        <TouchableOpacity
                                            key={sonho.id}
                                            style={[
                                                styles.accCard,
                                                toSonho === sonho.id && { borderColor: sonho.color || colors.primary, backgroundColor: (sonho.color || colors.primary) + '15' }
                                            ]}
                                            onPress={() => { setToSonho(sonho.id); setToAccount(''); }}
                                        >
                                            <View style={[styles.accIcon, { backgroundColor: (sonho.color || colors.primary) + '20' }]}>
                                                <Ionicons name={(sonho.icon || 'star') as any} size={16} color={sonho.color || colors.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.accName, toSonho === sonho.id && { fontWeight: '800' }]} numberOfLines={1}>{sonho.title}</Text>
                                                <Text style={styles.accBal}>Meta: {fmt(sonho.target_amount)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.sectionLabel}>Identificação</Text>
                    <TextInput
                        style={styles.fieldInput}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ex: Reserva mensal, Pagamento..."
                        placeholderTextColor={colors.textMuted}
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, minWidth: 80, alignItems: 'center' },
    saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
    content: { padding: 20, gap: 32 },

    amountCard: { backgroundColor: colors.surface, borderRadius: 32, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    currency: { fontSize: 24, fontWeight: '700', color: colors.textSecondary, marginBottom: -10 },
    amountInput: { fontSize: 56, fontWeight: '900', color: colors.text, textAlign: 'center' },
    amountLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 8 },

    transferSection: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    selectionColumn: { flex: 1, gap: 12 },
    sectionLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    accList: { gap: 8 },
    accCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    accIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    accName: { fontSize: 13, color: colors.text, fontWeight: '600' },
    accBal: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    subCategoryLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },

    arrowWrap: { alignItems: 'center', justifyContent: 'center', height: '100%', width: 32 },
    arrowLine: { width: 1, flex: 1, backgroundColor: colors.border },
    arrowIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginVertical: 12 },

    fieldGroup: { gap: 12 },
    fieldInput: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },
});
