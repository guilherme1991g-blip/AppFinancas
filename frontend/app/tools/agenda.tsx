import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function fmtDate(d: string) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

export default function AgendaScreen() {
    const { colors } = useTheme();
    const [compromissos, setCompromissos] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        try {
            const data = await api.getCompromissos() as any[];
            setCompromissos(data);
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false); setLoading(false);
        }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    async function handleDelete(id: string) {
        Alert.alert(
            "Excluir Compromisso",
            "Tem certeza que deseja remover este compromisso da sua agenda?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.deleteCompromisso(id);
                            fetchData();
                        } catch (e: any) {
                            Alert.alert("Erro", e.message || "Não foi possível excluir o compromisso.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    }

    const styles = s(colors);

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Minha Agenda</Text>
                    <Text style={styles.sub}>Seus compromissos financeiros</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/agenda/new' as any)}>
                    <Ionicons name="add" size={24} color={colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : compromissos.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="calendar-outline" size={80} color={colors.primary + '30'} />
                        </View>
                        <Text style={styles.emptyTitle}>Sua agenda está vazia</Text>
                        <Text style={styles.emptyTxt}>Cadastre reuniões, pagamentos presenciais ou outros compromissos.</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/agenda/new' as any)}>
                            <Text style={styles.emptyBtnTxt}>Agendar agora</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    compromissos.map((c, idx) => (
                        <View key={c.id} style={styles.itemRow}>
                            <View style={styles.timeline}>
                                <View style={styles.timeDot} />
                                {idx < compromissos.length - 1 && <View style={styles.timeLine} />}
                            </View>
                            <TouchableOpacity style={styles.card} onPress={() => { }}>
                                <View style={styles.cardContent}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{c.title}</Text>
                                        <Text style={styles.cardTime}>{fmtDate(c.date)}</Text>
                                        {c.description && <Text style={styles.cardDesc} numberOfLines={2}>{c.description}</Text>}
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 10 }}>
                                        <View style={[styles.statusTag, { backgroundColor: c.reminder ? colors.primary + '15' : colors.textMuted + '15' }]}>
                                            <Ionicons name={c.reminder ? "notifications" : "notifications-off"} size={14} color={c.reminder ? colors.primary : colors.textMuted} />
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.statusTag, { backgroundColor: colors.expense + '15' }]}
                                            onPress={() => handleDelete(c.id)}
                                        >
                                            <Ionicons name="trash-outline" size={16} color={colors.expense} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    title: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    itemRow: { flexDirection: 'row', gap: 16 },
    timeline: { alignItems: 'center', width: 20 },
    timeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background, zIndex: 1 },
    timeLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: -2 },
    card: { flex: 1, backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardContent: { flexDirection: 'row', gap: 12 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    cardTime: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 4 },
    cardDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 18, fontWeight: '500' },
    statusTag: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    emptyState: { padding: 40, alignItems: 'center', gap: 20, marginTop: 40 },
    emptyIconBox: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary + '08', alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
    emptyTxt: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
    emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 },
    emptyBtnTxt: { color: colors.white, fontWeight: '800', fontSize: 16 }
});
