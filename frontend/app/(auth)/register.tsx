import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, ActivityIndicator, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
    const { register } = useAuth();
    const { colors, mode } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    const styles = s(colors, mode);

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
            {/* Background Decor */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Navigation */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <View style={styles.backCircle}>
                            <Ionicons name="arrow-back" size={18} color={colors.text} />
                        </View>
                        <Text style={styles.backText}>Voltar</Text>
                    </TouchableOpacity>

                    {/* Header Section */}
                    <View style={styles.header}>
                        <View style={styles.logoRing}>
                            <View style={styles.logoInner}>
                                <Ionicons name="sparkles" size={36} color={colors.primary} />
                            </View>
                        </View>
                        <Text style={styles.title}>Junte-se a nós</Text>
                        <Text style={styles.subtitle}>Crie sua conta e revolucione seu financeiro</Text>
                    </View>

                    {/* Registration Card */}
                    <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
                        {fields.map((f) => (
                            <View key={f.key} style={styles.fieldGroup}>
                                <Text style={styles.label}>{f.label}</Text>
                                <View style={[styles.inputWrap, focusedField === f.key && styles.inputWrapFocused]}>
                                    <Ionicons name={f.icon as any} size={20} color={focusedField === f.key ? colors.primary : colors.textMuted} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        value={f.value}
                                        onChangeText={f.setter}
                                        placeholder={f.placeholder}
                                        placeholderTextColor={colors.textMuted + '80'}
                                        keyboardType={f.keyboard as any}
                                        autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                                        secureTextEntry={f.secure && !showPass}
                                        onFocus={() => setFocusedField(f.key)}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    {f.secure && (
                                        <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}

                        {/* Exclusive Benefits Box */}
                        <View style={styles.benefits}>
                            {['Radar de gastos mensal', 'Inteligência em relatórios', 'Multi-plataforma'].map(b => (
                                <View key={b} style={styles.benefitRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                                    <Text style={styles.benefitText}>{b}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Error Handling */}
                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle-outline" size={16} color={colors.expense} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonLoading]}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color={colors.white} />
                                : (
                                    <View style={styles.buttonInner}>
                                        <Text style={styles.buttonText}>Começar jornada</Text>
                                        <View style={styles.btnIconCircle}>
                                            <Ionicons name="sparkles" size={16} color={colors.primary} />
                                        </View>
                                    </View>
                                )
                            }
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginRow} onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.loginText}>Já é um membro? </Text>
                            <Text style={styles.loginLink}>Acessar conta</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.footer}>Sua conta é gratuita, segura e definitiva. 🚀</Text>
                </ScrollView>
            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const s = (colors: any, mode: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    circle1: {
        position: 'absolute', width: 280, height: 280, borderRadius: 140,
        backgroundColor: colors.primary, opacity: mode === 'dark' ? 0.04 : 0.06, top: -60, left: -80,
    },
    circle2: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: colors.secondary, opacity: mode === 'dark' ? 0.03 : 0.05, bottom: 40, right: -60,
    },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
    backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    backText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },

    header: { alignItems: 'center', marginBottom: 32 },
    logoRing: {
        width: 90, height: 90, borderRadius: 45,
        borderWidth: 2, borderColor: colors.primary + '30',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    logoInner: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: colors.primary + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -1 },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 8, fontWeight: '500', textAlign: 'center' },

    card: {
        backgroundColor: colors.surface,
        borderRadius: 32, padding: 28,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: mode === 'dark' ? 0.15 : 0.05, shadowRadius: 20, elevation: 10,
    },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 12, color: colors.textMuted, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: colors.background, borderRadius: 18,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 18, height: 58,
    },
    inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.primary + '03' },
    input: { color: colors.text, fontSize: 16, fontWeight: '600' },

    benefits: { gap: 10, marginBottom: 24, padding: 18, backgroundColor: colors.primary + '08', borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '15' },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    benefitText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

    button: {
        height: 60, borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    },
    buttonLoading: { opacity: 0.8 },
    buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    buttonText: { color: colors.white, fontWeight: '900', fontSize: 17 },
    btnIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },

    errorBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.expense + '10',
        borderRadius: 12, padding: 14, marginBottom: 16,
        borderWidth: 1, borderColor: colors.expense + '30',
    },
    errorText: { color: colors.expense, fontSize: 13, flex: 1, fontWeight: '600' },

    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
    loginText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
    loginLink: { color: colors.primary, fontSize: 14, fontWeight: '800' },

    footer: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 40, fontWeight: '600' },
});
