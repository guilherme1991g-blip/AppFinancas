import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function ToolsScreen() {
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    const tools = [
        {
            id: 'analytics',
            title: 'Análise de Gastos',
            sub: 'Relatórios detalhados, fluxo de caixa e comparativos mensais.',
            icon: 'pie-chart',
            color: colors.primary,
            route: '/tools/analytics'
        },
        {
            id: 'metas',
            title: 'Minhas Metas',
            sub: 'Gerencie seus limites de gastos por categoria e acompanhe seu progresso.',
            icon: 'trending-up',
            color: '#6366F1',
            route: '/tools/metas'
        }
    ];

    const styles = s(colors);

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Ferramentas</Text>
                    <Text style={styles.sub}>Gestão e análises avançadas</Text>
                </View>

                {/* Tools Grid/List */}
                <View style={styles.container}>
                    {tools.map((tool) => (
                        <TouchableOpacity
                            key={tool.id}
                            style={styles.toolCard}
                            onPress={() => router.push(tool.route as any)}
                        >
                            <View style={[styles.iconBox, { backgroundColor: tool.color + '15' }]}>
                                <Ionicons name={tool.icon as any} size={28} color={tool.color} />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{tool.title}</Text>
                                <Text style={styles.cardSub}>{tool.sub}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24 },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
    container: { paddingHorizontal: 20, gap: 16 },
    toolCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
        borderRadius: 24, padding: 20, borderSize: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
        gap: 16, borderWidth: 1
    },
    iconBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18, fontWeight: '500' }
});
