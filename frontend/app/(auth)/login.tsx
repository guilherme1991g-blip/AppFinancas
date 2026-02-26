import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, Dimensions, ActivityIndicator, Image
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const { login } = useAuth();
    const { colors, mode } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const logoFloat = useRef(new Animated.Value(0)).current;

    const styles = s(colors, mode);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(logoFloat, { toValue: -8, duration: 2000, useNativeDriver: true }),
                Animated.timing(logoFloat, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    async function handleLogin() {
        setError('');
        if (!email || !password) {
            setError('Preencha email e senha');
            return;
        }
        setLoading(true);
        try {
            await login(email, password);
        } catch (e: any) {
            setError(e.message || 'Email ou senha incorretos');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Background Decor */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                style={{ opacity: fadeAnim }}
            >
                {/* Logo Section */}
                <Animated.View style={[styles.logoSection, { transform: [{ translateY: logoFloat }] }]}>
                    <View style={styles.logoRing}>
                        <View style={styles.logoInner}>
                            <Image
                                source={require('../../assets/images/app-logo.png')}
                                style={styles.logoImg}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* Card Container */}
                <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
                    <Text style={styles.cardTitle}>Bem-vindo 👋</Text>
                    <Text style={styles.cardSubtitle}>Entre com seus dados para continuar</Text>

                    {/* Email Field */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
                            <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? colors.primary : colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="seu@email.com"
                                placeholderTextColor={colors.textMuted + '80'}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* Password Field */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
                            <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? colors.primary : colors.textMuted} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted + '80'}
                                secureTextEntry={!showPass}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Error Feedback */}
                    {error ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle-outline" size={16} color={colors.expense} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Main Action */}
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonLoading]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color={colors.white} />
                            : (
                                <View style={styles.buttonInner}>
                                    <Text style={styles.buttonText}>Acessar conta</Text>
                                    <View style={styles.btnIconCircle}>
                                        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                                    </View>
                                </View>
                            )
                        }
                    </TouchableOpacity>

                    {/* Secondary Actions */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>ou</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
                        <Text style={styles.registerBtnText}>Não tem conta? <Text style={{ color: colors.primary, fontWeight: '800' }}>Cadastre-se</Text></Text>
                    </TouchableOpacity>
                </Animated.View>

                <Text style={styles.footer}>Criptografia de ponta a ponta 🔒</Text>
            </Animated.ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = (colors: any, mode: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    circle1: {
        position: 'absolute', width: 300, height: 300, borderRadius: 150,
        backgroundColor: colors.primary, opacity: mode === 'dark' ? 0.04 : 0.06, top: -80, right: -80,
    },
    circle2: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: colors.primary, opacity: mode === 'dark' ? 0.05 : 0.07, top: 180, left: -60,
    },
    circle3: {
        position: 'absolute', width: 260, height: 260, borderRadius: 130,
        backgroundColor: colors.secondary, opacity: mode === 'dark' ? 0.03 : 0.05, bottom: -60, right: 40,
    },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

    logoSection: { alignItems: 'center', marginBottom: 40 },
    logoBranded: { width: 220, height: 180 },
    tagline: { fontSize: 13, color: colors.textSecondary, marginTop: 12, fontWeight: '500' },

    card: {
        backgroundColor: colors.surface,
        borderRadius: 32,
        padding: 28,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: mode === 'dark' ? 0.2 : 0.05,
        shadowRadius: 20,
        elevation: 10,
    },
    cardTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 6 },
    cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 32, fontWeight: '500' },

    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 12, color: colors.textMuted, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: colors.background,
        borderRadius: 18, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 18, height: 58,
    },
    inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.primary + '03' },
    input: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },

    button: {
        height: 60, borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    buttonLoading: { opacity: 0.8 },
    buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', width: '100%' },
    buttonText: { color: colors.white, fontWeight: '900', fontSize: 17 },
    btnIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },

    divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },

    errorBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.expense + '10',
        borderRadius: 12, padding: 14, marginBottom: 16,
        borderWidth: 1, borderColor: colors.expense + '30',
    },
    errorText: { color: colors.expense, fontSize: 13, flex: 1, fontWeight: '600' },

    registerBtn: {
        height: 58, borderRadius: 18,
        borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    registerBtnText: { color: colors.textSecondary, fontWeight: '500', fontSize: 15 },

    footer: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 40, fontWeight: '600' },
});
