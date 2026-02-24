import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Switch, ActivityIndicator, Platform,
    KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { api } from '@/services/api';

const COLORS = {
    background: '#0A0F1E',
    surface: '#111827',
    surfaceLight: '#1F2937',
    primary: '#00D09C',
    expense: '#FF6B6B',
    income: '#00D09C',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#4B5563',
    border: 'rgba(255,255,255,0.07)',
};

const FREQUENCIES = [
    { key: 'daily', label: 'Diário' },
    { key: 'weekly', label: 'Semanal' },
    { key: 'monthly', label: 'Mensal' },
    { key: 'yearly', label: 'Anual' },
];

export default function NewTransactionScreen() {
    const { type: initialType } = useLocalSearchParams<{ type?: string }>();
    const [type, setType] = useState<'income' | 'expense'>(initialType === 'income' ? 'income' : 'expense');
    const [payMethod, setPayMethod] = useState<'account' | 'card'>('account');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Recurring state
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState('monthly');
    const [installments, setInstallments] = useState(''); // empty means until canceled
    const [isPaid, setIsPaid] = useState(true);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [accs, cats] = await Promise.all([api.getAccounts() as Promise<any[]>, api.getCategories() as Promise<any[]>]);
                setAccounts(accs);
                setCategories(cats);
                // Default account selection based on payMethod
                const filteredAccs = accs.filter(a => payMethod === 'card' ? a.type === 'credit_card' : a.type !== 'credit_card');
                if (filteredAccs.length > 0) setSelectedAccount(filteredAccs[0].id);
            } catch (e) { console.error(e); }
            finally { setFetching(false); }
        }
        load();
    }, []);

    useEffect(() => {
        const filteredAccs = accounts.filter(a => payMethod === 'card' ? a.type === 'credit_card' : a.type !== 'credit_card');
        if (filteredAccs.length > 0 && !filteredAccs.find(a => a.id === selectedAccount)) {
            setSelectedAccount(filteredAccs[0].id);
        }
    }, [payMethod, accounts]);

    const filteredCats = categories.filter(c => c.type === type);
    const filteredAccs = accounts.filter(a => payMethod === 'card' ? a.type === 'credit_card' : a.type !== 'credit_card');

    async function handleSave() {
        if (!amount || !description || !selectedAccount || !selectedCategory) {
            Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
            return;
        }
        setLoading(true);
        try {
            const val = parseFloat(amount.replace(',', '.'));

            if (isRecurring) {
                await api.createRecurring({
                    account_id: selectedAccount,
                    category_id: selectedCategory,
                    type,
                    amount: val,
                    description,
                    frequency,
                    start_date: new Date().toISOString(),
                    is_active: true,
                });
            } else {
                await api.createTransaction({
                    account_id: selectedAccount,
                    category_id: selectedCategory,
                    type,
                    amount: val,
                    description,
                    notes,
                    date: date.toISOString(),
                    is_paid: isPaid,
                    due_date: !isPaid ? date.toISOString() : null,
                    paid_at: isPaid ? date.toISOString() : null,
                    tags: [],
                });
            }
            router.back();
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally {
            setLoading(false);
        }
    }

    if (fetching) return (
        <View style={[s.container, { justifyContent: 'center' }]}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    return (
        <View style={s.container}>
            <View style={s.handle} />
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
                    <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={s.title}>{isRecurring ? 'Novo Recorrente' : 'Nova Transação'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={s.saveBtn}>
                    {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
                        {/* Type selector (Income/Expense) */}
                        <View style={s.typeToggle}>
                            <TouchableOpacity
                                style={[s.typeBtn, type === 'expense' && s.typeBtnExpense]}
                                onPress={() => setType('expense')}
                            >
                                <Ionicons name="arrow-up-circle" size={18} color={type === 'expense' ? '#000' : COLORS.expense} />
                                <Text style={[s.typeBtnTxt, type === 'expense' && { color: '#000' }]}>Despesa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.typeBtn, type === 'income' && s.typeBtnIncome]}
                                onPress={() => setType('income')}
                            >
                                <Ionicons name="arrow-down-circle" size={18} color={type === 'income' ? '#000' : COLORS.income} />
                                <Text style={[s.typeBtnTxt, type === 'income' && { color: '#000' }]}>Receita</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Amount Input */}
                        <View style={s.amountWrap}>
                            <Text style={s.currency}>R$</Text>
                            <TextInput
                                style={s.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0,00"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="decimal-pad"
                                autoFocus
                            />
                        </View>

                        {/* Payment Method Selector (Card vs Account) */}
                        {type === 'expense' && (
                            <View style={s.methodToggle}>
                                <TouchableOpacity
                                    style={[s.methodBtn, payMethod === 'account' && s.methodBtnActive]}
                                    onPress={() => setPayMethod('account')}
                                >
                                    <Ionicons name="wallet-outline" size={16} color={payMethod === 'account' ? '#000' : COLORS.textSecondary} />
                                    <Text style={[s.methodTxt, payMethod === 'account' && { color: '#000' }]}>Conta / Dinheiro</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.methodBtn, payMethod === 'card' && s.methodBtnActive]}
                                    onPress={() => setPayMethod('card')}
                                >
                                    <Ionicons name="card-outline" size={16} color={payMethod === 'card' ? '#000' : COLORS.textSecondary} />
                                    <Text style={[s.methodTxt, payMethod === 'card' && { color: '#000' }]}>Cartão de Crédito</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Recurring Switch */}
                        {type === 'expense' && (
                            <View style={s.fieldGroup}>
                                <View style={s.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.fieldLabel}>Pagamento Recorrente?</Text>
                                        <Text style={s.fieldSub}>Assinaturas, aluguel, etc.</Text>
                                    </View>
                                    <Switch
                                        value={isRecurring}
                                        onValueChange={setIsRecurring}
                                        trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '80' }}
                                        thumbColor={isRecurring ? COLORS.primary : COLORS.textSecondary}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Recurrence Options */}
                        {isRecurring && (
                            <View style={s.recurringPanel}>
                                <Text style={s.labelInner}>Frequência</Text>
                                <View style={s.freqRow}>
                                    {FREQUENCIES.map(f => (
                                        <TouchableOpacity
                                            key={f.key}
                                            style={[s.freqBtn, frequency === f.key && s.freqBtnActive]}
                                            onPress={() => setFrequency(f.key)}
                                        >
                                            <Text style={[s.freqTxt, frequency === f.key && { color: '#000' }]}>{f.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Paid Toggle */}
                        <View style={s.fieldGroup}>
                            <View style={s.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.fieldLabel}>{type === 'income' ? 'Já recebeu?' : 'Já pagou?'}</Text>
                                    <Text style={s.fieldSub}>{isPaid
                                        ? (type === 'income' ? 'Valor já entrou na conta' : 'Valor já saiu da conta')
                                        : (type === 'income' ? 'Agendar recebimento' : 'Agendar para o vencimento')}
                                    </Text>
                                </View>
                                <Switch
                                    value={isPaid}
                                    onValueChange={setIsPaid}
                                    trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '80' }}
                                    thumbColor={isPaid ? COLORS.primary : COLORS.textSecondary}
                                />
                            </View>
                        </View>

                        {/* Date Selection */}
                        <View style={s.fieldGroup}>
                            <Text style={s.fieldLabel}>{isPaid ? 'Data do Pagamento' : 'Data de Vencimento'}</Text>
                            <TouchableOpacity style={s.input} onPress={() => setShowPicker(true)}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: COLORS.text, fontSize: 15 }}>
                                        {format(date, 'dd/MM/yyyy')}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                </View>
                            </TouchableOpacity>

                            {showPicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        setShowPicker(Platform.OS === 'ios');
                                        if (selectedDate) setDate(selectedDate);
                                    }}
                                />
                            )}
                        </View>

                        {/* Description */}
                        <View style={s.fieldGroup}>
                            <Text style={s.fieldLabel}>Descrição *</Text>
                            <TextInput
                                style={s.input}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Ex: Supermercado, Aluguel..."
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>

                        {/* Account Selection */}
                        <View style={s.fieldGroup}>
                            <Text style={s.fieldLabel}>{payMethod === 'card' ? 'Cartão' : 'Conta'} *</Text>
                            {filteredAccs.length === 0 ? (
                                <TouchableOpacity style={s.emptyAcc} onPress={() => router.push(payMethod === 'card' ? '/cards' : '/account/new')}>
                                    <Text style={s.emptyAccTxt}>+ Cadastrar {payMethod === 'card' ? 'cartão' : 'conta'}</Text>
                                </TouchableOpacity>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
                                    {filteredAccs.map(acc => (
                                        <TouchableOpacity
                                            key={acc.id}
                                            style={[s.chip, selectedAccount === acc.id && { backgroundColor: acc.color, borderColor: acc.color }]}
                                            onPress={() => setSelectedAccount(acc.id)}
                                        >
                                            <Ionicons name={(acc.icon || 'wallet') as any} size={14} color={selectedAccount === acc.id ? '#000' : acc.color} />
                                            <Text style={[s.chipTxt, selectedAccount === acc.id && { color: '#000' }]}>{acc.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Category Selection */}
                        <View style={s.fieldGroup}>
                            <Text style={s.fieldLabel}>Categoria *</Text>
                            <View style={s.catGrid}>
                                {filteredCats.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[s.catChip, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '20' }]}
                                        onPress={() => setSelectedCategory(cat.id)}
                                    >
                                        <Ionicons name={(cat.icon || 'pricetag') as any} size={16} color={selectedCategory === cat.id ? cat.color : COLORS.textSecondary} />
                                        <Text style={[s.catTxt, selectedCategory === cat.id && { color: cat.color }]} numberOfLines={1}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={s.catChip} onPress={() => router.push('/(tabs)/more')}>
                                    <Ionicons name="add" size={16} color={COLORS.primary} />
                                    <Text style={[s.catTxt, { color: COLORS.primary }]}>Nova</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={s.fieldGroup}>
                            <Text style={s.fieldLabel}>Observações</Text>
                            <TextInput
                                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Opcional..."
                                placeholderTextColor={COLORS.textMuted}
                                multiline
                            />
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    handle: { width: 40, height: 4, backgroundColor: COLORS.surfaceLight, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    closeBtn: { padding: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 20 },
    title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
    saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    saveBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

    content: { padding: 20 },

    typeToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, padding: 4, marginBottom: 24 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
    typeBtnExpense: { backgroundColor: COLORS.expense },
    typeBtnIncome: { backgroundColor: COLORS.income },
    typeBtnTxt: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },

    amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 },
    currency: { fontSize: 24, fontWeight: '700', color: COLORS.textSecondary },
    amountInput: { fontSize: 48, fontWeight: '800', color: COLORS.text, minWidth: 150, textAlign: 'center' },

    methodToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 20 },
    methodBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    methodBtnActive: { backgroundColor: COLORS.textSecondary },
    methodTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

    fieldGroup: { marginBottom: 24 },
    fieldLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    switchRow: { flexDirection: 'row', alignItems: 'center' },

    recurringPanel: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
    labelInner: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
    freqRow: { flexDirection: 'row', gap: 8 },
    freqBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    freqBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    freqTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

    input: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },

    chipRow: { flexDirection: 'row' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 10 },
    chipTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    emptyAcc: { padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.textMuted, borderRadius: 14, alignItems: 'center' },
    emptyAccTxt: { color: COLORS.textMuted, fontWeight: '600' },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    catTxt: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
});
