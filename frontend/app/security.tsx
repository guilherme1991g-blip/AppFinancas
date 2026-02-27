import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import * as LocalAuthentication from 'expo-local-authentication';

export default function SecurityScreen() {
    const { colors } = useTheme();
    const { t } = useLocale();
    const insets = useSafeAreaInsets();

    // Security preferences
    const [biometric, setBiometric] = useState(false);
    const [multiDevice, setMultiDevice] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Change password
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [changingPw, setChangingPw] = useState(false);
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const prefs: any = await api.getPreferences();
                if (prefs?.security) {
                    setBiometric(prefs.security.biometric_enabled ?? false);
                    setMultiDevice(prefs.security.multi_device ?? true);
                }
            } catch { }
            finally { setLoading(false); }
        })();
    }, []);

    async function toggleSecurity(key: 'biometric_enabled' | 'multi_device', value: boolean) {
        if (key === 'biometric_enabled' && value) {
            // Check biometric support and authenticate before enabling
            const hasAuth = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasAuth || !isEnrolled) {
                Alert.alert(
                    t('common.attention'),
                    'Seu dispositivo não suporta biometria ou não possui nenhuma cadastrada.'
                );
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirme sua identidade para ativar o login por biometria',
                fallbackLabel: 'Usar senha',
            });

            if (!result.success) {
                return;
            }
        }

        const prev = key === 'biometric_enabled' ? biometric : multiDevice;
        if (key === 'biometric_enabled') setBiometric(value);
        else setMultiDevice(value);

        setSaving(true);
        try {
            const security = {
                biometric_enabled: key === 'biometric_enabled' ? value : biometric,
                multi_device: key === 'multi_device' ? value : multiDevice,
            };
            await api.updatePreferences({ security });
        } catch {
            // Revert
            if (key === 'biometric_enabled') setBiometric(prev);
            else setMultiDevice(prev);
            Alert.alert('Erro', t('security.save_error'));
        } finally { setSaving(false); }
    }

    async function handleChangePassword() {
        if (!currentPw.trim()) {
            Alert.alert(t('security.error'), t('security.current_required'));
            return;
        }
        if (newPw.length < 6) {
            Alert.alert(t('security.error'), t('security.min_length'));
            return;
        }
        if (newPw !== confirmPw) {
            Alert.alert(t('security.error'), t('security.mismatch'));
            return;
        }

        setChangingPw(true);
        try {
            await api.changePassword(currentPw, newPw);
            Alert.alert('✅', t('security.password_changed'));
            setShowPasswordForm(false);
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (e: any) {
            Alert.alert(t('security.error'), e.message || t('security.change_error'));
        } finally { setChangingPw(false); }
    }

    const styles = s(colors);

    if (loading) return (
        <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={colors.primary} size="large" />
        </View>
    );

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('security.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                    {/* Change Password */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t('security.password')}</Text>
                        <Text style={styles.sectionSub}>{t('security.password_sub')}</Text>

                        {!showPasswordForm ? (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => setShowPasswordForm(true)}
                            >
                                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="key-outline" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.actionLabel}>{t('security.change_password')}</Text>
                                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.formCard}>
                                <View style={styles.inputRow}>
                                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('security.current_password')}
                                        placeholderTextColor={colors.textMuted}
                                        secureTextEntry={!showCurrentPw}
                                        value={currentPw}
                                        onChangeText={setCurrentPw}
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                                        <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputRow}>
                                    <Ionicons name="key-outline" size={18} color={colors.textMuted} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('security.new_password')}
                                        placeholderTextColor={colors.textMuted}
                                        secureTextEntry={!showNewPw}
                                        value={newPw}
                                        onChangeText={setNewPw}
                                    />
                                    <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                                        <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputRow}>
                                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.textMuted} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('security.confirm_password')}
                                        placeholderTextColor={colors.textMuted}
                                        secureTextEntry={!showNewPw}
                                        value={confirmPw}
                                        onChangeText={setConfirmPw}
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                                    <TouchableOpacity
                                        style={[styles.formBtn, { backgroundColor: colors.border }]}
                                        onPress={() => { setShowPasswordForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                                    >
                                        <Text style={[styles.formBtnTxt, { color: colors.text }]}>{t('security.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.formBtn, { backgroundColor: colors.primary, flex: 2 }]}
                                        onPress={handleChangePassword}
                                        disabled={changingPw}
                                    >
                                        {changingPw ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={[styles.formBtnTxt, { color: '#FFF' }]}>{t('security.save')}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Biometric */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t('security.authentication')}</Text>
                        <Text style={styles.sectionSub}>{t('security.authentication_sub')}</Text>

                        <View style={styles.settingsGroup}>
                            <View style={styles.settingRow}>
                                <View style={[styles.iconWrap, { backgroundColor: '#10B98115' }]}>
                                    <Ionicons name="finger-print-outline" size={20} color="#10B981" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.settingLabel}>{t('security.biometric')}</Text>
                                    <Text style={styles.settingSub}>{t('security.biometric_sub')}</Text>
                                </View>
                                <Switch
                                    value={biometric}
                                    onValueChange={(v) => toggleSecurity('biometric_enabled', v)}
                                    trackColor={{ false: colors.border, true: '#10B981' + '80' }}
                                    thumbColor={biometric ? '#10B981' : colors.textSecondary}
                                    disabled={saving}
                                />
                            </View>

                            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                                <View style={[styles.iconWrap, { backgroundColor: '#6366F115' }]}>
                                    <Ionicons name="phone-portrait-outline" size={20} color="#6366F1" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.settingLabel}>{t('security.multi_device')}</Text>
                                    <Text style={styles.settingSub}>{t('security.multi_device_sub')}</Text>
                                </View>
                                <Switch
                                    value={multiDevice}
                                    onValueChange={(v) => toggleSecurity('multi_device', v)}
                                    trackColor={{ false: colors.border, true: '#6366F1' + '80' }}
                                    thumbColor={multiDevice ? '#6366F1' : colors.textSecondary}
                                    disabled={saving}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.textMuted} />
                        <Text style={styles.infoTxt}>{t('security.info')}</Text>
                    </View>

                    {saving && (
                        <View style={styles.savingBadge}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.savingTxt}>{t('security.saving')}</Text>
                        </View>
                    )}

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

    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
    sectionSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18, fontWeight: '500' },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: colors.surface, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: colors.border,
    },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },

    formCard: {
        backgroundColor: colors.surface, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: colors.border, gap: 12,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.background, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        borderWidth: 1, borderColor: colors.border,
    },
    input: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },
    formBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    formBtnTxt: { fontSize: 15, fontWeight: '800' },

    settingsGroup: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },
    settingLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    settingSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '500', lineHeight: 15 },

    infoBox: {
        flexDirection: 'row', gap: 12, padding: 20,
        backgroundColor: colors.surface, borderRadius: 20,
        borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    },
    infoTxt: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 18, fontWeight: '500' },

    savingBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
    savingTxt: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
