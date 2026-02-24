import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

const ACC_TYPES = [
    { value: 'checking', label: 'Conta Corrente', icon: 'business-outline' },
    { value: 'savings', label: 'Poupança', icon: 'leaf-outline' },
    { value: 'credit_card', label: 'Cartão de Crédito', icon: 'card-outline' },
    { value: 'wallet', label: 'Carteira', icon: 'wallet-outline' },
    { value: 'investment', label: 'Investimento', icon: 'trending-up-outline' },
];

const COLORS = ['#00D09C', '#6C5ECF', '#FF6B6B', '#FDCB6E', '#74B9FF', '#FD79A8', '#A29BFE', '#55EFC4'];

export default function NewAccountScreen() {
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [balance, setBalance] = useState('0');
    const [type, setType] = useState('checking');
    const [color, setColor] = useState(COLORS[0]);
    const [loading, setLoading] = useState(false);

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
                    <Ionicons name="close" size={22} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Nova Conta</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>{loading ? '...' : 'Salvar'}</Text>
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Preview */}
                        <View style={[styles.preview, { borderLeftColor: color }]}>
                            <Ionicons name="wallet" size={24} color={color} />
                            <Text style={styles.previewName}>{name || 'Nome da conta'}</Text>
                            <Text style={styles.previewBalance}>R$ {parseFloat(balance.replace(',', '.') || '0').toFixed(2)}</Text>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Nome *</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Nubank, Inter..." placeholderTextColor={Colors.textMuted} />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Banco / Instituição</Text>
                            <TextInput style={styles.input} value={bank} onChangeText={setBank} placeholder="Opcional" placeholderTextColor={Colors.textMuted} />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Saldo inicial</Text>
                            <TextInput style={styles.input} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Tipo de conta</Text>
                            <View style={styles.typeGrid}>
                                {ACC_TYPES.map(t => (
                                    <TouchableOpacity
                                        key={t.value}
                                        style={[styles.typeChip, type === t.value && { borderColor: color, backgroundColor: color + '20' }]}
                                        onPress={() => setType(t.value)}
                                    >
                                        <Ionicons name={t.icon as any} size={16} color={type === t.value ? color : Colors.textSecondary} />
                                        <Text style={[styles.typeText, type === t.value && { color }]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Cor</Text>
                            <View style={styles.colorRow}>
                                {COLORS.map(c => (
                                    <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]} onPress={() => setColor(c)} />
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    closeBtn: { padding: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: Radius.full },
    title: { fontSize: 17, fontWeight: '700', color: Colors.text },
    saveBtn: { backgroundColor: Colors.warning, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    saveBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
    content: { padding: Spacing.lg, gap: Spacing.md },
    preview: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.lg, padding: Spacing.lg, borderLeftWidth: 4, gap: 4, marginBottom: Spacing.sm },
    previewName: { fontSize: 18, fontWeight: '700', color: Colors.text },
    previewBalance: { fontSize: 15, color: Colors.textSecondary },
    fieldGroup: {},
    label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.sm },
    input: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
    typeText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
    colorRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorSelected: { borderWidth: 3, borderColor: Colors.white },
});
