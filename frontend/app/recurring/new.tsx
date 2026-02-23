import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

const FREQUENCIES = [
    { value: 'monthly', label: 'Mensal' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'daily', label: 'Diário' },
    { value: 'yearly', label: 'Anual' },
];

export default function NewRecurringScreen() {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [frequency, setFrequency] = useState('monthly');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Promise.all([api.getAccounts() as Promise<any[]>, api.getCategories() as Promise<any[]>])
            .then(([accs, cats]) => { setAccounts(accs); setCategories(cats); if (accs.length) setSelectedAccount(accs[0].id); })
            .catch(console.error);
    }, []);

    const filteredCats = categories.filter(c => c.type === type);

    async function handleSave() {
        if (!description || !amount || !selectedAccount || !selectedCategory) { Alert.alert('Atenção', 'Preencha todos os campos'); return; }
        setLoading(true);
        try {
            await api.createRecurring({ description, amount: parseFloat(amount.replace(',', '.')), type, frequency, account_id: selectedAccount, category_id: selectedCategory, start_date: new Date().toISOString() });
            router.back();
        } catch (e: any) { Alert.alert('Erro', e.message); }
        finally { setLoading(false); }
    }

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}><Ionicons name="close" size={22} color={Colors.text} /></TouchableOpacity>
                <Text style={styles.title}>Lançamento Recorrente</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>{loading ? '...' : 'Salvar'}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Type */}
                <View style={styles.typeRow}>
                    {(['expense', 'income'] as const).map(t => (
                        <TouchableOpacity key={t} style={[styles.typeBtn, type === t && { backgroundColor: t === 'expense' ? Colors.expense : Colors.income }]} onPress={() => { setType(t); setSelectedCategory(''); }}>
                            <Text style={[styles.typeText, type === t && { color: '#000' }]}>{t === 'expense' ? 'Despesa' : 'Receita'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Descrição *</Text>
                    <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Ex: Netflix, Academia..." placeholderTextColor={Colors.textMuted} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Valor *</Text>
                    <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Frequência</Text>
                    <View style={styles.chipRow}>
                        {FREQUENCIES.map(f => (
                            <TouchableOpacity key={f.value} style={[styles.chip, frequency === f.value && { backgroundColor: Colors.secondary, borderColor: Colors.secondary }]} onPress={() => setFrequency(f.value)}>
                                <Text style={[styles.chipText, frequency === f.value && { color: Colors.white }]}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Conta</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {accounts.map(acc => (
                            <TouchableOpacity key={acc.id} style={[styles.chip, selectedAccount === acc.id && { backgroundColor: acc.color, borderColor: acc.color }]} onPress={() => setSelectedAccount(acc.id)}>
                                <Text style={[styles.chipText, selectedAccount === acc.id && { color: '#000' }]}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Categoria</Text>
                    <View style={styles.catGrid}>
                        {filteredCats.map(cat => (
                            <TouchableOpacity key={cat.id} style={[styles.catChip, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '20' }]} onPress={() => setSelectedCategory(cat.id)}>
                                <Ionicons name={cat.icon as any} size={14} color={selectedCategory === cat.id ? cat.color : Colors.textSecondary} />
                                <Text style={[styles.chipText, selectedCategory === cat.id && { color: cat.color }]}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
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
    title: { fontSize: 16, fontWeight: '700', color: Colors.text },
    saveBtn: { backgroundColor: Colors.warning, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    saveBtnText: { color: '#000', fontWeight: '700' },
    content: { padding: Spacing.lg, gap: Spacing.md },
    typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    typeBtn: { flex: 1, alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceLight },
    typeText: { color: Colors.textSecondary, fontWeight: '600' },
    fieldGroup: {},
    label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.sm },
    input: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
    chipRow: { flexDirection: 'row', gap: Spacing.sm },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
    chipText: { fontSize: 13, color: Colors.textSecondary },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
});
