import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';

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

const CARD_COLORS = ['#6C5ECF', '#00D09C', '#FF6B6B', '#F59E0B', '#3B82F6', '#EC4899', '#1A1F71', '#10B981'];

function CardVisual({ card }: { card: any }) {
    const brand = BRANDS.find(b => b.key === card.card_brand) || BRANDS[5];
    const usedPct = card.credit_limit > 0 ? Math.min(Math.abs(card.balance) / card.credit_limit, 1) : 0;
    return (
        <View style={[cv.card, { backgroundColor: card.color || '#6C5ECF' }]}>
            <View style={cv.top}>
                <Text style={cv.cardName}>{card.name}</Text>
                <Text style={cv.brandLabel}>{brand.label}</Text>
            </View>
            <Text style={cv.digits}>•••• •••• •••• {card.last_digits || '****'}</Text>
            {card.card_holder && <Text style={cv.holder}>{card.card_holder}</Text>}
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
            <View style={cv.progressBg}>
                <View style={[cv.progressFg, { width: `${usedPct * 100}%` as any, backgroundColor: usedPct > 0.8 ? '#FF6B6B' : 'rgba(255,255,255,0.7)' }]} />
            </View>
            <View style={cv.limitRow}>
                <Text style={cv.limitTxt}>{fmt(Math.abs(card.balance))} usado</Text>
                <Text style={cv.limitTxt}>Limite: {fmt(card.credit_limit || 0)}</Text>
            </View>
        </View>
    );
}

const cv = StyleSheet.create({
    card: { borderRadius: 20, padding: 20, marginBottom: 16, minHeight: 180 },
    top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    cardName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    brandLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
    digits: { fontSize: 18, color: '#FFF', letterSpacing: 2, fontWeight: '600', marginBottom: 4 },
    holder: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    bottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    infoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
    infoValue: { fontSize: 13, color: '#FFF', fontWeight: '600' },
    progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
    progressFg: { height: '100%', borderRadius: 2 },
    limitRow: { flexDirection: 'row', justifyContent: 'space-between' },
    limitTxt: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
});

export default function CardsScreen() {
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
        <View style={s.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCards(); }} tintColor="#00D09C" />}
            >
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Cartões</Text>
                        <Text style={s.sub}>{cards.length} cartão(ões) cadastrado(s)</Text>
                    </View>
                    <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
                        <Ionicons name="add" size={20} color="#000" />
                    </TouchableOpacity>
                </View>

                {cards.length === 0 ? (
                    <View style={s.emptyBox}>
                        <Ionicons name="card-outline" size={48} color="#374151" />
                        <Text style={s.emptyTitle}>Nenhum cartão</Text>
                        <Text style={s.emptySubtitle}>Adicione seu primeiro cartão de crédito</Text>
                        <TouchableOpacity style={s.emptyBtn} onPress={() => setModal(true)}>
                            <Ionicons name="add-circle" size={16} color="#000" />
                            <Text style={s.emptyBtnTxt}>Adicionar cartão</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={s.section}>
                        {cards.map(card => (
                            <CardVisual key={card.id} card={card} />
                        ))}
                    </View>
                )}

                {/* Summary */}
                {cards.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Resumo</Text>
                        <View style={s.summaryCard}>
                            <View style={s.summaryRow}>
                                <Text style={s.summaryLabel}>Total de limite</Text>
                                <Text style={s.summaryValue}>{fmt(cards.reduce((a, c) => a + (c.credit_limit || 0), 0))}</Text>
                            </View>
                            <View style={s.summaryRow}>
                                <Text style={s.summaryLabel}>Total utilizado</Text>
                                <Text style={[s.summaryValue, { color: '#FF6B6B' }]}>{fmt(cards.reduce((a, c) => a + Math.abs(Math.min(c.balance, 0)), 0))}</Text>
                            </View>
                            <View style={s.summaryRow}>
                                <Text style={s.summaryLabel}>Disponível</Text>
                                <Text style={[s.summaryValue, { color: '#00D09C' }]}>
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
                <ScrollView style={m.container} showsVerticalScrollIndicator={false}>
                    <View style={m.handle} />
                    <Text style={m.title}>Novo Cartão</Text>

                    {/* Preview */}
                    <View style={[m.preview, { backgroundColor: color }]}>
                        <View style={m.previewTop}>
                            <Text style={m.previewName}>{name || 'Nome do Cartão'}</Text>
                            <Text style={m.previewBrand}>{BRANDS.find(b => b.key === brand)?.label || 'Bandeira'}</Text>
                        </View>
                        <Text style={m.previewDigits}>•••• •••• •••• {lastDigits || '****'}</Text>
                        <Text style={m.previewHolder}>{holder || 'NOME DO TITULAR'}</Text>
                    </View>

                    <Text style={m.label}>Nome do cartão *</Text>
                    <TextInput style={m.input} value={name} onChangeText={setName} placeholder="Ex: Nubank, Inter Gold..." placeholderTextColor="#4B5563" />

                    <Text style={m.label}>Banco / Emissor</Text>
                    <TextInput style={m.input} value={bank} onChangeText={setBank} placeholder="Ex: Nubank" placeholderTextColor="#4B5563" />

                    <Text style={m.label}>Nome no cartão</Text>
                    <TextInput style={m.input} value={holder} onChangeText={setHolder} placeholder="NOME SOBRENOME" placeholderTextColor="#4B5563" autoCapitalize="characters" />

                    <Text style={m.label}>Últimos 4 dígitos</Text>
                    <TextInput style={m.input} value={lastDigits} onChangeText={(v) => setLastDigits(v.replace(/\D/g, '').slice(0, 4))} placeholder="1234" placeholderTextColor="#4B5563" keyboardType="numeric" maxLength={4} />

                    <Text style={m.label}>Bandeira</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={m.brandRow}>
                        {BRANDS.map(b => (
                            <TouchableOpacity key={b.key} style={[m.brandBtn, brand === b.key && { backgroundColor: b.color, borderColor: b.color }]} onPress={() => setBrand(b.key)}>
                                <Text style={[m.brandTxt, brand === b.key && { color: '#FFF' }]}>{b.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={m.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={m.label}>Limite (R$)</Text>
                            <TextInput style={m.input} value={limit} onChangeText={setLimit} placeholder="5000,00" placeholderTextColor="#4B5563" keyboardType="decimal-pad" />
                        </View>
                    </View>

                    <View style={m.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={m.label}>Dia fechamento</Text>
                            <TextInput style={m.input} value={closingDay} onChangeText={(v) => setClosingDay(v.replace(/\D/g, '').slice(0, 2))} placeholder="25" placeholderTextColor="#4B5563" keyboardType="numeric" maxLength={2} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={m.label}>Dia vencimento</Text>
                            <TextInput style={m.input} value={dueDay} onChangeText={(v) => setDueDay(v.replace(/\D/g, '').slice(0, 2))} placeholder="5" placeholderTextColor="#4B5563" keyboardType="numeric" maxLength={2} />
                        </View>
                    </View>

                    <Text style={m.label}>Cor do cartão</Text>
                    <View style={m.colorRow}>
                        {CARD_COLORS.map(c => (
                            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[m.colorDot, { backgroundColor: c }, color === c && m.colorDotActive]} />
                        ))}
                    </View>

                    <TouchableOpacity style={m.saveBtn} onPress={createCard} disabled={loading}>
                        {loading ? <ActivityIndicator color="#000" /> : <Text style={m.saveTxt}>Adicionar Cartão</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={m.cancelBtn} onPress={() => { setModal(false); resetForm(); }}>
                        <Text style={m.cancelTxt}>Cancelar</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0A0F1E' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
    sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00D09C', alignItems: 'center', justifyContent: 'center' },

    emptyBox: { margin: 20, backgroundColor: '#111827', borderRadius: 20, padding: 40, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00D09C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
    emptyBtnTxt: { color: '#000', fontWeight: '700', fontSize: 14 },

    section: { paddingHorizontal: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },

    summaryCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, color: '#9CA3AF' },
    summaryValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

const m = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0F1E', padding: 24, paddingTop: 12 },
    handle: { width: 40, height: 4, backgroundColor: '#374151', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 20 },
    preview: { borderRadius: 16, padding: 20, marginBottom: 24, minHeight: 140 },
    previewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    previewName: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    previewBrand: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    previewDigits: { fontSize: 16, color: '#FFF', letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
    previewHolder: { fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
    label: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#374151', paddingHorizontal: 16, height: 52, color: '#FFFFFF', fontSize: 15, marginBottom: 16 },
    row: { flexDirection: 'row' },
    brandRow: { marginBottom: 16 },
    brandBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827', marginRight: 8, borderWidth: 1, borderColor: '#374151' },
    brandTxt: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
    colorRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    colorDot: { width: 36, height: 36, borderRadius: 18 },
    colorDotActive: { borderWidth: 3, borderColor: '#FFFFFF' },
    saveBtn: { height: 52, backgroundColor: '#00D09C', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    saveTxt: { color: '#000', fontWeight: '800', fontSize: 16 },
    cancelBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    expiryText: { color: '#FFF', fontSize: 11, fontWeight: '500', opacity: 0.8 },
    billsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    billsBtnTxt: { color: '#00D09C', fontSize: 11, fontWeight: '700' },
});
