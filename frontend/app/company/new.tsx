import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Colors, Spacing, Radius } from '@/constants/theme';

const COLORS = ['#6C5ECF', '#00D09C', '#FF6B6B', '#74B9FF', '#FDCB6E', '#FD79A8', '#A29BFE'];

export default function NewCompanyScreen() {
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [loading, setLoading] = useState(false);

    async function handleSave() {
        if (!name) { Alert.alert('Atenção', 'Informe o nome da empresa'); return; }
        setLoading(true);
        try {
            await api.createCompany({ name, cnpj, description, color });
            router.back();
        } catch (e: any) { Alert.alert('Erro', e.message); }
        finally { setLoading(false); }
    }

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}><Ionicons name="close" size={22} color={Colors.text} /></TouchableOpacity>
                <Text style={styles.title}>Nova Empresa</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>{loading ? '...' : 'Salvar'}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Preview */}
                <View style={[styles.preview, { borderLeftColor: color }]}>
                    <View style={[styles.previewIcon, { backgroundColor: color + '25' }]}>
                        <Ionicons name="business" size={24} color={color} />
                    </View>
                    <Text style={styles.previewName}>{name || 'Nome da empresa'}</Text>
                    {cnpj ? <Text style={styles.previewCnpj}>CNPJ: {cnpj}</Text> : null}
                </View>

                {[
                    { label: 'Nome da empresa *', value: name, setter: setName, placeholder: 'Ex: Minha Empresa Ltda' },
                    { label: 'CNPJ', value: cnpj, setter: setCnpj, placeholder: '00.000.000/0000-00' },
                    { label: 'Descrição', value: description, setter: setDescription, placeholder: 'Opcional' },
                ].map(f => (
                    <View key={f.label} style={styles.fieldGroup}>
                        <Text style={styles.label}>{f.label}</Text>
                        <TextInput style={styles.input} value={f.value} onChangeText={f.setter} placeholder={f.placeholder} placeholderTextColor={Colors.textMuted} />
                    </View>
                ))}

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Cor</Text>
                    <View style={styles.colorRow}>
                        {COLORS.map(c => (
                            <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]} onPress={() => setColor(c)} />
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
    title: { fontSize: 17, fontWeight: '700', color: Colors.text },
    saveBtn: { backgroundColor: Colors.secondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    saveBtnText: { color: Colors.white, fontWeight: '700' },
    content: { padding: Spacing.lg, gap: Spacing.md },
    preview: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.lg, padding: Spacing.lg, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
    previewIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    previewName: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
    previewCnpj: { fontSize: 12, color: Colors.textSecondary },
    fieldGroup: {},
    label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.sm },
    input: { backgroundColor: Colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
    colorRow: { flexDirection: 'row', gap: Spacing.md },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorSelected: { borderWidth: 3, borderColor: Colors.white },
});
