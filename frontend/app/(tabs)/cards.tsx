import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const BRANDS = [
    { key: 'visa', label: 'Visa', color: '#1A1F71', icon: '💳' },
    { key: 'mastercard', label: 'Mastercard', color: '#EB001B', icon: '💳' },
    { key: 'elo', label: 'Elo', color: '#FFD700', icon: '💳' },
    { key: 'amex', label: 'Amex', color: '#007CC3', icon: '💳' },
    { key: 'hipercard', label: 'Hipercard', color: '#B71C1C', icon: '💳' },
    { key: 'other', label: 'Outro', color: '#6C5ECF', icon: '💳' },
];

const CARD_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6', '#64748B'];

function CardVisual({ card, colors, onDelete }: { card: any; colors: any; onDelete: () => void }) {
    const brand = BRANDS.find(b => b.key === card.card_brand) || BRANDS[5];
    const usedPct = card.credit_limit > 0 ? Math.min(Math.abs(card.balance) / card.credit_limit, 1) : 0;

    return (
        <TouchableOpacity
            style={[cv.card, { backgroundColor: card.color || colors.primary }]}
            onPress={() => router.push({ pathname: '/cards/bills', params: { id: card.id, name: card.name } })}
        >
            <View style={cv.top}>
                <View style={{ flex: 1 }}>
                    <Text style={cv.cardName}>{card.name}</Text>
                    <Text style={cv.brandLabel}>{brand.label}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/account/${card.id}` as any);
                        }}
                        style={cv.deleteIcon}
                    >
                        <Ionicons name="create-outline" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        style={cv.deleteIcon}
                    >
                        <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <Ionicons name="card" size={24} color="rgba(255,255,255,0.8)" />
                </View>
            </View>

            <View style={cv.middle}>
                <Text style={cv.digits}>•••• •••• •••• {card.last_digits || '****'}</Text>
                {card.card_holder && <Text style={cv.holder}>{card.card_holder}</Text>}
            </View>

            <View style={cv.bottom}>
                <View>
                    <Text style={cv.infoLabel}>Limite disponível</Text>
                    <Text style={cv.infoValue}>
                        {fmt((card.credit_limit || 0) - Math.abs(card.balance))}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={cv.infoLabel}>Fechamento / Vencimento</Text>
                    <Text style={cv.infoValue}>dia {card.closing_day || '--'} / dia {card.due_day || '--'}</Text>
                </View>
            </View>

            <View style={cv.progressContainer}>
                <View style={cv.progressBg}>
                    <View style={[cv.progressFg, { width: `${usedPct * 100}%` as any, backgroundColor: usedPct > 0.8 ? '#FF6B6B' : 'rgba(255,255,255,0.9)' }]} />
                </View>
                <View style={cv.limitRow}>
                    <Text style={cv.limitTxt}>{fmt(Math.abs(card.balance))} usado</Text>
                    <Text style={cv.limitTxt}>Limite: {fmt(card.credit_limit || 0)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const cv = StyleSheet.create({
    card: { borderRadius: 24, padding: 20, marginBottom: 16, minHeight: 190, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    cardName: { fontSize: 18, fontWeight: '800', color: '#FFF' },
    brandLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    deleteIcon: { padding: 4, marginRight: -4 },
    middle: { flex: 1, justifyContent: 'center', marginBottom: 16 },
    digits: { fontSize: 19, color: '#FFF', letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
    holder: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },
    bottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    infoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2, fontWeight: '700', textTransform: 'uppercase' },
    infoValue: { fontSize: 15, color: '#FFF', fontWeight: '800' },
    progressContainer: { gap: 6 },
    progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
    progressFg: { height: '100%', borderRadius: 3 },
    limitRow: { flexDirection: 'row', justifyContent: 'space-between' },
    limitTxt: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});

export default function CardsScreen() {
    const { colors } = useTheme();
    const [cards, setCards] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);

    const styles = s(colors);

    async function fetchCards() {
        try {
            const accs = await api.getAccounts() as any[];
            setCards(accs.filter((a: any) => a.type === 'credit_card'));
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchCards(); }, []));


    async function handleDelete(id: string) {
        Alert.alert('Excluir cartão', 'Deseja excluir este cartão de crédito?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await api.deleteAccount(id);
                        fetchCards();
                    } catch (e: any) {
                        Alert.alert('Erro', e.message);
                    }
                }
            },
        ]);
    }

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCards(); }} tintColor={colors.primary} />}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Cartões</Text>
                        <Text style={styles.sub}>{cards.length} cartão(ões) cadastrado(s)</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/account/new?type=credit_card' as any)}>
                        <Ionicons name="add" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>

                {cards.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="card-outline" size={48} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Nenhum cartão</Text>
                        <Text style={styles.emptySubtitle}>Adicione seu primeiro cartão de crédito para gerenciar suas faturas.</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/account/new?type=credit_card' as any)}>
                            <Ionicons name="add-circle" size={18} color={colors.white} />
                            <Text style={styles.emptyBtnTxt}>Adicionar cartão</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.section}>
                        {cards.map(card => (
                            <CardVisual key={card.id} card={card} colors={colors} onDelete={() => handleDelete(card.id)} />
                        ))}
                    </View>
                )}

                {/* Summary */}
                {cards.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Resumo Geral</Text>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelRow}>
                                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                                    <Text style={styles.summaryLabel}>Total de limite</Text>
                                </View>
                                <Text style={styles.summaryValue}>{fmt(cards.reduce((a, c) => a + (c.credit_limit || 0), 0))}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelRow}>
                                    <View style={[styles.dot, { backgroundColor: colors.expense }]} />
                                    <Text style={styles.summaryLabel}>Total utilizado</Text>
                                </View>
                                <Text style={[styles.summaryValue, { color: colors.expense }]}>{fmt(cards.reduce((a, c) => a + Math.abs(Math.min(c.balance, 0)), 0))}</Text>
                            </View>
                            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                                <View style={styles.summaryLabelRow}>
                                    <View style={[styles.dot, { backgroundColor: colors.income }]} />
                                    <Text style={styles.summaryLabel}>Disponível</Text>
                                </View>
                                <Text style={[styles.summaryValue, { color: colors.income }]}>
                                    {fmt(cards.reduce((a, c) => a + Math.max((c.credit_limit || 0) - Math.abs(Math.min(c.balance, 0)), 0), 0))}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24 },
    title: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
    addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

    emptyBox: { margin: 20, backgroundColor: colors.surface, borderRadius: 32, padding: 40, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: colors.border },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, marginTop: 8 },
    emptyBtnTxt: { color: colors.white, fontWeight: '800', fontSize: 15 },

    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },

    summaryCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    summaryLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    summaryValue: { fontSize: 16, fontWeight: '800', color: colors.text },
});


