import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Switch, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function NewTransactionScreen() {
    const { type: initialType } = useLocalSearchParams<{ type?: string }>();
    const [type, setType] = useState<'income' | 'expense'>(initialType === 'income' ? 'income' : 'expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [accs, cats] = await Promise.all([api.getAccounts() as Promise<any[]>, api.getCategories() as Promise<any[]>]);
                setAccounts(accs);
                setCategories(cats);
                if (accs.length > 0) setSelectedAccount(accs[0].id);
            } catch (e) { console.error(e); }
        }
        load();
    }, []);

    const filteredCats = categories.filter(c => c.type === type);

    async function handleSave() {
        if (!amount || !description || !selectedAccount || !selectedCategory) {
            Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
            return;
        }
        setLoading(true);
        try {
            await api.createTransaction({
                account_id: selectedAccount,
                category_id: selectedCategory,
                type,
                amount: parseFloat(amount.replace(',', '.')),
                description,
                notes,
                date: new Date().toISOString(),
                tags: [],
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
                <Text style={styles.title}>Nova Transação</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>{loading ? '...' : 'Salvar'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Type Toggle */}
                <View style={styles.typeRow}>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'expense' && styles.typeExpenseActive]}
                        onPress={() => { setType('expense'); setSelectedCategory(''); }}
                    >
                        <Ionicons name="arrow-up" size={16} color={type === 'expense' ? Colors.white : Colors.textSecondary} />
                        <Text style={[styles.typeText, type === 'expense' && { color: Colors.white }]}>Despesa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'income' && styles.typeIncomeActive]}
                        onPress={() => { setType('income'); setSelectedCategory(''); }}
                    >
                        <Ionicons name="arrow-down" size={16} color={type === 'income' ? Colors.white : Colors.textSecondary} />
                        <Text style={[styles.typeText, type === 'income' && { color: Colors.white }]}>Receita</Text>
                    </TouchableOpacity>
                </View>

                {/* Amount */}
                <View style={styles.amountContainer}>
                    <Text style={styles.currency}>R$</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0,00"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* Description */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Descrição *</Text>
                    <TextInput
                        style={styles.fieldInput}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ex: Supermercado, Salário..."
                        placeholderTextColor={Colors.textMuted}
                    />
                </View>

                {/* Account */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Conta *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[styles.chip, selectedAccount === acc.id && { backgroundColor: acc.color, borderColor: acc.color }]}
                                onPress={() => setSelectedAccount(acc.id)}
                            >
                                <Text style={[styles.chipText, selectedAccount === acc.id && { color: '#000' }]}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Category */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Categoria *</Text>
                    <View style={styles.categoryGrid}>
                        {filteredCats.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.catChip, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '20' }]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <Ionicons name={cat.icon as any} size={16} color={selectedCategory === cat.id ? cat.color : Colors.textSecondary} />
                                <Text style={[styles.catChipText, selectedCategory === cat.id && { color: cat.color }]} numberOfLines={1}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Observações</Text>
                    <TextInput
                        style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Opcional..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
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
    saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    saveBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
    content: { padding: Spacing.lg, paddingBottom: 100 },
    typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    typeBtn: { flex: 1, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surfaceLight },
    typeExpenseActive: { backgroundColor: Colors.expense },
    typeIncomeActive: { backgroundColor: Colors.income },
    typeText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
    amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
    currency: { fontSize: 28, fontWeight: '700', color: Colors.textSecondary },
    amountInput: { fontSize: 48, fontWeight: '800', color: Colors.text, minWidth: 120, textAlign: 'center' },
    fieldGroup: { marginBottom: Spacing.lg },
    fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.sm },
    fieldInput: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
    chipsRow: { flexDirection: 'row' },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
    chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
    catChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
});
