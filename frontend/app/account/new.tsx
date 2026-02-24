import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

const ACC_TYPES = [
    { value: 'checking', label: 'Conta Corrente', icon: 'business-outline' },
    { value: 'savings', label: 'Poupança', icon: 'leaf-outline' },
    { value: 'credit_card', label: 'Cartão de Crédito', icon: 'card-outline' },
    { value: 'wallet', label: 'Carteira', icon: 'wallet-outline' },
    { value: 'investment', label: 'Investimento', icon: 'trending-up-outline' },
];

const CUSTOM_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6', '#64748B'];

export default function NewAccountScreen() {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [balance, setBalance] = useState('0');
    const [type, setType] = useState('checking');
    const [color, setColor] = useState(CUSTOM_COLORS[0]);
    const [loading, setLoading] = useState(false);

    const styles = s(colors);

    async function handleSave() {
        if (!name) { Alert.alert('Atenção', 'Informe o nome da conta'); return; }
        setLoading(true);
        try {
            await api.createAccount({ name, bank, type, balance: parseFloat(balance.replace(',', '.')) || 0, color });
            router.back();
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally { setLoading(false); }
    }

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Nova Conta</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.saveBtn, loading && { opacity: 0.7 }]}>
                    {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Preview */}
                        <View style={[styles.preview, { borderLeftColor: color }]}>
                            <View style={[styles.previewIcon, { backgroundColor: color + '15' }]}>
                                <Ionicons name={(ACC_TYPES.find(t => t.value === type)?.icon as any) || 'wallet'} size={24} color={color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.previewName}>{name || 'Nome da conta'}</Text>
                                <Text style={styles.previewType}>{ACC_TYPES.find(t => t.value === type)?.label}</Text>
                            </View>
                            <Text style={styles.previewBalance}>R$ {parseFloat(balance.replace(',', '.') || '0').toFixed(2)}</Text>
                        </View>

                        <Text style={styles.sectionLabel}>Informações Básicas</Text>
                        <View style={styles.card}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Nome da Conta *</Text>
                                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Nubank, Inter, Principal..." placeholderTextColor={colors.textMuted} />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Banco / Instituição</Text>
                                <TextInput style={styles.input} value={bank} onChangeText={setBank} placeholder="Ex: Nubank" placeholderTextColor={colors.textMuted} />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Saldo Inicial</Text>
                                <TextInput style={styles.input} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} />
                            </View>
                        </View>

                        <Text style={styles.sectionLabel}>Tipo de Conta</Text>
                        <View style={styles.typeGrid}>
                            {ACC_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t.value}
                                    style={[styles.typeChip, type === t.value && { borderColor: color, backgroundColor: color + '15' }]}
                                    onPress={() => setType(t.value)}
                                >
                                    <Ionicons name={t.icon as any} size={18} color={type === t.value ? color : colors.textSecondary} />
                                    <Text style={[styles.typeText, type === t.value && { color, fontWeight: '800' }]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionLabel}>Personalização</Text>
                        <View style={styles.card}>
                            <Text style={styles.label}>Cor da Conta</Text>
                            <View style={styles.colorRow}>
                                {CUSTOM_COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.colorDot, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: colors.text }]}
                                        onPress={() => setColor(c)}
                                    />
                                ))}
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
    content: { padding: 20, gap: 20 },

    preview: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 6, gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    previewIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    previewName: { fontSize: 17, fontWeight: '800', color: colors.text },
    previewType: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
    previewBalance: { fontSize: 18, fontWeight: '900', color: colors.text },

    sectionLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border },
    fieldGroup: { gap: 8 },
    label: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
    input: { backgroundColor: colors.background, borderRadius: 16, padding: 16, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },

    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    typeText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 4 },
    colorDot: { width: 36, height: 36, borderRadius: 18 },
});
