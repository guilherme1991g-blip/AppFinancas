import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ActivityIndicator, Modal, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { BRANDS } from '@/constants/Brands';

const ACC_TYPES = [
    { value: 'checking', label: 'Conta Corrente', icon: 'business-outline' },
    { value: 'savings', label: 'Poupança', icon: 'leaf-outline' },
    { value: 'credit_card', label: 'Cartão de Crédito', icon: 'card-outline' },
    { value: 'wallet', label: 'Carteira', icon: 'wallet-outline' },
    { value: 'investment', label: 'Investimento', icon: 'trending-up-outline' },
];

// BRANDS removed - imported from constants/Brands

const CUSTOM_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6', '#64748B'];

export default function NewAccountScreen() {
    const { colors } = useTheme();
    const { type: typeParam } = useLocalSearchParams();

    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [balance, setBalance] = useState('0');
    const [type, setType] = useState('checking');
    const [color, setColor] = useState(CUSTOM_COLORS[0]);

    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);

    // Credit card specific state
    const [limit, setLimit] = useState('');
    const [closingDay, setClosingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [lastDigits, setLastDigits] = useState('');
    const [brand, setBrand] = useState('visa');
    const [showBrandModal, setShowBrandModal] = useState(false);

    const styles = s(colors);

    // Pre-select type from URL and load accounts
    React.useEffect(() => {
        if (typeParam) {
            setType(typeParam as string);
        }

        async function loadAccounts() {
            try {
                const accs = await api.getAccounts() as any[];
                setAccounts(accs.filter(a => a.type !== 'credit_card'));
            } catch (e) { console.error(e); }
        }
        loadAccounts();
    }, [typeParam]);

    async function handleSave() {
        if (type !== 'credit_card' && !name) { Alert.alert('Atenção', 'Informe o nome da conta'); return; }

        setLoading(true);
        try {
            const data: any = {
                name,
                bank,
                type,
                balance: parseFloat(balance.replace(',', '.')) || 0,
                color
            };

            if (type === 'credit_card') {
                data.credit_limit = parseFloat(limit.replace(',', '.')) || 0;
                data.closing_day = parseInt(closingDay) || 25;
                data.due_day = parseInt(dueDay) || 5;
                data.last_digits = lastDigits;
                data.card_brand = brand;
                data.icon = 'card';
            }

            await api.createAccount(data);
            router.back();
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally { setLoading(false); }
    }

    const currentBrand = BRANDS.find(b => b.value === brand);

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{type === 'credit_card' ? 'Novo Cartão' : 'Nova Conta'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.saveBtn, loading && { opacity: 0.7 }]}>
                    {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Preview card removed for simplicity */}

                        {/* Show type selection only for accounts (or if not pre-selected as card) */}
                        {type !== 'credit_card' && (
                            <>
                                <Text style={styles.sectionLabel}>Tipo de Conta</Text>
                                <View style={styles.typeGrid}>
                                    {ACC_TYPES.map(t => (
                                        <TouchableOpacity
                                            key={t.value}
                                            style={[styles.typeChip, type === t.value && { borderColor: color, backgroundColor: color + '15' }]}
                                            onPress={() => setType(t.value)}
                                        >
                                            <Ionicons name={t.icon as any} size={18} color={type === t.value ? color : colors.textSecondary} />
                                            <Text style={[styles.typeText, type === t.value && { color, fontWeight: '800' }]}>{t.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        {type === 'credit_card' && (
                            <>
                                <Text style={styles.sectionLabel}>Bandeira do Cartão</Text>
                                <TouchableOpacity
                                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }]}
                                    onPress={() => setShowBrandModal(true)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={[styles.brandIconCircle, { backgroundColor: '#FFFFFF' }]}>
                                            {currentBrand?.logo ? (
                                                <Image source={{ uri: currentBrand.logo }} style={styles.brandLogoSmall} resizeMode="contain" />
                                            ) : (
                                                <Ionicons name="card" size={20} color={currentBrand?.color || colors.textMuted} />
                                            )}
                                        </View>
                                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{currentBrand?.label}</Text>
                                    </View>
                                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                                </TouchableOpacity>

                                <Modal
                                    visible={showBrandModal}
                                    animationType="slide"
                                    transparent={true}
                                    onRequestClose={() => setShowBrandModal(false)}
                                >
                                    <View style={styles.modalOverlay}>
                                        <View style={styles.modalContent}>
                                            <View style={styles.modalHeader}>
                                                <Text style={styles.modalTitle}>Selecionar Bandeira</Text>
                                                <TouchableOpacity onPress={() => setShowBrandModal(false)} style={styles.modalClose}>
                                                    <Ionicons name="close" size={24} color={colors.text} />
                                                </TouchableOpacity>
                                            </View>
                                            <ScrollView contentContainerStyle={{ padding: 20 }}>
                                                <View style={styles.brandGrid}>
                                                    {BRANDS.map(b => (
                                                        <TouchableOpacity
                                                            key={b.value}
                                                            style={[styles.brandItem, brand === b.value && { borderColor: b.color, backgroundColor: b.color + '10' }]}
                                                            onPress={() => {
                                                                setBrand(b.value);
                                                                setShowBrandModal(false);
                                                            }}
                                                        >
                                                            <View style={[styles.brandIcon, { backgroundColor: '#FFFFFF' }]}>
                                                                {b.logo ? (
                                                                    <Image source={{ uri: b.logo }} style={styles.brandLogoModal} resizeMode="contain" />
                                                                ) : (
                                                                    <Ionicons name="card" size={22} color={b.color} />
                                                                )}
                                                            </View>
                                                            <Text style={[styles.brandItemTxt, { color: colors.text }]} numberOfLines={1}>{b.label}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </ScrollView>
                                        </View>
                                    </View>
                                </Modal>
                            </>
                        )}

                        <Text style={styles.sectionLabel}>Informações Principais</Text>
                        <View style={styles.card}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>{type === 'credit_card' ? 'Nome para Identificar o Cartão *' : 'Nome da Conta *'}</Text>
                                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={type === 'credit_card' ? "Ex: Nubank Platinum, Cartão Mercado Livre..." : "Ex: Nubank, Inter, Principal..."} placeholderTextColor={colors.textMuted} />
                            </View>

                            {type !== 'credit_card' && (
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Banco / Instituição</Text>
                                    <TextInput style={styles.input} value={bank} onChangeText={setBank} placeholder="Ex: Nubank" placeholderTextColor={colors.textMuted} />
                                </View>
                            )}

                            {type !== 'credit_card' && (
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Saldo Inicial</Text>
                                    <TextInput style={styles.input} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} />
                                </View>
                            )}

                            {type === 'credit_card' && (
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Conta Vinculada *</Text>
                                    <View style={styles.chipRow}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {accounts.map(acc => (
                                                <TouchableOpacity
                                                    key={acc.id}
                                                    style={[styles.chip, bank === acc.name && { backgroundColor: acc.color, borderColor: acc.color }]}
                                                    onPress={() => {
                                                        setBank(acc.name);
                                                        setColor(acc.color); // Sync color with linked account if desired
                                                    }}
                                                >
                                                    <Ionicons name={(acc.icon || 'wallet') as any} size={14} color={bank === acc.name ? colors.white : acc.color} />
                                                    <Text style={[styles.chipTxt, bank === acc.name && { color: colors.white }]}>{acc.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {accounts.length === 0 && (
                                                <TouchableOpacity style={styles.emptyAcc} onPress={() => router.push('/account/new')}>
                                                    <Text style={styles.emptyAccTxt}>+ Cadastrar conta</Text>
                                                </TouchableOpacity>
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}

                            {type === 'credit_card' && (
                                <>
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.label}>Limite de Crédito</Text>
                                        <TextInput style={styles.input} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="R$ 0,00" placeholderTextColor={colors.textMuted} />
                                    </View>
                                    <View style={styles.row}>
                                        <View style={[styles.fieldGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>Fechamento (dia)</Text>
                                            <TextInput style={styles.input} value={closingDay} onChangeText={setClosingDay} keyboardType="number-pad" placeholder="25" placeholderTextColor={colors.textMuted} maxLength={2} />
                                        </View>
                                        <View style={[styles.fieldGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>Vencimento (dia)</Text>
                                            <TextInput style={styles.input} value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="5" placeholderTextColor={colors.textMuted} maxLength={2} />
                                        </View>
                                    </View>
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.label}>Final do Cartão (4 dígitos)</Text>
                                        <TextInput style={styles.input} value={lastDigits} onChangeText={setLastDigits} keyboardType="number-pad" placeholder="1234" placeholderTextColor={colors.textMuted} maxLength={4} />
                                    </View>
                                </>
                            )}
                        </View>

                        <>
                            <Text style={styles.sectionLabel}>Personalização</Text>
                            <View style={styles.card}>
                                <Text style={styles.label}>Cor</Text>
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
                        </>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
    previewType: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
    previewBalance: { fontSize: 18, fontWeight: '900', color: colors.text },

    sectionLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border },
    fieldGroup: { gap: 8 },
    label: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
    input: { backgroundColor: colors.background, borderRadius: 16, padding: 16, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },

    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    typeText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

    brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    brandItem: { width: '30%', aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    brandIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    brandItemTxt: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
    brandIconCircle: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    brandText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    brandLogoSmall: { width: 22, height: 22 },
    brandLogoModal: { width: 30, height: 30 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '50%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    modalClose: { padding: 4 },

    row: { flexDirection: 'row', gap: 12 },

    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 4 },
    colorDot: { width: 36, height: 36, borderRadius: 18 },

    chipRow: { flexDirection: 'row', marginTop: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 10 },
    chipTxt: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    emptyAcc: { padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.textMuted, borderRadius: 16, alignItems: 'center', minWidth: 150 },
    emptyAccTxt: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
