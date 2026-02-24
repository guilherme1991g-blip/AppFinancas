import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

export default function NewBudgetScreen() {
    const { colors } = useTheme();
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const now = new Date();
    const [month] = useState(now.getMonth() + 1);
    const [year] = useState(now.getFullYear());
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const styles = s(colors);

    useEffect(() => {
        setLoading(true);
        api.getCategories()
            .then((cats: any) => setCategories(cats.filter((c: any) => c.type === 'expense')))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        if (!amount || !selectedCategory) { Alert.alert('Atenção', 'Selecione uma categoria e informe o valor'); return; }
        setSaving(true);
        try {
            await api.createBudget({ category_id: selectedCategory, amount: parseFloat(amount.replace(',', '.')), month, year });
            router.back();
        } catch (e: any) { Alert.alert('Erro', e.message); }
        finally { setSaving(false); }
    }

    const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Nova Meta</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
                    {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Definir</Text>}
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.monthCard}>
                    <View style={styles.monthBadge}>
                        <Ionicons name="calendar" size={20} color={colors.primary} />
                        <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
                    </View>
                    <Text style={styles.monthSub}>Planeje seus gastos para este mês</Text>
                </View>

                <View style={styles.amountContainer}>
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
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.label}>Selecione a Categoria</Text>
                    <Text style={styles.labelSub}>Apenas categorias de despesa</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.catGrid}>
                        {categories.map(cat => (
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
                                    size={18}
                                    color={selectedCategory === cat.id ? (cat.color || colors.primary) : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.catText,
                                    selectedCategory === cat.id && { color: cat.color || colors.primary, fontWeight: '800' }
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

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
    saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, minWidth: 90, alignItems: 'center' },
    saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
    content: { padding: 20 },

    monthCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: colors.border },
    monthBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '10', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 8 },
    monthText: { fontSize: 15, color: colors.primary, fontWeight: '800' },
    monthSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

    amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40, gap: 12 },
    currency: { fontSize: 32, fontWeight: '700', color: colors.textSecondary },
    amountInput: { fontSize: 56, fontWeight: '900', color: colors.text, minWidth: 150, textAlign: 'center' },

    sectionHeader: { marginBottom: 16 },
    label: { fontSize: 14, color: colors.text, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    labelSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginTop: 4 },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    catText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
});
