import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function NewBudgetScreen() {
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const now = new Date();
    const [month] = useState(now.getMonth() + 1);
    const [year] = useState(now.getFullYear());
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getCategories().then((cats: any) => setCategories(cats.filter((c: any) => c.type === 'expense'))).catch(console.error);
    }, []);

    async function handleSave() {
        if (!amount || !selectedCategory) { Alert.alert('Atenção', 'Selecione uma categoria e informe o valor'); return; }
        setLoading(true);
        try {
            await api.createBudget({ category_id: selectedCategory, amount: parseFloat(amount.replace(',', '.')), month, year });
            router.back();
        } catch (e: any) { Alert.alert('Erro', e.message); }
        finally { setLoading(false); }
    }

    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}><Ionicons name="close" size={22} color={Colors.text} /></TouchableOpacity>
                <Text style={styles.title}>Novo Orçamento</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>{loading ? '...' : 'Salvar'}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.monthBadge}>
                    <Text style={styles.monthText}>Para {MONTHS[month - 1]} {year}</Text>
                </View>
                <View style={styles.amountContainer}>
                    <Text style={styles.currency}>R$</Text>
                    <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                </View>
                <Text style={styles.label}>Categoria de despesa *</Text>
                <View style={styles.catGrid}>
                    {categories.map(cat => (
                        <TouchableOpacity key={cat.id} style={[styles.catChip, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '20' }]} onPress={() => setSelectedCategory(cat.id)}>
                            <Ionicons name={cat.icon as any} size={16} color={selectedCategory === cat.id ? cat.color : Colors.textSecondary} />
                            <Text style={[styles.catText, selectedCategory === cat.id && { color: cat.color }]}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
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
    monthBadge: { alignSelf: 'center', backgroundColor: Colors.secondary + '20', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginBottom: Spacing.lg },
    monthText: { fontSize: 14, color: Colors.secondary, fontWeight: '600' },
    amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
    currency: { fontSize: 28, fontWeight: '700', color: Colors.textSecondary },
    amountInput: { fontSize: 48, fontWeight: '800', color: Colors.text, minWidth: 120, textAlign: 'center' },
    label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.md },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
    catText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
});
