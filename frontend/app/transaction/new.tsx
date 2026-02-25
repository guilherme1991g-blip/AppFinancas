import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Switch, ActivityIndicator, Platform,
    KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

// Forces monthly frequency for simplicity
const FREQUENCY = 'monthly';

export default function NewTransactionScreen() {
    const insets = useSafeAreaInsets();
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
    const [installments, setInstallments] = useState('12');
    const [isUnlimited, setIsUnlimited] = useState(true);
    const [isPaid, setIsPaid] = useState(true);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    // Credit Card specific state
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState('2');

    useEffect(() => {
        async function load() {
            try {
                const [accs, cats] = await Promise.all([api.getAccounts() as Promise<any[]>, api.getCategories() as Promise<any[]>]);
                setAccounts(accs);
                setCategories(cats);
                const filteredAccs = accs.filter(a => payMethod === 'card' ? a.type === 'credit_card' : a.type !== 'credit_card');
                if (filteredAccs.length > 0) setSelectedAccount(filteredAccs[0].id);

                // Default category selection
                if (!selectedCategory) {
                    const outros = cats.find(c => c.name === 'Outros' && c.type === (initialType === 'income' ? 'income' : 'expense'));
                    if (outros) setSelectedCategory(outros.id);
                }
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

    useEffect(() => {
        // Update default category when type changes
        const currentCat = categories.find(c => c.id === selectedCategory);
        if (!currentCat || currentCat.type !== type) {
            const outros = categories.find(c => c.name === 'Outros' && c.type === type);
            if (outros) setSelectedCategory(outros.id);
        }
    }, [type, categories]);

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
                    frequency: FREQUENCY,
                    start_date: date.toISOString(),
                    installments: isUnlimited ? null : parseInt(installments) || 1,
                    is_active: true,
                    company_id: null
                });
            } else if (payMethod === 'card' && isInstallment) {
                const count = parseInt(installmentsCount) || 2;
                const installmentValue = val / count;
                const account = accounts.find(a => a.id === selectedAccount);
                const closingDay = account?.closing_day || 10;

                // Purchase date
                const purchaseDate = new Date(date);

                for (let i = 0; i < count; i++) {
                    const installmentDate = new Date(purchaseDate);
                    // If purchase day is after closing day, the first installment is for next month
                    let targetMonth = purchaseDate.getMonth() + i;
                    if (purchaseDate.getDate() > closingDay) {
                        targetMonth += 1;
                    }

                    installmentDate.setMonth(targetMonth);
                    // We don't need to be exact here, usually bill dates are just month/year
                    // But we set a "due date" based on due_day if exists
                    const dueDay = account?.due_day || closingDay + 7;
                    installmentDate.setDate(dueDay);

                    await api.createTransaction({
                        account_id: selectedAccount,
                        category_id: selectedCategory,
                        type,
                        amount: installmentValue,
                        description: `${description} (${i + 1}/${count})`,
                        notes,
                        date: installmentDate.toISOString(),
                        is_paid: false, // Credit card installments are usually unpaid until bill is paid
                        due_date: installmentDate.toISOString(),
                        paid_at: null,
                        tags: [],
                    });
                }
            } else {
                let finalDate = date;
                let finalIsPaid = isPaid;

                if (payMethod === 'card') {
                    const account = accounts.find(a => a.id === selectedAccount);
                    const closingDay = account?.closing_day || 10;
                    const purchaseDate = new Date(date);

                    if (purchaseDate.getDate() > closingDay) {
                        // Move to next month's bill
                        const nextBillDate = new Date(purchaseDate);
                        nextBillDate.setMonth(nextBillDate.getMonth() + 1);
                        const dueDay = account?.due_day || closingDay + 7;
                        nextBillDate.setDate(dueDay);
                        finalDate = nextBillDate;
                    }
                    finalIsPaid = true; // Always true for cards to update debt balance
                }

                await api.createTransaction({
                    account_id: selectedAccount,
                    category_id: selectedCategory,
                    type,
                    amount: val,
                    description,
                    notes,
                    date: finalDate.toISOString(),
                    is_paid: finalIsPaid,
                    due_date: !finalIsPaid ? finalDate.toISOString() : null,
                    paid_at: finalIsPaid ? finalDate.toISOString() : null,
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
        <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
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
                                    onPress={() => {
                                        setPayMethod('account');
                                        setIsPaid(true); // Default to paid when switching back to account
                                    }}
                                >
                                    <Ionicons name="wallet-outline" size={16} color={payMethod === 'account' ? colors.white : colors.textSecondary} />
                                    <Text style={[styles.methodTxt, payMethod === 'account' && { color: colors.white }]}>Conta / Dinheiro</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.methodBtn, payMethod === 'card' && styles.methodBtnActive]}
                                    onPress={() => {
                                        setPayMethod('card');
                                        setIsPaid(false); // Default to unpaid for card
                                        setIsRecurring(false); // Ensure recurring is off for card
                                    }}
                                >
                                    <Ionicons name="card-outline" size={16} color={payMethod === 'card' ? colors.white : colors.textSecondary} />
                                    <Text style={[styles.methodTxt, payMethod === 'card' && { color: colors.white }]}>Cartão de Crédito</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Credit Card Installments Option */}
                        {payMethod === 'card' && !isRecurring && (
                            <View style={styles.settingsGroup}>
                                <View style={styles.settingRow}>
                                    <View style={[styles.settingIconWrap, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.settingLabel}>Pagamento</Text>
                                        <Text style={styles.settingSub}>{isInstallment ? 'Parcelado' : 'À vista'}</Text>
                                    </View>
                                    <View style={styles.miniToggle}>
                                        <TouchableOpacity
                                            style={[styles.miniBtn, !isInstallment && styles.miniBtnActive]}
                                            onPress={() => setIsInstallment(false)}
                                        >
                                            <Text style={[styles.miniBtnTxt, !isInstallment && { color: colors.white }]}>À vista</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.miniBtn, isInstallment && styles.miniBtnActive]}
                                            onPress={() => setIsInstallment(true)}
                                        >
                                            <Text style={[styles.miniBtnTxt, isInstallment && { color: colors.white }]}>Parcelado</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {isInstallment && (
                                    <View style={styles.settingRow}>
                                        <View style={[styles.settingIconWrap, { backgroundColor: '#FF9F4315' }]}>
                                            <Ionicons name="list" size={20} color="#FF9F43" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.settingLabel}>Número de Parcelas</Text>
                                        </View>
                                        <TextInput
                                            style={styles.installmentInput}
                                            value={installmentsCount}
                                            onChangeText={setInstallmentsCount}
                                            keyboardType="numeric"
                                            placeholder="Ex: 3"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Recurring Switch & Options */}
                        {payMethod !== 'card' && (
                            <View style={styles.settingsGroup}>
                                <View style={styles.settingRow}>
                                    <View style={styles.settingIconWrap}>
                                        <Ionicons name="repeat" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.settingLabel}>Lançamento Recorrente</Text>
                                        <Text style={styles.settingSub}>Repetir mensalmente</Text>
                                    </View>
                                    <Switch
                                        value={isRecurring}
                                        onValueChange={setIsRecurring}
                                        trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                        thumbColor={isRecurring ? colors.primary : colors.textSecondary}
                                    />
                                </View>

                                {isRecurring && (
                                    <>
                                        <View style={styles.settingRow}>
                                            <View style={[styles.settingIconWrap, { backgroundColor: colors.secondary + '15' }]}>
                                                <Ionicons name="infinite" size={20} color={colors.secondary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.settingLabel}>Ilimitado</Text>
                                                <Text style={styles.settingSub}>Sem data de término</Text>
                                            </View>
                                            <Switch
                                                value={isUnlimited}
                                                onValueChange={setIsUnlimited}
                                                trackColor={{ false: colors.border, true: colors.secondary + '80' }}
                                                thumbColor={isUnlimited ? colors.secondary : colors.textSecondary}
                                            />
                                        </View>

                                        {!isUnlimited && (
                                            <View style={styles.settingRow}>
                                                <View style={[styles.settingIconWrap, { backgroundColor: '#FF9F4315' }]}>
                                                    <Ionicons name="list" size={20} color="#FF9F43" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.settingLabel}>Quantidade de Vezes</Text>
                                                </View>
                                                <TextInput
                                                    style={styles.installmentInput}
                                                    value={installments}
                                                    onChangeText={setInstallments}
                                                    keyboardType="numeric"
                                                    placeholder="Ex: 12"
                                                    placeholderTextColor={colors.textMuted}
                                                />
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        )}

                        {/* Paid Toggle (only for non-recurring and non-card) */}
                        {!isRecurring && payMethod !== 'card' && (
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
                        )}

                        {/* Date Selection */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{payMethod === 'card' ? 'Data da Compra' : (isPaid ? 'Data do Pagamento' : 'Data de Vencimento')}</Text>
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
                                        setShowPicker(false);
                                        if (selectedDate) {
                                            setDate(selectedDate);
                                            // Normalizar datas para comparação (apenas ano/mês/dia)
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);

                                            const pickDate = new Date(selectedDate);
                                            pickDate.setHours(0, 0, 0, 0);

                                            if (pickDate > today) {
                                                setIsPaid(false);
                                            }
                                        }
                                    }}
                                />
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
                            <TouchableOpacity
                                style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                onPress={() => setShowCategoryModal(true)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    {selectedCategory ? (() => {
                                        const cat = categories.find(c => c.id === selectedCategory);
                                        return (
                                            <>
                                                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: cat?.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Ionicons name={(cat?.icon || 'pricetag') as any} size={18} color={cat?.color} />
                                                </View>
                                                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{cat?.name}</Text>
                                            </>
                                        );
                                    })() : (
                                        <>
                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
                                            </View>
                                            <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '500' }}>Selecionar categoria</Text>
                                        </>
                                    )}
                                </View>
                                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                            </TouchableOpacity>

                            {/* Category Modal */}
                            <Modal
                                visible={showCategoryModal}
                                animationType="slide"
                                transparent={true}
                                onRequestClose={() => setShowCategoryModal(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalContent}>
                                        <View style={styles.modalHeader}>
                                            <Text style={styles.modalTitle}>Selecionar Categoria</Text>
                                            <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalClose}>
                                                <Ionicons name="close" size={24} color={colors.text} />
                                            </TouchableOpacity>
                                        </View>
                                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 20 + insets.bottom }}>
                                            <View style={styles.catGrid}>
                                                {filteredCats.map(cat => (
                                                    <TouchableOpacity
                                                        key={cat.id}
                                                        style={[styles.catItem, selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '10' }]}
                                                        onPress={() => {
                                                            setSelectedCategory(cat.id);
                                                            setShowCategoryModal(false);
                                                        }}
                                                    >
                                                        <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                                                            <Ionicons name={(cat.icon || 'pricetag') as any} size={20} color={cat.color} />
                                                        </View>
                                                        <Text style={[styles.catItemTxt, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                                <TouchableOpacity
                                                    style={styles.catItem}
                                                    onPress={() => {
                                                        setShowCategoryModal(false);
                                                        router.push('/(tabs)/more');
                                                    }}
                                                >
                                                    <View style={[styles.catIcon, { backgroundColor: colors.primary + '15' }]}>
                                                        <Ionicons name="add" size={20} color={colors.primary} />
                                                    </View>
                                                    <Text style={[styles.catItemTxt, { color: colors.primary }]}>Nova</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </ScrollView>
                                    </View>
                                </View>
                            </Modal>
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
        </View >
    );
}

const s = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    handle: { width: 40, height: 4, backgroundColor: colors.surface, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
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

    settingsGroup: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },
    settingIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
    settingLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    settingSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
    installmentInput: { width: 60, height: 40, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },

    freqRow: { flexDirection: 'row', gap: 8, marginTop: 12, width: '100%' },
    freqBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    freqBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    freqTxt: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    miniToggle: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, padding: 2, borderWidth: 1, borderColor: colors.border },
    miniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    miniBtnActive: { backgroundColor: colors.primary },
    miniBtnTxt: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },

    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, fontWeight: '500' },

    chipRow: { flexDirection: 'row' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 10 },
    chipTxt: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    emptyAcc: { padding: 18, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.textMuted, borderRadius: 16, alignItems: 'center' },
    emptyAccTxt: { color: colors.textMuted, fontWeight: '700' },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    catItem: { width: '30%', aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    catIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    catItemTxt: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    modalClose: { padding: 4 },
});
