import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Alert, TextInput, Modal, ActivityIndicator, Switch
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';

const ICONS = ['cart', 'car', 'restaurant', 'home', 'medkit', 'school', 'airplane', 'game-controller',
    'shirt', 'gift', 'trending-up', 'briefcase', 'phone-portrait', 'musical-notes', 'paw', 'fitness'];

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const { mode, colors, toggleTheme } = useTheme();
    const now = new Date();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'budgets' | 'recurring' | 'categories' | 'companies'>('categories');

    // Category modal state
    const [catModal, setCatModal] = useState(false);
    const [catName, setCatName] = useState('');
    const defaultColors = [colors.primary, colors.secondary, '#6366F1', '#F59E0B', '#3B82F6', '#EC4899', '#10B981', '#F97316'];
    const [catColor, setCatColor] = useState(defaultColors[0]);
    const [catIcon, setCatIcon] = useState(ICONS[0]);
    const [catType, setCatType] = useState<'expense' | 'income'>('expense');
    const [catLoading, setCatLoading] = useState(false);

    async function fetchData() {
        try {
            const [b, r, c, cats] = await Promise.all([
                api.getBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }) as Promise<any[]>,
                api.getRecurring() as Promise<any[]>,
                api.getCompanies() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
            ]);
            setBudgets(b); setRecurring(r); setCompanies(c); setCategories(cats);
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    function getCat(id: string) { return categories.find(c => c.id === id); }

    async function createCategory() {
        if (!catName.trim()) { Alert.alert('Atenção', 'Digite um nome para a categoria'); return; }
        setCatLoading(true);
        try {
            await api.createCategory({ name: catName.trim(), color: catColor, icon: catIcon, type: catType });
            setCatModal(false); setCatName(''); setCatColor(defaultColors[0]); setCatIcon(ICONS[0]);
            fetchData();
        } catch (e: any) { Alert.alert('Erro', e.message); }
        finally { setCatLoading(false); }
    }

    async function deleteCategory(id: string, name: string) {
        Alert.alert('Excluir', `Deseja excluir "${name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await api.deleteCategory(id); fetchData(); } catch (e: any) { Alert.alert('Erro', e.message); }
                }
            },
        ]);
    }

    const tabs = [
        { key: 'categories', label: 'Categorias', icon: 'pricetag' },
        { key: 'budgets', label: 'Orçamentos', icon: 'pie-chart' },
        { key: 'recurring', label: 'Recorrentes', icon: 'repeat' },
        { key: 'companies', label: 'Empresas', icon: 'business' },
    ] as const;

    const styles = s(colors);
    const mStyles = m(colors);

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Mais Opções</Text>
                        <Text style={styles.sub}>Gerencie categorias, orçamentos e mais</Text>
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

                        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.secondary + '15' }]}>
                                <Ionicons name="notifications-outline" size={20} color={colors.secondary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Notificações</Text>
                                <Text style={styles.settingSub}>Alertas de vencimento e gastos</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Ações Rápidas</Text>
                    <View style={styles.quickGrid}>
                        {[
                            { icon: 'card', label: 'Cartões', color: colors.secondary, route: '/cards' },
                            { icon: 'wallet', label: 'Contas', color: colors.primary, route: '/(tabs)/accounts' },
                            { icon: 'analytics', label: 'Relatórios', color: '#6366F1', route: '/(tabs)/reports' },
                        ].map(item => (
                            <TouchableOpacity key={item.label} style={styles.quickCard} onPress={() => router.push(item.route as any)}>
                                <View style={[styles.quickIcon, { backgroundColor: item.color + '15' }]}>
                                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                                </View>
                                <Text style={styles.quickLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Main Tabs Selection */}
                <View style={styles.tabsSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: 20 }}>
                        {tabs.map(t => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.tab, activeTab === t.key && styles.tabActive]}
                                onPress={() => setActiveTab(t.key)}
                            >
                                <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? colors.white : colors.textSecondary} />
                                <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/*Tab Content Area */}
                <View style={styles.tabContentArea}>
                    {/* CATEGORIES */}
                    {activeTab === 'categories' && (
                        <View>
                            <View style={styles.tabHeader}>
                                <Text style={styles.tabTitle}>Categorias</Text>
                                <TouchableOpacity style={styles.miniAddBtn} onPress={() => setCatModal(true)}>
                                    <Ionicons name="add" size={18} color={colors.white} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.groupLabel}>Despesas</Text>
                            <View style={styles.listCard}>
                                {categories.filter(c => c.type !== 'income').map((cat, idx) => (
                                    <View key={cat.id} style={[styles.listItem, idx === categories.filter(c => c.type !== 'income').length - 1 && { borderBottomWidth: 0 }]}>
                                        <View style={[styles.catIcon, { backgroundColor: cat.color + '15' }]}>
                                            <Ionicons name={(cat.icon || 'pricetag') as any} size={18} color={cat.color} />
                                        </View>
                                        <Text style={styles.catName}>{cat.name}</Text>
                                        {!cat.is_default ? (
                                            <TouchableOpacity onPress={() => deleteCategory(cat.id, cat.name)} style={styles.deleteBtn}>
                                                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                            </TouchableOpacity>
                                        ) : (
                                            <Text style={styles.defaultBadge}>Padrão</Text>
                                        )}
                                    </View>
                                ))}
                            </View>

                            <Text style={[styles.groupLabel, { marginTop: 20 }]}>Receitas</Text>
                            <View style={styles.listCard}>
                                {categories.filter(c => c.type === 'income').map((cat, idx) => (
                                    <View key={cat.id} style={[styles.listItem, idx === categories.filter(c => c.type === 'income').length - 1 && { borderBottomWidth: 0 }]}>
                                        <View style={[styles.catIcon, { backgroundColor: cat.color + '15' }]}>
                                            <Ionicons name={(cat.icon || 'pricetag') as any} size={18} color={cat.color} />
                                        </View>
                                        <Text style={styles.catName}>{cat.name}</Text>
                                        {!cat.is_default ? (
                                            <TouchableOpacity onPress={() => deleteCategory(cat.id, cat.name)} style={styles.deleteBtn}>
                                                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                            </TouchableOpacity>
                                        ) : (
                                            <Text style={styles.defaultBadge}>Padrão</Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* BUDGETS */}
                    {activeTab === 'budgets' && (
                        <View>
                            <View style={styles.tabHeader}>
                                <Text style={styles.tabTitle}>Orçamentos</Text>
                                <TouchableOpacity style={styles.miniAddBtn} onPress={() => router.push('/budget/new' as any)}>
                                    <Ionicons name="add" size={18} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                            {budgets.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="pie-chart-outline" size={48} color={colors.border} />
                                    <Text style={styles.emptyTxt}>Nenhum orçamento definido para este mês</Text>
                                </View>
                            ) : (
                                budgets.map(b => {
                                    const cat = getCat(b.category_id);
                                    const pct = b.amount > 0 ? Math.min(b.spent / b.amount, 1) : 0;
                                    const over = b.spent > b.amount;
                                    return (
                                        <TouchableOpacity key={b.id} style={styles.budgetCard} onPress={() => { }}>
                                            <View style={styles.budgetHead}>
                                                <View style={[styles.dot, { backgroundColor: cat?.color || colors.primary }]} />
                                                <Text style={styles.budgetName}>{cat?.name || 'Geral'}</Text>
                                                <Text style={[styles.budgetPct, { color: over ? colors.danger : colors.primary }]}>{(pct * 100).toFixed(0)}%</Text>
                                            </View>
                                            <View style={styles.progressTrack}>
                                                <View style={[styles.progressBar, { width: `${pct * 100}%` as any, backgroundColor: over ? colors.danger : colors.primary }]} />
                                            </View>
                                            <View style={styles.budgetFlex}>
                                                <Text style={styles.budgetVal}>{fmt(b.spent)} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>de {fmt(b.amount)}</Text></Text>
                                                {over && <Text style={styles.overTxt}>Excedido</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {/* RECURRING */}
                    {activeTab === 'recurring' && (
                        <View>
                            <View style={styles.tabHeader}>
                                <Text style={styles.tabTitle}>Pagamentos Recorrentes</Text>
                                <TouchableOpacity style={styles.miniAddBtn} onPress={() => router.push('/recurring/new' as any)}>
                                    <Ionicons name="add" size={18} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                            {recurring.filter(r => r.is_active).length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="repeat-outline" size={48} color={colors.border} />
                                    <Text style={styles.emptyTxt}>Nenhum lançamento recorrente ativo</Text>
                                </View>
                            ) : (
                                <View style={styles.listCard}>
                                    {recurring.filter(r => r.is_active).map((r, idx) => (
                                        <View key={r.id} style={[styles.listItem, idx === recurring.filter(r => r.is_active).length - 1 && { borderBottomWidth: 0 }]}>
                                            <View style={[styles.recIconWrap, { backgroundColor: r.type === 'income' ? colors.income + '15' : colors.expense + '15' }]}>
                                                <Ionicons name="repeat" size={18} color={r.type === 'income' ? colors.income : colors.expense} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemTitle}>{r.description}</Text>
                                                <Text style={styles.itemSub}>{FR_LABEL[r.frequency]}</Text>
                                            </View>
                                            <Text style={[styles.itemVal, { color: r.type === 'income' ? colors.income : colors.expense }]}>
                                                {r.type === 'income' ? '+' : '-'}{fmt(r.amount)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* COMPANIES */}
                    {activeTab === 'companies' && (
                        <View>
                            <View style={styles.tabHeader}>
                                <Text style={styles.tabTitle}>Empresas & Vendedores</Text>
                                <TouchableOpacity style={styles.miniAddBtn} onPress={() => router.push('/company/new' as any)}>
                                    <Ionicons name="add" size={18} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                            {companies.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="business-outline" size={48} color={colors.border} />
                                    <Text style={styles.emptyTxt}>Nenhuma empresa cadastrada</Text>
                                </View>
                            ) : (
                                <View style={styles.listCard}>
                                    {companies.map((c, idx) => (
                                        <TouchableOpacity key={c.id} style={[styles.listItem, idx === companies.length - 1 && { borderBottomWidth: 0 }]}>
                                            <View style={[styles.recIconWrap, { backgroundColor: c.color + '15' }]}>
                                                <Ionicons name="business" size={20} color={c.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemTitle}>{c.name}</Text>
                                                {c.cnpj ? <Text style={styles.itemSub}>{c.cnpj}</Text> : null}
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Foot Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Informações</Text>
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
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* New Category Modal */}
            <Modal visible={catModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCatModal(false)}>
                <View style={mStyles.container}>
                    <View style={mStyles.handle} />
                    <View style={mStyles.modalHeader}>
                        <Text style={mStyles.title}>Nova Categoria</Text>
                        <TouchableOpacity onPress={() => setCatModal(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Type toggle */}
                        <View style={mStyles.typeToggle}>
                            {(['expense', 'income'] as const).map(t => (
                                <TouchableOpacity key={t} style={[mStyles.typeBtn, catType === t && mStyles.typeBtnActive]} onPress={() => setCatType(t)}>
                                    <Text style={[mStyles.typeTxt, catType === t && mStyles.typeTxtActive]}>
                                        {t === 'expense' ? '💸 Despesa' : '💰 Receita'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Name */}
                        <Text style={mStyles.inputLabel}>NOME DA CATEGORIA</Text>
                        <TextInput
                            style={mStyles.input}
                            value={catName}
                            onChangeText={setCatName}
                            placeholder="Ex: Alimentação, Lazer..."
                            placeholderTextColor={colors.textMuted}
                        />

                        {/* Color Selection */}
                        <Text style={mStyles.inputLabel}>COR DE IDENTIFICAÇÃO</Text>
                        <View style={mStyles.colorGrid}>
                            {defaultColors.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => setCatColor(c)}
                                    style={[mStyles.colorCircle, { backgroundColor: c }, catColor === c && { borderColor: colors.text, borderWidth: 3 }]}
                                />
                            ))}
                        </View>

                        {/* Icon Selection */}
                        <Text style={mStyles.inputLabel}>ÍCONE</Text>
                        <View style={mStyles.iconGrid}>
                            {ICONS.map(ic => (
                                <TouchableOpacity
                                    key={ic}
                                    onPress={() => setCatIcon(ic)}
                                    style={[mStyles.iconItem, catIcon === ic && { backgroundColor: catColor, borderColor: catColor }]}
                                >
                                    <Ionicons name={ic as any} size={22} color={catIcon === ic ? colors.white : colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Preview Card */}
                        <View style={mStyles.previewCard}>
                            <View style={[mStyles.previewBadge, { backgroundColor: catColor + '20' }]}>
                                <Ionicons name={catIcon as any} size={28} color={catColor} />
                            </View>
                            <Text style={mStyles.previewTitle}>{catName || 'Nova Categoria'}</Text>
                            <Text style={mStyles.previewType}>{catType === 'income' ? 'Receita' : 'Despesa'}</Text>
                        </View>

                        <TouchableOpacity style={mStyles.mainBtn} onPress={createCategory} disabled={catLoading}>
                            {catLoading ? <ActivityIndicator color={colors.white} /> : <Text style={mStyles.mainBtnTxt}>Salvar Categoria</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
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

    groupLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
    listCard: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },
    catIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    catName: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '700' },
    deleteBtn: { padding: 8, backgroundColor: colors.danger + '10', borderRadius: 10 },
    defaultBadge: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },

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
    infoSectionTitle: { fontSize: 13, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 },
    infoLabel: { flex: 1, fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    infoVal: { fontSize: 14, color: colors.text, fontWeight: '700' }
});

const m = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingBottom: 40 },
    handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '900', color: colors.text },

    typeToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 4, marginBottom: 32, borderWidth: 1, borderColor: colors.border },
    typeBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    typeBtnActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    typeTxt: { fontSize: 14, color: colors.textSecondary, fontWeight: '800' },
    typeTxtActive: { color: colors.white },

    inputLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
    input: { backgroundColor: colors.surface, borderRadius: 18, height: 60, paddingHorizontal: 20, fontSize: 16, color: colors.text, fontWeight: '600', borderWidth: 1, borderColor: colors.border, marginBottom: 32 },

    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 32 },
    colorCircle: { width: 40, height: 40, borderRadius: 20 },

    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
    iconItem: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

    previewCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 40, borderWidth: 1, borderColor: colors.border },
    previewBadge: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    previewTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 4 },
    previewType: { fontSize: 13, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },

    mainBtn: { backgroundColor: colors.primary, borderRadius: 20, height: 64, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    mainBtnTxt: { color: colors.white, fontSize: 17, fontWeight: '900' }
});
