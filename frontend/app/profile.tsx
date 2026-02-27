import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
    const { colors } = useTheme();
    const { t } = useLocale();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const me: any = await api.getMe();
                setName(me.name || '');
                setEmail(me.email || '');
                setPhone(me.phone || '');
                setCpf(me.cpf || '');
            } catch { }
            finally { setLoading(false); }
        })();
    }, []);

    function formatCPF(value: string) {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }

    function formatPhone(value: string) {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 2) return `(${digits}`;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    async function handleSave() {
        if (!name.trim()) {
            Alert.alert(t('profile.error'), t('profile.name_required'));
            return;
        }
        if (!email.trim()) {
            Alert.alert(t('profile.error'), t('profile.email_required'));
            return;
        }

        setSaving(true);
        try {
            await api.updateProfile({ name: name.trim(), email: email.trim(), phone, cpf });
            Alert.alert('✅', t('profile.saved'));
        } catch (e: any) {
            Alert.alert(t('profile.error'), e.message || t('profile.save_error'));
        } finally { setSaving(false); }
    }

    const styles = s(colors);

    if (loading) return (
        <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
            <ActivityIndicator color={colors.primary} size="large" />
        </View>
    );

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarTxt}>{name?.[0]?.toUpperCase() || '?'}</Text>
                        </View>
                        <Text style={styles.avatarName}>{name || t('profile.title')}</Text>
                        <Text style={styles.avatarEmail}>{email}</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formCard}>
                        <Text style={styles.formLabel}>{t('profile.full_name')}</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder={t('profile.full_name')}
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <Text style={styles.formLabel}>{t('profile.email')}</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="email@exemplo.com"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <Text style={styles.formLabel}>{t('profile.phone')}</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={(v) => setPhone(formatPhone(v))}
                                placeholder="(11) 99999-9999"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <Text style={styles.formLabel}>{t('profile.cpf')}</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                value={cpf}
                                onChangeText={(v) => setCpf(formatCPF(v))}
                                placeholder="000.000.000-00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="number-pad"
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                <Text style={styles.saveBtnTxt}>{t('profile.save')}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                        <Text style={styles.infoTxt}>{t('profile.info')}</Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    content: { padding: 20, paddingBottom: 60 },

    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarTxt: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    avatarName: { fontSize: 20, fontWeight: '800', color: colors.text },
    avatarEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },

    formCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
    formLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.background, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        borderWidth: 1, borderColor: colors.border,
    },
    input: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },

    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16,
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    saveBtnTxt: { fontSize: 16, fontWeight: '800', color: '#FFF' },

    infoBox: {
        flexDirection: 'row', gap: 12, marginTop: 24, padding: 20,
        backgroundColor: colors.surface, borderRadius: 20,
        borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    },
    infoTxt: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 18, fontWeight: '500' },
});
