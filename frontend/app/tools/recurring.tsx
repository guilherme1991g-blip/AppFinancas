import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';


const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function RecurringListScreen() {
    const { colors } = useTheme();
    const { fmt } = useLocale();
    const [recurring, setRecurring] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        try {
            const r = await api.getRecurring() as any[];
            setRecurring(r);
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false); setLoading(false);
        }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const styles = s(colors);

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Recorrentes</Text>
                    <Text style={styles.sub}>Transações automáticas</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/recurring/new' as any)}>
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
                ) : recurring.filter(r => r.is_active).length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="repeat-outline" size={64} color={colors.border} />
                        <Text style={styles.emptyTxt}>Nenhum lançamento recorrente ativo</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/recurring/new' as any)}>
                            <Text style={styles.emptyBtnTxt}>Configurar recorrente</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.listCard}>
                        {recurring.filter(r => r.is_active).map((r, idx, arr) => (
                            <TouchableOpacity
                                key={r.id}
                                style={[styles.listItem, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
                                onPress={() => {
                                    Alert.alert(
                                        'Excluir Recorrente',
                                        'Como deseja excluir este lançamento automático?',
                                        [
                                            { text: 'Cancelar', style: 'cancel' },
                                            {
                                                text: 'Apenas a regra',
                                                onPress: async () => {
                                                    try {
                                                        await api.deleteRecurring(r.id, 'rule_only');
                                                        fetchData();
                                                    } catch (e: any) { Alert.alert('Erro', e.message); }
                                                }
                                            },
                                            {
                                                text: 'Todos (incluindo pagos)',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    try {
                                                        await api.deleteRecurring(r.id, 'entire_series');
                                                        fetchData();
                                                    } catch (e: any) { Alert.alert('Erro', e.message); }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <View style={[styles.recIconWrap, { backgroundColor: r.type === 'income' ? colors.income + '15' : colors.expense + '15' }]}>
                                    <Ionicons name="repeat" size={20} color={r.type === 'income' ? colors.income : colors.expense} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemTitle}>{r.description}</Text>
                                    <Text style={styles.itemSub}>{FR_LABEL[r.frequency]}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Text style={[styles.itemVal, { color: r.type === 'income' ? colors.income : colors.expense }]}>
                                        {r.type === 'income' ? '+' : '-'}{fmt(Math.abs(r.amount))}
                                    </Text>
                                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
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
    title: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    listCard: { backgroundColor: colors.surface, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 16 },
    recIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 16, color: colors.text, fontWeight: '800' },
    itemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    itemVal: { fontSize: 17, fontWeight: '900' },
    emptyState: { padding: 60, alignItems: 'center', gap: 20 },
    emptyTxt: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24, fontWeight: '600' },
    emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    emptyBtnTxt: { color: colors.white, fontWeight: '800' },
});
