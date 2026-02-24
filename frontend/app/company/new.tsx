import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

const CUSTOM_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6', '#64748B'];

export default function NewCompanyScreen() {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(CUSTOM_COLORS[0]);
    const [loading, setLoading] = useState(false);

    const styles = s(colors);

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
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Nova Empresa</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.saveBtn, loading && { opacity: 0.7 }]}>
                    {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Preview */}
                <View style={[styles.preview, { borderLeftColor: color }]}>
                    <View style={[styles.previewIcon, { backgroundColor: color + '15' }]}>
                        <Ionicons name="business" size={24} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.previewName}>{name || 'Nome da empresa'}</Text>
                        {cnpj ? <Text style={styles.previewCnpj}>CNPJ: {cnpj}</Text> : null}
                    </View>
                </View>

                <View style={styles.card}>
                    {[
                        { label: 'Nome da empresa *', value: name, setter: setName, placeholder: 'Ex: Minha Empresa Ltda' },
                        { label: 'CNPJ', value: cnpj, setter: setCnpj, placeholder: '00.000.000/0000-00' },
                        { label: 'Descrição', value: description, setter: setDescription, placeholder: 'Opcional' },
                    ].map(f => (
                        <View key={f.label} style={styles.fieldGroup}>
                            <Text style={styles.label}>{f.label}</Text>
                            <TextInput
                                style={styles.input}
                                value={f.value}
                                onChangeText={f.setter}
                                placeholder={f.placeholder}
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>
                    ))}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.label}>Personalização</Text>
                    <Text style={styles.labelSub}>Cor visual da empresa</Text>
                </View>

                <View style={styles.card}>
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
    content: { padding: 20, gap: 20 },

    preview: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 6, gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    previewIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    previewName: { fontSize: 17, fontWeight: '800', color: colors.text },
    previewCnpj: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },

    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 20, borderWidth: 1, borderColor: colors.border },
    fieldGroup: { gap: 8 },
    label: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
    input: { backgroundColor: colors.background, borderRadius: 16, padding: 16, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },

    sectionHeader: { marginTop: 8 },
    labelSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginTop: 4 },

    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorDot: { width: 36, height: 36, borderRadius: 18 },
});
