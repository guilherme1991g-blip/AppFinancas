import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
        if (!name || !email || !password) {
            Alert.alert('Atenção', 'Preencha todos os campos');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Atenção', 'Senha deve ter pelo menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            await register(name, email, password);
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.logoContainer}>
                        <Ionicons name="wallet" size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.appName}>Finanças</Text>
                    <Text style={styles.subtitle}>Crie sua conta gratuitamente</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.title}>Criar Conta</Text>

                    {[
                        { label: 'Nome completo', icon: 'person-outline', value: name, setter: setName, placeholder: 'Seu nome', keyboard: 'default' as const },
                        { label: 'Email', icon: 'mail-outline', value: email, setter: setEmail, placeholder: 'seu@email.com', keyboard: 'email-address' as const },
                    ].map((field) => (
                        <View key={field.label} style={styles.inputGroup}>
                            <Text style={styles.label}>{field.label}</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name={field.icon as any} size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={field.value}
                                    onChangeText={field.setter}
                                    placeholder={field.placeholder}
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType={field.keyboard}
                                    autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
                                />
                            </View>
                        </View>
                    ))}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={password} onChangeText={setPassword}
                                placeholder="Mínimo 6 caracteres"
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
                        onPress={handleRegister} disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Criando conta...' : 'Criar conta'}</Text>
                    </TouchableOpacity>

                    <View style={styles.loginRow}>
                        <Text style={styles.loginText}>Já tem conta? </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.loginLink}>Fazer login</Text>
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
    header: { alignItems: 'center', marginBottom: Spacing.xl },
    backBtn: { position: 'absolute', left: 0, top: 0, padding: Spacing.sm },
    logoContainer: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: 'rgba(0,208,156,0.15)',
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    },
    appName: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
    form: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    },
    title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
    inputGroup: { marginBottom: Spacing.md },
    label: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surfaceLight, borderRadius: Radius.md,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: Spacing.md, height: 52,
    },
    inputIcon: { marginRight: Spacing.sm },
    input: { flex: 1, color: Colors.text, fontSize: 15 },
    button: {
        backgroundColor: Colors.primary, height: 52, borderRadius: Radius.md,
        alignItems: 'center', justifyContent: 'center',
        marginTop: Spacing.sm, marginBottom: Spacing.md,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#000', fontWeight: '700', fontSize: 16 },
    loginRow: { flexDirection: 'row', justifyContent: 'center' },
    loginText: { color: Colors.textSecondary, fontSize: 14 },
    loginLink: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
