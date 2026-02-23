import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert('Atenção', 'Preencha email e senha');
            return;
        }
        setLoading(true);
        try {
            await login(email, password);
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="wallet" size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.appName}>Finanças</Text>
                    <Text style={styles.subtitle}>Controle financeiro inteligente</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.title}>Entrar</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="seu@email.com"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.textMuted}
                                secureTextEntry={!showPass}
                            />
                            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
                    </TouchableOpacity>

                    <View style={styles.registerRow}>
                        <Text style={styles.registerText}>Não tem conta? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={styles.registerLink}>Criar conta</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
    header: { alignItems: 'center', marginBottom: Spacing.xxl },
    logoContainer: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: 'rgba(0,208,156,0.15)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    appName: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
    form: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
    inputGroup: { marginBottom: Spacing.md },
    label: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: Radius.md,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
        height: 52,
    },
    inputIcon: { marginRight: Spacing.sm },
    input: { flex: 1, color: Colors.text, fontSize: 15 },
    button: {
        backgroundColor: Colors.primary,
        height: 52, borderRadius: Radius.md,
        alignItems: 'center', justifyContent: 'center',
        marginTop: Spacing.sm, marginBottom: Spacing.md,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#000', fontWeight: '700', fontSize: 16 },
    registerRow: { flexDirection: 'row', justifyContent: 'center' },
    registerText: { color: Colors.textSecondary, fontSize: 14 },
    registerLink: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
