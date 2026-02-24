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

function CardVisual({ card, colors }: { card: any; colors: any }) {
    const brand = BRANDS.find(b => b.key === card.card_brand) || BRANDS[5];
    const usedPct = card.credit_limit > 0 ? Math.min(Math.abs(card.balance) / card.credit_limit, 1) : 0;

    return (
        <TouchableOpacity
            style={[cv.card, { backgroundColor: card.color || colors.primary }]}
            onPress={() => router.push({ pathname: '/cards/bills', params: { id: card.id, name: card.name } })}
        >
            <View style={cv.top}>
                <View>
                    <Text style={cv.cardName}>{card.name}</Text>
                    <Text style={cv.brandLabel}>{brand.label}</Text>
                </View>
                <Ionicons name="card" size={24} color="rgba(255,255,255,0.8)" />
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
    const [modal, setModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [holder, setHolder] = useState('');
    const [lastDigits, setLastDigits] = useState('');
    const [brand, setBrand] = useState('visa');
    const [limit, setLimit] = useState('');
    const [closingDay, setClosingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [color, setColor] = useState(CARD_COLORS[0]);

    const styles = s(colors);
    const modalStyles = m(colors);

    async function fetchCards() {
        try {
            const accs = await api.getAccounts() as any[];
            setCards(accs.filter((a: any) => a.type === 'credit_card'));
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchCards(); }, []));

    async function createCard() {
        if (!name.trim()) { Alert.alert('Atenção', 'Digite o nome do cartão'); return; }
        setLoading(true);
        try {
            await api.createAccount({
                name: name.trim(),
                type: 'credit_card',
                bank: bank.trim() || undefined,
                balance: 0,
                color,
                icon: 'card',
                credit_limit: limit ? parseFloat(limit.replace(',', '.')) : undefined,
                closing_day: closingDay ? parseInt(closingDay) : undefined,
                due_day: dueDay ? parseInt(dueDay) : undefined,
                last_digits: lastDigits.trim() || undefined,
                card_brand: brand,
                card_holder: holder.trim() || undefined,
            });
            setModal(false);
            resetForm();
            fetchCards();
        } catch (e: any) { Alert.alert('Erro', e.message); }
        finally { setLoading(false); }
    }

    function resetForm() {
        setName(''); setBank(''); setHolder(''); setLastDigits('');
        setBrand('visa'); setLimit(''); setClosingDay(''); setDueDay('');
        setColor(CARD_COLORS[0]);
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
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
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
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => setModal(true)}>
                            <Ionicons name="add-circle" size={18} color={colors.white} />
                            <Text style={styles.emptyBtnTxt}>Adicionar cartão</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.section}>
                        {cards.map(card => (
                            <CardVisual key={card.id} card={card} colors={colors} />
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

            {/* Add Card Modal */}
            <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
                <ScrollView style={modalStyles.container} showsVerticalScrollIndicator={false}>
                    <View style={modalStyles.handle} />
                    <View style={modalStyles.modalHeader}>
                        <Text style={modalStyles.title}>Novo Cartão</Text>
                        <TouchableOpacity onPress={() => { setModal(false); resetForm(); }}>
                            <Ionicons name="close-circle" size={32} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Preview */}
                    <View style={[modalStyles.preview, { backgroundColor: color }]}>
                        <View style={modalStyles.previewTop}>
                            <Text style={modalStyles.previewName}>{name || 'Nome do Cartão'}</Text>
                            <Text style={modalStyles.previewBrand}>{BRANDS.find(b => b.key === brand)?.label || 'Bandeira'}</Text>
                        </View>
                        <Text style={modalStyles.previewDigits}>•••• •••• •••• {lastDigits || '****'}</Text>
                        <View style={modalStyles.previewBottom}>
                            <Text style={modalStyles.previewHolder}>{holder || 'NOME DO TITULAR'}</Text>
                            <Ionicons name="card" size={20} color="rgba(255,255,255,0.6)" />
                        </View>
                    </View>

                    <Text style={modalStyles.label}>Nome do cartão *</Text>
                    <TextInput style={modalStyles.input} value={name} onChangeText={setName} placeholder="Ex: Nubank, Inter Gold..." placeholderTextColor={colors.textMuted} />

                    <View style={modalStyles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={modalStyles.label}>Banco / Emissor</Text>
                            <TextInput style={modalStyles.input} value={bank} onChangeText={setBank} placeholder="Ex: Nubank" placeholderTextColor={colors.textMuted} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={modalStyles.label}>Últimos 4 dígitos</Text>
                            <TextInput style={modalStyles.input} value={lastDigits} onChangeText={(v) => setLastDigits(v.replace(/\D/g, '').slice(0, 4))} placeholder="1234" placeholderTextColor={colors.textMuted} keyboardType="numeric" maxLength={4} />
                        </View>
                    </View>

                    <Text style={modalStyles.label}>Nome no cartão</Text>
                    <TextInput style={modalStyles.input} value={holder} onChangeText={setHolder} placeholder="NOME SOBRENOME" placeholderTextColor={colors.textMuted} autoCapitalize="characters" />

                    <Text style={modalStyles.label}>Bandeira</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.brandRow} contentContainerStyle={{ paddingBottom: 8 }}>
                        {BRANDS.map(b => (
                            <TouchableOpacity key={b.key} style={[modalStyles.brandBtn, brand === b.key && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setBrand(b.key)}>
                                <Text style={[modalStyles.brandTxt, brand === b.key && { color: colors.white }]}>{b.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={modalStyles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={modalStyles.label}>Limite de Crédito (R$)</Text>
                            <TextInput style={modalStyles.input} value={limit} onChangeText={setLimit} placeholder="5000,00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
                        </View>
                    </View>

                    <View style={modalStyles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={modalStyles.label}>Dia fechamento</Text>
                            <TextInput style={modalStyles.input} value={closingDay} onChangeText={(v) => setClosingDay(v.replace(/\D/g, '').slice(0, 2))} placeholder="25" placeholderTextColor={colors.textMuted} keyboardType="numeric" maxLength={2} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={modalStyles.label}>Dia vencimento</Text>
                            <TextInput style={modalStyles.input} value={dueDay} onChangeText={(v) => setDueDay(v.replace(/\D/g, '').slice(0, 2))} placeholder="05" placeholderTextColor={colors.textMuted} keyboardType="numeric" maxLength={2} />
                        </View>
                    </View>

                    <Text style={modalStyles.label}>Cor do cartão</Text>
                    <View style={modalStyles.colorRow}>
                        {CARD_COLORS.map(c => (
                            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[modalStyles.colorDot, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: colors.text }]} />
                        ))}
                    </View>

                    <TouchableOpacity style={modalStyles.saveBtn} onPress={createCard} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={modalStyles.saveTxt}>Adicionar Cartão</Text>}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </Modal>
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

const m = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
    handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '900', color: colors.text },

    preview: { borderRadius: 24, padding: 24, marginBottom: 32, minHeight: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    previewName: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.95)' },
    previewBrand: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
    previewDigits: { fontSize: 20, color: '#FFF', letterSpacing: 4, fontWeight: '700', marginBottom: 16 },
    previewBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewHolder: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' },

    label: { fontSize: 11, color: colors.textMuted, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, height: 56, color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 24 },
    row: { flexDirection: 'row' },
    brandRow: { marginBottom: 24 },
    brandBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.surface, marginRight: 10, borderWidth: 1, borderColor: colors.border },
    brandTxt: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
    colorDot: { width: 40, height: 40, borderRadius: 20 },
    saveBtn: { height: 60, backgroundColor: colors.primary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveTxt: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
