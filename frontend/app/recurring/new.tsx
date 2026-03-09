import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

const FREQUENCIES = [
    { value: 'monthly', label: 'Mensal' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'daily', label: 'Diário' },
    { value: 'yearly', label: 'Anual' },
];

export default function NewRecurringScreen() {
    const { colors } = useTheme();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [frequency, setFrequency] = useState('monthly');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const styles = s(colors);

    useEffect(() => {
        setLoading(true);
        Promise.all([api.getAccounts() as Promise<any[]>, api.getCategories() as Promise<any[]>])
            .then(([accs, cats]) => {
                setAccounts(accs);
                setCategories(cats);
                if (accs.length) setSelectedAccount(accs[0].id);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredCats = categories.filter(c => c.type === type);

    async function handleSave() {
        if (!description || !amount || !selectedAccount || !selectedCategory) { Alert.alert('Atenção', 'Preencha todos os campos'); return; }
        setSaving(true);
        try {
            await api.createRecurring({
                description,
                amount: parseFloat(amount.replace(',', '.')),
                type,
                frequency,
                account_id: selectedAccount,
                category_id: selectedCategory,
                start_date: new Date().toISOString()
            });
            router.back();
        } catch (e: any) { if (!e.planLimitHandled) Alert.alert('Erro', e.message); }
        finally { setSaving(false); }
    }

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Recorrência</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
                    {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Criar</Text>}
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Type Selection */}
                <View style={[styles.typeToggle, { borderColor: colors.border }]}>
                    {(['expense', 'income'] as const).map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.typeBtn,
                                type === t && { backgroundColor: t === 'expense' ? colors.expense : colors.income }
                            ]}
                            onPress={() => { setType(t); setSelectedCategory(''); }}
                        >
                            <Ionicons
                                name={t === 'expense' ? 'arrow-down-circle' : 'arrow-up-circle'}
                                size={18}
                                color={type === t ? colors.white : colors.textSecondary}
                            />
                            <Text style={[styles.typeText, type === t && { color: colors.white }]}>
                                {t === 'expense' ? 'Despesa' : 'Receita'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Descrição do Lançamento</Text>
                    <TextInput
                        style={styles.input}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ex: Assinatura Netflix, Aluguel..."
                        placeholderTextColor={colors.textMuted}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Valor Previsto</Text>
                    <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0,00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Frequência de Repetição</Text>
                    <View style={styles.chipRow}>
                        {FREQUENCIES.map(f => (
                            <TouchableOpacity
                                key={f.value}
                                style={[styles.chip, frequency === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                onPress={() => setFrequency(f.value)}
                            >
                                <Text style={[styles.chipText, frequency === f.value && { color: colors.white, fontWeight: '800' }]}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Conta de Origem/Destino</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[
                                    styles.accountChip,
                                    selectedAccount === acc.id && { borderColor: acc.color || colors.primary, backgroundColor: (acc.color || colors.primary) + '15' }
                                ]}
                                onPress={() => setSelectedAccount(acc.id)}
                            >
                                <View style={[styles.dot, { backgroundColor: acc.color || colors.primary }]} />
                                <Text style={[styles.chipText, selectedAccount === acc.id && { color: acc.color || colors.primary, fontWeight: '800' }]}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Categoria Selecionada</Text>
                    {loading ? <ActivityIndicator color={colors.primary} /> : (
                        <View style={styles.catGrid}>
                            {filteredCats.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.catChip,
                                        selectedCategory === cat.id && { borderColor: cat.color || colors.primary, backgroundColor: (cat.color || colors.primary) + '15' }
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={16}
                                        color={selectedCategory === cat.id ? (cat.color || colors.primary) : colors.textSecondary}
                                    />
                                    <Text style={[styles.chipText, selectedCategory === cat.id && { color: cat.color || colors.primary, fontWeight: '800' }]}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
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
    content: { padding: 20, gap: 24 },

    typeToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 20, padding: 4, borderWidth: 1 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 16 },
    typeText: { fontSize: 14, fontWeight: '800', color: colors.textSecondary },

    fieldGroup: { gap: 10 },
    label: { fontSize: 12, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },

    accountChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    dot: { width: 10, height: 10, borderRadius: 5 },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
});
