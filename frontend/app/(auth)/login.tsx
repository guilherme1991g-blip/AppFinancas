import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, Dimensions, ActivityIndicator, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const logoFloat = useRef(new Animated.Value(0)).current;

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
        if (!email || !password) {
            Alert.alert('Atenção', 'Preencha email e senha');
            return;
        }
        setLoading(true);
        try {
            await login(email, password);
        } catch (e: any) {
            Alert.alert('Erro ao entrar', e.message || 'Email ou senha incorretos');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Background circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                style={{ opacity: fadeAnim }}
            >
                {/* Logo */}
                <Animated.View style={[styles.logoSection, { transform: [{ translateY: logoFloat }] }]}>
                    <View style={styles.logoRing}>
                        <View style={styles.logoInner}>
                            <Ionicons name="trending-up" size={36} color="#00D09C" />
                        </View>
                    </View>
                    <Text style={styles.appName}>Meu Dindin</Text>
                    <Text style={styles.tagline}>Controle financeiro inteligente</Text>
                </Animated.View>

                {/* Card */}
                <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
                    <Text style={styles.cardTitle}>Bem-vindo de volta 👋</Text>
                    <Text style={styles.cardSubtitle}>Entre na sua conta para continuar</Text>

                    {/* Email */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
                            <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? '#00D09C' : '#6B7280'} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="seu@email.com"
                                placeholderTextColor="#4B5563"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* Senha */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
                            <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? '#00D09C' : '#6B7280'} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor="#4B5563"
                                secureTextEntry={!showPass}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Botão */}
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonLoading]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : (
                                <View style={styles.buttonInner}>
                                    <Text style={styles.buttonText}>Entrar</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#000" />
                                </View>
                            )
                        }
                    </TouchableOpacity>

                    {/* Divisor */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>ou</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Criar conta */}
                    <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
                        <Text style={styles.registerBtnText}>Criar nova conta</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Text style={styles.footer}>Seus dados protegidos com criptografia 🔒</Text>
            </Animated.ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0F1E' },
    circle1: {
        position: 'absolute', width: 300, height: 300, borderRadius: 150,
        backgroundColor: '#00D09C', opacity: 0.06, top: -80, right: -80,
    },
    circle2: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: '#6C5ECF', opacity: 0.08, top: 200, left: -60,
    },
    circle3: {
        position: 'absolute', width: 250, height: 250, borderRadius: 125,
        backgroundColor: '#00D09C', opacity: 0.05, bottom: -60, right: 40,
    },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

    // Logo
    logoSection: { alignItems: 'center', marginBottom: 36 },
    logoRing: {
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 1, borderColor: 'rgba(0,208,156,0.3)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    logoInner: {
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: 'rgba(0,208,156,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    appName: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    tagline: { fontSize: 13, color: '#6B7280', marginTop: 6 },

    // Card
    card: {
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    cardTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
    cardSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 28 },

    // Fields
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#1F2937',
        borderRadius: 14, borderWidth: 1, borderColor: '#374151',
        paddingHorizontal: 16, height: 54,
    },
    inputWrapFocused: { borderColor: '#00D09C', backgroundColor: 'rgba(0,208,156,0.05)' },
    input: { flex: 1, color: '#FFFFFF', fontSize: 15 },

    // Button
    button: {
        height: 54, borderRadius: 14,
        backgroundColor: '#00D09C',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 8,
    },
    buttonLoading: { opacity: 0.7 },
    buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    buttonText: { color: '#000000', fontWeight: '800', fontSize: 16 },

    // Divider
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#1F2937' },
    dividerText: { fontSize: 13, color: '#4B5563' },

    // Register
    registerBtn: {
        height: 54, borderRadius: 14,
        borderWidth: 1, borderColor: '#374151',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    registerBtnText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15 },

    footer: { textAlign: 'center', color: '#374151', fontSize: 12, marginTop: 32 },
});
