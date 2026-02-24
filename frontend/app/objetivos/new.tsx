import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

const ICONS = ['star', 'home', 'airplane', 'car', 'heart', 'gift', 'school', 'laptop', 'boat', 'wallet'];
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4', '#64748B'];

export default function NewSonhoScreen() {
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [current, setCurrent] = useState('0');
    const [icon, setIcon] = useState('star');
    const [color, setColor] = useState('#6366F1');
    const [loading, setLoading] = useState(false);

    async function handleSave() {
        if (!title || !amount) {
            Alert.alert('Erro', 'Preencha o título e o valor do objetivo.');
            return;
        }

        try {
            setLoading(true);
            await api.createSonho({
                title,
                description,
                target_amount: parseFloat(amount.replace(',', '.')),
                current_amount: parseFloat(current.replace(',', '.')),
                icon,
                color
            });
            router.back();
        } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Não foi possível salvar seu objetivo.');
        } finally {
            setLoading(false);
        }
    }

    const styles = s(colors);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 60 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Novo Objetivo</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>O que você quer realizar?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Viagem para o Japão, Casa Própria..."
                            placeholderTextColor={colors.textMuted}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Descrição (opcional)</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                            placeholder="Mais detalhes sobre seu objetivo"
                            placeholderTextColor={colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Quanto custa?</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0,00"
                                placeholderTextColor={colors.textMuted}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Já tem quanto?</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0,00"
                                placeholderTextColor={colors.textMuted}
                                value={current}
                                onChangeText={setCurrent}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Ícone</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                        {ICONS.map(i => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.iconBtn, icon === i && { backgroundColor: color + '20', borderColor: color }]}
                                onPress={() => setIcon(i)}
                            >
                                <Ionicons name={i as any} size={24} color={icon === i ? color : colors.textMuted} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.label}>Cor</Text>
                    <View style={styles.colorRow}>
                        {COLORS.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]}
                                onPress={() => setColor(c)}
                            />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnTxt}>Criar Objetivo</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    title: { fontSize: 20, fontWeight: '900', color: colors.text },
    content: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    row: { flexDirection: 'row', gap: 16 },
    label: { fontSize: 14, fontWeight: '800', color: colors.textSecondary, marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, height: 56, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },
    iconRow: { gap: 12, paddingBottom: 20 },
    iconBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
    colorBtn: { width: 40, height: 40, borderRadius: 20 },
    colorBtnActive: { borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)' },
    saveBtn: { backgroundColor: colors.primary, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    saveBtnTxt: { color: colors.white, fontSize: 17, fontWeight: '900' }
});
