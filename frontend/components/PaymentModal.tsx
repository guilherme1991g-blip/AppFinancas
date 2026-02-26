import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, ActivityIndicator, Platform, ScrollView,
    KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface PaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialAmount: number;
    title: string;
    type: 'bill' | 'transaction';
    id: string; // billId or transactionId
}

export default function PaymentModal({ visible, onClose, onSuccess, initialAmount, title, type, id }: PaymentModalProps) {
    const { colors } = useTheme();
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    useEffect(() => {
        if (visible) {
            setAmount(Math.abs(initialAmount).toFixed(2).replace('.', ','));
            setDate(new Date());
            if (type === 'bill') {
                loadAccounts();
            }
        }
    }, [visible, initialAmount, type]);

    async function loadAccounts() {
        setLoadingAccounts(true);
        try {
            const data = await api.getAccounts() as any[];
            const filtered = data.filter(a => a.type !== 'credit_card');
            setAccounts(filtered);
            if (filtered.length > 0) setSelectedAccountId(filtered[0].id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAccounts(false);
        }
    }

    async function handleSubmit() {
        if (!amount || parseFloat(amount.replace(',', '.')) <= 0) {
            return;
        }

        setLoading(true);
        try {
            const finalAmount = parseFloat(amount.replace(',', '.'));
            const dateStr = date.toISOString();

            if (type === 'bill') {
                if (!selectedAccountId) throw new Error("Selecione uma conta para o pagamento");
                await api.payBill(id, {
                    payment_account_id: selectedAccountId,
                    amount: finalAmount,
                    date: dateStr
                });
            } else {
                await api.payTransaction(id, { date: dateStr, amount: finalAmount });
            }

            onSuccess();
            onClose();
        } catch (e: any) {
            console.error(e);
            Alert.alert("Erro no Pagamento", e.message || "Não foi possível processar o pagamento.");
        } finally {
            setLoading(false);
        }
    }

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.container}
                    >
                        <View style={[styles.content, { backgroundColor: colors.surface }]}>
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.section}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                                        {type === 'bill' ? 'Valor do Pagamento' : 'Novo Valor (Confirmar)'}
                                    </Text>
                                    <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <Text style={[styles.currency, { color: colors.textSecondary }]}>R$</Text>
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            value={amount}
                                            onChangeText={setAmount}
                                            keyboardType="numeric"
                                            placeholder="0,00"
                                            placeholderTextColor={colors.textSecondary + '80'}
                                        />
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Data do Pagamento</Text>
                                    <TouchableOpacity
                                        style={[styles.dateBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                        <Text style={[styles.dateText, { color: colors.text }]}>
                                            {date.toLocaleDateString('pt-BR')}
                                        </Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={date}
                                            mode="date"
                                            display="default"
                                            onChange={onDateChange}
                                        />
                                    )}
                                </View>

                                {type === 'bill' && (
                                    <View style={styles.section}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Pagar com a conta</Text>
                                        {loadingAccounts ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                            <View style={styles.accountsScroll}>
                                                {accounts.map(acc => (
                                                    <TouchableOpacity
                                                        key={acc.id}
                                                        style={[
                                                            styles.accountItem,
                                                            { backgroundColor: colors.background, borderColor: selectedAccountId === acc.id ? colors.primary : colors.border }
                                                        ]}
                                                        onPress={() => setSelectedAccountId(acc.id)}
                                                    >
                                                        <View style={[styles.accountDot, { backgroundColor: acc.color || colors.primary }]} />
                                                        <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>{acc.name}</Text>
                                                        {selectedAccountId === acc.id && (
                                                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Confirmar Pagamento</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={{ height: 60 }} />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        width: '100%',
    },
    content: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 4,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    currency: {
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        gap: 12,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
    },
    accountsScroll: {
        gap: 10,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 12,
    },
    accountDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    accountName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    submitBtn: {
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
