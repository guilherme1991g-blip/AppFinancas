import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

export default function NewCompromissoScreen() {
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [location, setLocation] = useState('');
    const [reminder, setReminder] = useState(true);
    const [loading, setLoading] = useState(false);

    // Simplificação para o exemplo: usando campos de texto para data/hora
    const [dateStr, setDateStr] = useState(new Date().toLocaleDateString('pt-BR'));
    const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    async function handleSave() {
        if (!title || !dateStr || !timeStr) {
            Alert.alert('Erro', 'Preencha o título, data e hora.');
            return;
        }

        try {
            setLoading(true);

            // Converter strings para Date
            const [d, m, y] = dateStr.split('/').map(Number);
            const [h, min] = timeStr.split(':').map(Number);
            const finalDate = new Date(y, m - 1, d, h, min);

            await api.createCompromisso({
                title,
                description,
                date: finalDate.toISOString(),
                location,
                reminder
            });
            router.back();
        } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Não foi possível agendar o compromisso.');
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
                    <Text style={styles.title}>Novo Compromisso</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>O que você vai fazer?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Reunião com contador, Pagamento IPTU..."
                            placeholderTextColor={colors.textMuted}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Data (DD/MM/AAAA)</Text>
                            <TextInput
                                style={styles.input}
                                value={dateStr}
                                onChangeText={setDateStr}
                                placeholder="00/00/0000"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Hora (HH:MM)</Text>
                            <TextInput
                                style={styles.input}
                                value={timeStr}
                                onChangeText={setTimeStr}
                                placeholder="00:00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Local (opcional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Endereço ou Link"
                            placeholderTextColor={colors.textMuted}
                            value={location}
                            onChangeText={setLocation}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Descrição (opcional)</Text>
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                            placeholder="Mais informações..."
                            placeholderTextColor={colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </View>

                    <View style={styles.reminderRow}>
                        <View>
                            <Text style={styles.reminderLabel}>Lembrete de Notificação</Text>
                            <Text style={styles.reminderSub}>Avisar 1 hora antes do compromisso</Text>
                        </View>
                        <Switch
                            value={reminder}
                            onValueChange={setReminder}
                            trackColor={{ false: colors.border, true: colors.primary + '80' }}
                            thumbColor={reminder ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnTxt}>Agendar</Text>}
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
    label: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, height: 56, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },
    reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 20, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: colors.border },
    reminderLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
    reminderSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
    saveBtn: { backgroundColor: colors.primary, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    saveBtnTxt: { color: colors.white, fontSize: 17, fontWeight: '900' }
});
