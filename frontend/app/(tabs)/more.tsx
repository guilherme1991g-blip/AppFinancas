import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Alert, Switch
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const { mode, colors, toggleTheme } = useTheme();
    const now = new Date();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'recurring' | 'companies'>('recurring');

    async function fetchData() {
        try {
            const [r, c, cats] = await Promise.all([
                api.getRecurring() as Promise<any[]>,
                api.getCompanies() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
            ]);
            setRecurring(r); setCompanies(c); setCategories(cats);
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    function getCat(id: string) { return categories.find(c => c.id === id); }

    const tabs = [
        { key: 'recurring', label: 'Recorrentes', icon: 'repeat' },
        { key: 'companies', label: 'Empresas', icon: 'business' },
    ] as const;

    const styles = s(colors);

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                    <View>
                        <Text style={styles.title}>Ajustes</Text>
                        <Text style={styles.sub}>Gerenciamento da sua conta</Text>
                    </View>
                    <TouchableOpacity style={styles.headerBtn} onPress={logout}>
                        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
                    </TouchableOpacity>
                </View>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.profileCard}>
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileAvatarTxt}>{user?.name?.[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.profileName}>{user?.name}</Text>
                            <Text style={styles.profileEmail}>{user?.email}</Text>
                        </View>
                        <View style={styles.profileBadge}>
                            <Text style={styles.profileBadgeTxt}>Premium</Text>
                        </View>
                    </View>
                </View>

                {/* Settings Rows */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Ajustes</Text>
                    <View style={styles.settingsGroup}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingIconWrap}>
                                <Ionicons name="moon-outline" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Modo Escuro</Text>
                                <Text style={styles.settingSub}>Alterne o visual do aplicativo</Text>
                            </View>
                            <Switch
                                value={mode === 'dark'}
                                onValueChange={toggleTheme}
                                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                thumbColor={mode === 'dark' ? colors.primary : colors.textSecondary}
                            />
                        </View>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/notification-settings' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.secondary + '15' }]}>
                                <Ionicons name="notifications-outline" size={20} color={colors.secondary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Notificações</Text>
                                <Text style={styles.settingSub}>Alertas de vencimento e gastos</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/category')}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#6366F115' }]}>
                                <Ionicons name="pricetags-outline" size={20} color="#6366F1" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Categorias</Text>
                                <Text style={styles.settingSub}>Gerenciar categorias de gastos</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/(tabs)/accounts' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.income + '15' }]}>
                                <Ionicons name="wallet-outline" size={20} color={colors.income} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Contas</Text>
                                <Text style={styles.settingSub}>Gerenciar suas contas bancárias</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/(tabs)/cards' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.warning + '15' }]}>
                                <Ionicons name="card-outline" size={20} color={colors.warning} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Cartões</Text>
                                <Text style={styles.settingSub}>Gerenciar cartões de crédito e faturas</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Foot Info */}
                <View style={styles.infoSection}>
                    <View style={styles.listCard}>
                        <View style={styles.listItem}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.infoLabel}>Segurança</Text>
                            <Text style={styles.infoVal}>Criptografado</Text>
                        </View>
                        <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                            <Ionicons name="server-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.infoLabel}>Versão do Sistema</Text>
                            <Text style={styles.infoVal}>1.3.0</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                            Alert.alert(
                                'Limpar todos os dados?',
                                'Esta ação apagará permanentemente todas as suas contas, transações, metas e empresas. Seu perfil de usuário será mantido para que você possa recomeçar.',
                                [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                        text: 'Sim, Limpar Tudo',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                await api.deleteUserAccount();
                                                logout();
                                            } catch (e) {
                                                Alert.alert('Erro', 'Não foi possível limpar seus dados. Tente novamente.');
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        <Text style={styles.deleteBtnTxt}>Limpar dados e começar do zero</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24 },
    title: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

    profileSection: { paddingHorizontal: 20, marginBottom: 24 },
    profileCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
    profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    profileAvatarTxt: { color: colors.white, fontWeight: '800', fontSize: 20 },
    profileName: { fontSize: 17, fontWeight: '800', color: colors.text },
    profileEmail: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
    profileBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '20' },
    profileBadgeTxt: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

    section: { paddingHorizontal: 20, marginBottom: 32 },
    sectionHeading: { fontSize: 13, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },

    settingsGroup: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },
    settingIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
    settingLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    settingSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },

    quickGrid: { flexDirection: 'row', gap: 12 },
    quickCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 24, padding: 16, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border },
    quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { fontSize: 12, color: colors.text, fontWeight: '700' },

    tabsSection: { marginBottom: 24 },
    tabsRow: {},
    tab: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.surface, marginRight: 12, borderWidth: 1, borderColor: colors.border },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    tabTxt: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
    tabTxtActive: { color: colors.white },

    tabContentArea: { paddingHorizontal: 20 },
    tabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    tabTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    miniAddBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },

    listCard: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },

    emptyState: { padding: 40, alignItems: 'center', gap: 16 },
    emptyTxt: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

    budgetCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    budgetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    budgetName: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '800' },
    budgetPct: { fontSize: 15, fontWeight: '900' },
    progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    progressBar: { height: '100%', borderRadius: 4 },
    budgetFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetVal: { fontSize: 14, color: colors.text, fontWeight: '700' },
    overTxt: { fontSize: 11, color: colors.danger, fontWeight: '800', textTransform: 'uppercase' },

    recIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 15, color: colors.text, fontWeight: '700' },
    itemSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    itemVal: { fontSize: 16, fontWeight: '800' },

    infoSection: { paddingHorizontal: 20, marginTop: 8 },
    infoLabel: { flex: 1, fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    infoVal: { fontSize: 14, color: colors.text, fontWeight: '700' },

    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 32, padding: 20, backgroundColor: colors.danger + '10', borderRadius: 24, borderWidth: 1, borderColor: colors.danger + '20' },
    deleteBtnTxt: { fontSize: 15, fontWeight: '800', color: colors.danger }
});
