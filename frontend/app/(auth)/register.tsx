import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start();
    }, []);

    async function handleRegister() {
        setError('');
        if (!name || !email || !password) {
            setError('Preencha todos os campos');
            return;
        }
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            await register(name, email, password);
        } catch (e: any) {
            setError(e.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    }

    const fields = [
        { key: 'name', label: 'Nome completo', icon: 'person-outline', placeholder: 'Seu nome', value: name, setter: setName, keyboard: 'default', secure: false },
        { key: 'email', label: 'Email', icon: 'mail-outline', placeholder: 'seu@email.com', value: email, setter: setEmail, keyboard: 'email-address', secure: false },
        { key: 'password', label: 'Senha', icon: 'lock-closed-outline', placeholder: '••••••••', value: password, setter: setPassword, keyboard: 'default', secure: true },
    ];

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Voltar */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                        <Text style={styles.backText}>Voltar</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoRing}>
                            <View style={styles.logoInner}>
                                <Ionicons name="sparkles" size={32} color="#00D09C" />
                            </View>
                        </View>
                        <Text style={styles.title}>Criar sua conta</Text>
                        <Text style={styles.subtitle}>Comece a controlar suas finanças hoje</Text>
                    </View>

                    {/* Card */}
                    <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
                        {fields.map((f) => (
                            <View key={f.key} style={styles.fieldGroup}>
                                <Text style={styles.label}>{f.label}</Text>
                                <View style={[styles.inputWrap, focusedField === f.key && styles.inputWrapFocused]}>
                                    <Ionicons name={f.icon as any} size={18} color={focusedField === f.key ? '#00D09C' : '#6B7280'} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        value={f.value}
                                        onChangeText={f.setter}
                                        placeholder={f.placeholder}
                                        placeholderTextColor="#4B5563"
                                        keyboardType={f.keyboard as any}
                                        autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                                        secureTextEntry={f.secure && !showPass}
                                        onFocus={() => setFocusedField(f.key)}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    {f.secure && (
                                        <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}

                        {/* Benefícios */}
                        <View style={styles.benefits}>
                            {['Controle de receitas e despesas', 'Relatórios e gráficos', 'Modo empresarial e DRE'].map(b => (
                                <View key={b} style={styles.benefitRow}>
                                    <Ionicons name="checkmark-circle" size={16} color="#00D09C" />
                                    <Text style={styles.benefitText}>{b}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Erro inline */}
                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Botão */}
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonLoading]}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#000" />
                                : (
                                    <View style={styles.buttonInner}>
                                        <Text style={styles.buttonText}>Criar conta grátis</Text>
                                        <Ionicons name="arrow-forward" size={18} color="#000" />
                                    </View>
                                )
                            }
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginRow} onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.loginText}>Já tem conta? </Text>
                            <Text style={styles.loginLink}>Entrar</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.footer}>Grátis para sempre. Sem cartão de crédito. 🎉</Text>
                </ScrollView>
            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0F1E' },
    circle1: {
        position: 'absolute', width: 280, height: 280, borderRadius: 140,
        backgroundColor: '#6C5ECF', opacity: 0.07, top: -60, left: -80,
    },
    circle2: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: '#00D09C', opacity: 0.06, bottom: 40, right: -60,
    },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
    backText: { color: '#9CA3AF', fontSize: 14 },

    header: { alignItems: 'center', marginBottom: 32 },
    logoRing: {
        width: 88, height: 88, borderRadius: 44,
        borderWidth: 1, borderColor: 'rgba(108,94,207,0.3)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    logoInner: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: 'rgba(108,94,207,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
    subtitle: { fontSize: 13, color: '#6B7280', marginTop: 6 },

    card: {
        backgroundColor: '#111827',
        borderRadius: 24, padding: 28,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    },
    fieldGroup: { marginBottom: 16 },
    label: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#1F2937', borderRadius: 14,
        borderWidth: 1, borderColor: '#374151',
        paddingHorizontal: 16, height: 54,
    },
    inputWrapFocused: { borderColor: '#6C5ECF', backgroundColor: 'rgba(108,94,207,0.05)' },
    input: { color: '#FFFFFF', fontSize: 15 },

    benefits: { gap: 8, marginBottom: 24, padding: 16, backgroundColor: 'rgba(0,208,156,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,208,156,0.1)' },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    benefitText: { fontSize: 13, color: '#9CA3AF' },

    button: {
        height: 54, borderRadius: 14,
        backgroundColor: '#00D09C',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    buttonLoading: { opacity: 0.7 },
    buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    buttonText: { color: '#000000', fontWeight: '800', fontSize: 16 },

    errorBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,107,107,0.1)',
        borderRadius: 10, padding: 12, marginBottom: 12,
        borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
    },
    errorText: { color: '#FF6B6B', fontSize: 13, flex: 1 },
    loginRow: { flexDirection: 'row', justifyContent: 'center' },
    loginText: { color: '#6B7280', fontSize: 14 },
    loginLink: { color: '#00D09C', fontSize: 14, fontWeight: '600' },

    footer: { textAlign: 'center', color: '#374151', fontSize: 12, marginTop: 28 },
});
