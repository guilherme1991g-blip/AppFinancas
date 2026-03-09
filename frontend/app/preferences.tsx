import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch, Clipboard
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/services/api';

const CURRENCIES = [
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro', flag: '🇧🇷' },
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
    { code: 'ARS', symbol: '$', name: 'Peso Argentino', flag: '🇦🇷' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
];

const LANGUAGES = [
    { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function PreferencesScreen() {
    const insets = useSafeAreaInsets();
    const { colors, mode, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const { language, currency, setLanguage, setCurrency, t } = useLocale();
    const [showCurrencies, setShowCurrencies] = useState(false);
    const [showLanguages, setShowLanguages] = useState(false);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);

    React.useEffect(() => {
        (async () => {
            try {
                const prefs: any = await api.getPreferences();
                if (prefs?.whatsapp_enabled !== undefined) setWhatsappEnabled(prefs.whatsapp_enabled);
                if (prefs?.api_key) setApiKey(prefs.api_key);
            } catch { }
        })();
    }, []);

    async function toggleWhatsApp(value: boolean) {
        if (value) {
            // Check plan from user context
            const plan = (user as any)?.plan || 'free';
            if (plan !== 'premium') {
                Alert.alert(
                    'Recurso Premium',
                    'O WhatsApp (Agente IA) está disponível apenas no plano Premium. Entre em contato com o administrador para fazer upgrade.',
                    [{ text: 'OK' }]
                );
                return;
            }
        }
        setWhatsappEnabled(value);
        try {
            const result: any = await api.updatePreferences({ whatsapp_enabled: value });
            if (result?.api_key) setApiKey(result.api_key);
        } catch (err: any) {
            setWhatsappEnabled(!value);
            const msg = err?.response?.data?.detail || 'Erro ao alterar configuração';
            Alert.alert('Erro', msg);
        }
    }

    function copyApiKey() {
        if (apiKey) {
            Clipboard.setString(apiKey);
            Alert.alert('Copiado!', 'API key copiada para a área de transferência.');
        }
    }

    function handleReset() {
        Alert.alert(
            t('prefs.reset_title'),
            t('prefs.reset_msg'),
            [
                { text: t('prefs.cancel'), style: 'cancel' },
                {
                    text: t('prefs.reset_confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.deleteUserAccount(false); // keepProfile = true (deleteProfile = false)
                            Alert.alert('Sucesso', 'Seus dados foram limpos.');
                        } catch (e) {
                            Alert.alert(t('common.error'), 'Failed to reset data.');
                        }
                    }
                }
            ]
        );
    }

    function handleDeleteAccount() {
        Alert.alert(
            t('prefs.delete_account_title'),
            t('prefs.delete_account_msg'),
            [
                { text: t('prefs.cancel'), style: 'cancel' },
                {
                    text: t('prefs.delete_account_confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.deleteUserAccount(true); // deleteProfile = true
                            logout();
                        } catch (e) {
                            Alert.alert(t('common.error'), 'Failed to delete account.');
                        }
                    }
                }
            ]
        );
    }

    const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    const selectedLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
    const styles = s(colors);

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('prefs.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>

                {/* ─── Modo Escuro ─── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t('settings.dark_mode')}</Text>
                    <Text style={styles.sectionSub}>{t('settings.dark_mode_sub')}</Text>

                    <View style={styles.selectorCard}>
                        <View style={[styles.whatsappIcon, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="moon-outline" size={22} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.selectorTitle}>{t('settings.dark_mode')}</Text>
                            <Text style={styles.selectorCode}>{mode === 'dark' ? 'Ativado' : 'Desativado'}</Text>
                        </View>
                        <Switch
                            value={mode === 'dark'}
                            onValueChange={toggleTheme}
                            trackColor={{ false: colors.border, true: colors.primary + '80' }}
                            thumbColor={mode === 'dark' ? colors.primary : colors.textSecondary}
                        />
                    </View>
                </View>

                {/* ─── Moeda ─── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t('prefs.currency')}</Text>
                    <Text style={styles.sectionSub}>{t('prefs.currency_sub')}</Text>

                    <TouchableOpacity style={styles.selectorCard} onPress={() => setShowCurrencies(!showCurrencies)} activeOpacity={0.7}>
                        <Text style={styles.selectorFlag}>{selectedCurrency.flag}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.selectorTitle}>{selectedCurrency.name}</Text>
                            <Text style={styles.selectorCode}>{selectedCurrency.code} ({selectedCurrency.symbol})</Text>
                        </View>
                        <Ionicons name={showCurrencies ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                    </TouchableOpacity>

                    {showCurrencies && (
                        <View style={styles.optionsList}>
                            {CURRENCIES.map((cur) => {
                                const isSelected = cur.code === currency;
                                return (
                                    <TouchableOpacity
                                        key={cur.code}
                                        style={[styles.optionRow, isSelected && { backgroundColor: colors.primary + '10' }]}
                                        onPress={() => { setCurrency(cur.code as any); setShowCurrencies(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.optionFlag}>{cur.flag}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.optionName, isSelected && { color: colors.primary, fontWeight: '800' }]}>{cur.name}</Text>
                                            <Text style={styles.optionCode}>{cur.code} ({cur.symbol})</Text>
                                        </View>
                                        {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* ─── Idioma ─── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t('prefs.language')}</Text>
                    <Text style={styles.sectionSub}>{t('prefs.language_sub')}</Text>

                    <TouchableOpacity style={styles.selectorCard} onPress={() => setShowLanguages(!showLanguages)} activeOpacity={0.7}>
                        <Text style={styles.selectorFlag}>{selectedLanguage.flag}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.selectorTitle}>{selectedLanguage.name}</Text>
                            <Text style={styles.selectorCode}>{selectedLanguage.code}</Text>
                        </View>
                        <Ionicons name={showLanguages ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                    </TouchableOpacity>

                    {showLanguages && (
                        <View style={styles.optionsList}>
                            {LANGUAGES.map((lang) => {
                                const isSelected = lang.code === language;
                                return (
                                    <TouchableOpacity
                                        key={lang.code}
                                        style={[styles.optionRow, isSelected && { backgroundColor: colors.primary + '10' }]}
                                        onPress={() => { setLanguage(lang.code as any); setShowLanguages(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.optionFlag}>{lang.flag}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.optionName, isSelected && { color: colors.primary, fontWeight: '800' }]}>{lang.name}</Text>
                                        </View>
                                        {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* ─── WhatsApp ─── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t('prefs.whatsapp')}</Text>
                    <Text style={styles.sectionSub}>{t('prefs.whatsapp_sub')}</Text>

                    <View style={styles.selectorCard}>
                        <View style={[styles.whatsappIcon, { backgroundColor: '#25D36615' }]}>
                            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.selectorTitle}>WhatsApp</Text>
                            <Text style={styles.selectorCode}>{whatsappEnabled ? 'Ativado' : 'Desativado'}</Text>
                        </View>
                        <Switch
                            value={whatsappEnabled}
                            onValueChange={toggleWhatsApp}
                            trackColor={{ false: colors.border, true: '#25D366' + '80' }}
                            thumbColor={whatsappEnabled ? '#25D366' : colors.textSecondary}
                        />
                    </View>
                </View>

                {/* ─── Zona de Perigo ─── */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.danger }]}>{t('prefs.danger_zone')}</Text>
                    <Text style={styles.sectionSub}>{t('prefs.danger_sub')}</Text>

                    <TouchableOpacity style={[styles.dangerCard, { marginBottom: 12 }]} onPress={handleReset} activeOpacity={0.7}>
                        <View style={styles.dangerIconWrap}>
                            <Ionicons name="refresh-outline" size={28} color={colors.danger} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dangerTitle}>{t('prefs.reset')}</Text>
                            <Text style={styles.dangerSub}>{t('prefs.reset_sub')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.danger} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dangerCard} onPress={handleDeleteAccount} activeOpacity={0.7}>
                        <View style={styles.dangerIconWrap}>
                            <Ionicons name="trash-outline" size={28} color={colors.danger} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dangerTitle}>{t('prefs.delete_account')}</Text>
                            <Text style={styles.dangerSub}>{t('prefs.delete_account_sub')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.danger} />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

    section: { paddingHorizontal: 20, marginTop: 28 },
    sectionLabel: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
    sectionSub: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 16 },

    selectorCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: colors.surface, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    },
    selectorFlag: { fontSize: 28 },
    selectorTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    selectorCode: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },

    optionsList: {
        marginTop: 10, backgroundColor: colors.surface, borderRadius: 20,
        overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
    },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    optionFlag: { fontSize: 22 },
    optionName: { fontSize: 14, fontWeight: '600', color: colors.text },
    optionCode: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 1 },

    whatsappIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    dangerCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: colors.danger + '08', borderRadius: 20, padding: 18,
        borderWidth: 1.5, borderColor: colors.danger + '25',
    },
    dangerIconWrap: {
        width: 52, height: 52, borderRadius: 16, backgroundColor: colors.danger + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    dangerTitle: { fontSize: 16, fontWeight: '800', color: colors.danger },
    dangerSub: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 4, lineHeight: 16 },
});
