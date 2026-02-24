import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Dimensions
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function SonhosListScreen() {
    const { colors } = useTheme();
    const [sonhos, setSonhos] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        try {
            const data = await api.getSonhos() as any[];
            setSonhos(data);
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
                    <Text style={styles.title}>Meus Objetivos</Text>
                    <Text style={styles.sub}>Planejamento para o futuro</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/sonhos/new' as any)}>
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
                ) : sonhos.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="cloud-outline" size={80} color={colors.primary + '30'} />
                        </View>
                        <Text style={styles.emptyTitle}>Inicie um novo objetivo</Text>
                        <Text style={styles.emptyTxt}>Defina um objetivo financeiro e acompanhe seu progresso para realizá-lo.</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/sonhos/new' as any)}>
                            <Text style={styles.emptyBtnTxt}>Começar agora</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    sonhos.map(sonho => {
                        const pct = Math.min(sonho.current_amount / sonho.target_amount, 1);
                        return (
                            <TouchableOpacity key={sonho.id} style={styles.card} onPress={() => { }}>
                                <View style={styles.cardTop}>
                                    <View style={[styles.iconBox, { backgroundColor: (sonho.color || colors.primary) + '15' }]}>
                                        <Ionicons name={(sonho.icon || 'star') as any} size={24} color={sonho.color || colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{sonho.title}</Text>
                                        <Text style={styles.cardSub} numberOfLines={1}>{sonho.description || 'Sem descrição'}</Text>
                                    </View>
                                    <Text style={styles.cardPct}>{(pct * 100).toFixed(0)}%</Text>
                                </View>

                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressBar, { width: `${pct * 100}%` as any, backgroundColor: sonho.color || colors.primary }]} />
                                </View>

                                <View style={styles.cardBottom}>
                                    <View>
                                        <Text style={styles.valLabel}>Acumulado</Text>
                                        <Text style={styles.valTxt}>{fmt(sonho.current_amount)}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.valLabel}>Objetivo</Text>
                                        <Text style={[styles.valTxt, { color: colors.textSecondary }]}>{fmt(sonho.target_amount)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
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
    card: { backgroundColor: colors.surface, borderRadius: 32, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    iconBox: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    cardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
    cardPct: { fontSize: 17, fontWeight: '900', color: colors.primary },
    progressTrack: { height: 12, backgroundColor: colors.border + '50', borderRadius: 6, overflow: 'hidden', marginBottom: 20 },
    progressBar: { height: '100%', borderRadius: 6 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    valLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    valTxt: { fontSize: 16, fontWeight: '800', color: colors.text },
    emptyState: { padding: 40, alignItems: 'center', gap: 20, marginTop: 40 },
    emptyIconBox: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary + '08', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
    emptyTxt: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
    emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20, marginTop: 10 },
    emptyBtnTxt: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
