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
import { useTheme } from '@/contexts/ThemeContext';

const FREQUENCIES = [
    { key: 'daily', label: 'Diário' },
    { key: 'weekly', label: 'Semanal' },
    { key: 'monthly', label: 'Mensal' },
    { key: 'yearly', label: 'Anual' },
];

export default function NewTransactionScreen() {
    const { mode, colors } = useTheme();
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
    const [installments, setInstallments] = useState('');
    const [isPaid, setIsPaid] = useState(true);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [accs, cats] = await Promise.all([api.getAccounts() as Promise<any[]>, api.getCategories() as Promise<any[]>]);
                setAccounts(accs);
                setCategories(cats);
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
            const val = Math.abs(parseFloat(amount.replace(',', '.')));

            if (isRecurring) {
                await api.createRecurring({
                    account_id: selectedAccount,
                    category_id: selectedCategory,
                    type,
                    amount: val,
                    description,
                    frequency,
                    start_date: date.toISOString(),
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

    const styles = s(colors);

    if (fetching) return (
        <View style={[styles.container, { justifyContent: 'center' }]}>
            <ActivityIndicator color={colors.primary} size="large" />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{isRecurring ? 'Novo Recorrente' : (type === 'income' ? 'Nova Receita' : 'Nova Despesa')}</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                        {/* Type selector (Income/Expense) */}
                        <View style={styles.typeToggle}>
                            <TouchableOpacity
                                style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
                                onPress={() => setType('expense')}
                            >
                                <Ionicons name="arrow-up-circle" size={18} color={type === 'expense' ? colors.white : colors.expense} />
                                <Text style={[styles.typeBtnTxt, type === 'expense' && { color: colors.white }]}>Despesa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
                                onPress={() => setType('income')}
                            >
                                <Ionicons name="arrow-down-circle" size={18} color={type === 'income' ? colors.white : colors.income} />
                                <Text style={[styles.typeBtnTxt, type === 'income' && { color: colors.white }]}>Receita</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Amount Input */}
                        <View style={styles.amountWrap}>
                            <Text style={styles.currency}>R$</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0,00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                autoFocus
                            />
                        </View>

                        {/* Payment Method Selector (Card vs Account) */}
                        {type === 'expense' && (
                            <View style={styles.methodToggle}>
                                <TouchableOpacity
                                    style={[styles.methodBtn, payMethod === 'account' && styles.methodBtnActive]}
                                    onPress={() => setPayMethod('account')}
                                >
                                    <Ionicons name="wallet-outline" size={16} color={payMethod === 'account' ? colors.white : colors.textSecondary} />
                                    <Text style={[styles.methodTxt, payMethod === 'account' && { color: colors.white }]}>Conta / Dinheiro</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.methodBtn, payMethod === 'card' && styles.methodBtnActive]}
                                    onPress={() => setPayMethod('card')}
                                >
                                    <Ionicons name="card-outline" size={16} color={payMethod === 'card' ? colors.white : colors.textSecondary} />
                                    <Text style={[styles.methodTxt, payMethod === 'card' && { color: colors.white }]}>Cartão de Crédito</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Recurring Switch */}
                        {type === 'expense' && (
                            <View style={styles.fieldGroup}>
                                <View style={styles.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fieldLabel}>Pagamento Recorrente?</Text>
                                        <Text style={styles.fieldSub}>Assinaturas, aluguel, etc.</Text>
                                    </View>
                                    <Switch
                                        value={isRecurring}
                                        onValueChange={setIsRecurring}
                                        trackColor={{ false: colors.surface, true: colors.primary + '80' }}
                                        thumbColor={isRecurring ? colors.primary : colors.textSecondary}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Recurrence Options */}
                        {isRecurring && (
                            <View style={styles.recurringPanel}>
                                <Text style={styles.labelInner}>Frequência</Text>
                                <View style={styles.freqRow}>
                                    {FREQUENCIES.map(f => (
                                        <TouchableOpacity
                                            key={f.key}
                                            style={[styles.freqBtn, frequency === f.key && styles.freqBtnActive]}
                                            onPress={() => setFrequency(f.key)}
                                        >
                                            <Text style={[styles.freqTxt, frequency === f.key && { color: colors.white }]}>{f.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Paid Toggle */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>{type === 'income' ? 'Já recebeu?' : 'Já pagou?'}</Text>
                                    <Text style={styles.fieldSub}>{isPaid
                                        ? (type === 'income' ? 'Valor já entrou na conta' : 'Valor já saiu da conta')
                                        : (type === 'income' ? 'Agendar recebimento' : 'Agendar para o vencimento')}
                                    </Text>
                                </View>
                                <Switch
                                    value={isPaid}
                                    onValueChange={setIsPaid}
                                    trackColor={{ false: colors.surface, true: colors.primary + '80' }}
                                    thumbColor={isPaid ? colors.primary : colors.textSecondary}
                                />
                            </View>
                        </View>

                        {/* Date Selection */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{isPaid ? 'Data do Pagamento' : 'Data de Vencimento'}</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                                        {format(date, 'dd/MM/yyyy')}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                </View>
                            </TouchableOpacity>

                            {showPicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                    themeVariant={mode}
                                    onChange={(event, selectedDate) => {
                                        if (Platform.OS !== 'ios') setShowPicker(false);
                                        if (selectedDate) setDate(selectedDate);
                                    }}
                                />
                            )}
                            {showPicker && Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={{ alignSelf: 'flex-end', marginTop: 10, padding: 8, backgroundColor: colors.primary + '20', borderRadius: 12 }}
                                    onPress={() => setShowPicker(false)}
                                >
                                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Confirmar</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Description */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Descrição *</Text>
                            <TextInput
                                style={styles.input}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Ex: Supermercado, Aluguel..."
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        {/* Account Selection */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{payMethod === 'card' ? 'Cartão' : 'Conta'} *</Text>
                            {filteredAccs.length === 0 ? (
                                <TouchableOpacity style={styles.emptyAcc} onPress={() => router.push(payMethod === 'card' ? '/cards' : '/account/new')}>
                                    <Text style={styles.emptyAccTxt}>+ Cadastrar {payMethod === 'card' ? 'cartão' : 'conta'}</Text>
                                </TouchableOpacity>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                                    {filteredAccs.map(acc => (
                                        <TouchableOpacity
                                            key={acc.id}
                                            style={[styles.chip, selectedAccount === acc.id && { backgroundColor: acc.color, borderColor: acc.color }]}
                                            onPress={() => setSelectedAccount(acc.id)}
                                        >
                                            <Ionicons name={(acc.icon || 'wallet') as any} size={14} color={selectedAccount === acc.id ? colors.white : acc.color} />
                                            <Text style={[styles.chipTxt, selectedAccount === acc.id && { color: colors.white }]}>{acc.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Category Selection */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Categoria *</Text>
                            <View style={styles.catGrid}>
                                {filteredCats.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.catChip, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '20' }]}
                                        onPress={() => setSelectedCategory(cat.id)}
                                    >
                                        <Ionicons name={(cat.icon || 'pricetag') as any} size={16} color={selectedCategory === cat.id ? cat.color : colors.textSecondary} />
                                        <Text style={[styles.catTxt, selectedCategory === cat.id && { color: cat.color }]} numberOfLines={1}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.catChip} onPress={() => router.push('/(tabs)/more')}>
                                    <Ionicons name="add" size={16} color={colors.primary} />
                                    <Text style={[styles.catTxt, { color: colors.primary }]}>Nova</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Observações</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Opcional..."
                                placeholderTextColor={colors.textMuted}
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

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    handle: { width: 40, height: 4, backgroundColor: colors.surfaceSubtle, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    closeBtn: { padding: 8, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },

    content: { padding: 20 },

    typeToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
    typeBtnExpense: { backgroundColor: colors.expense },
    typeBtnIncome: { backgroundColor: colors.income },
    typeBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },

    amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 },
    currency: { fontSize: 24, fontWeight: '700', color: colors.textSecondary },
    amountInput: { fontSize: 48, fontWeight: '800', color: colors.text, minWidth: 150, textAlign: 'center' },

    methodToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    methodBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    methodBtnActive: { backgroundColor: colors.primary },
    methodTxt: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },

    fieldGroup: { marginBottom: 24 },
    fieldLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    fieldSub: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
    switchRow: { flexDirection: 'row', alignItems: 'center' },

    recurringPanel: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
    labelInner: { fontSize: 11, color: colors.textMuted, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },
    freqRow: { flexDirection: 'row', gap: 8 },
    freqBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    freqBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    freqTxt: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, fontWeight: '500' },

    chipRow: { flexDirection: 'row' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 10 },
    chipTxt: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    emptyAcc: { padding: 18, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.textMuted, borderRadius: 16, alignItems: 'center' },
    emptyAccTxt: { color: colors.textMuted, fontWeight: '700' },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    catTxt: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
});
