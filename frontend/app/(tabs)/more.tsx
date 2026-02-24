import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Alert, TextInput, Modal, ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const COLORS = ['#00D09C', '#FF6B6B', '#6C5ECF', '#F59E0B', '#3B82F6', '#EC4899', '#10B981', '#F97316'];
const ICONS = ['cart', 'car', 'restaurant', 'home', 'medkit', 'school', 'airplane', 'game-controller',
    'shirt', 'gift', 'trending-up', 'briefcase', 'phone-portrait', 'musical-notes', 'paw', 'fitness'];

function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function SettingsScreen() {
    const { user, logout } = useAuth();
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
    const [catColor, setCatColor] = useState(COLORS[0]);
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
            setCatModal(false); setCatName(''); setCatColor(COLORS[0]); setCatIcon(ICONS[0]);
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

    return (
        <View style={s.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#00D09C" />}
            >
                {/* Header */}
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Configurações</Text>
                        <Text style={s.sub}>Gerencie seu app financeiro</Text>
                    </View>
                    <View style={s.avatar}>
                        <Text style={s.avatarTxt}>{user?.name?.[0]?.toUpperCase()}</Text>
                    </View>
                </View>

                {/* Profile card */}
                <View style={s.profileCard}>
                    <View style={s.profileLeft}>
                        <View style={s.profileAvatar}>
                            <Text style={s.profileAvatarTxt}>{user?.name?.[0]?.toUpperCase()}</Text>
                        </View>
                        <View>
                            <Text style={s.profileName}>{user?.name}</Text>
                            <Text style={s.profileEmail}>{user?.email}</Text>
                        </View>
                    </View>
                    <View style={s.profileBadge}>
                        <Text style={s.profileBadgeTxt}>Free</Text>
                    </View>
                </View>

                {/* Quick links */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Ações Rápidas</Text>
                    <View style={s.quickGrid}>
                        {[
                            { icon: 'add-circle', label: 'Nova Transação', color: '#00D09C', route: '/transaction/new?type=expense' },
                            { icon: 'wallet', label: 'Nova Conta', color: '#6C5ECF', route: '/account/new' },
                            { icon: 'pie-chart', label: 'Novo Orçamento', color: '#F59E0B', route: '/budget/new' },
                            { icon: 'repeat', label: 'Novo Recorrente', color: '#3B82F6', route: '/recurring/new' },
                            { icon: 'business', label: 'Nova Empresa', color: '#EC4899', route: '/company/new' },
                            { icon: 'swap-horizontal', label: 'Transferência', color: '#10B981', route: '/transfer/new' },
                        ].map(item => (
                            <TouchableOpacity key={item.label} style={s.quickGridItem} onPress={() => router.push(item.route as any)}>
                                <View style={[s.quickGridIcon, { backgroundColor: item.color + '20' }]}>
                                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                                </View>
                                <Text style={s.quickGridLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Tabs */}
                <View style={s.section}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsRow}>
                        {tabs.map(t => (
                            <TouchableOpacity
                                key={t.key}
                                style={[s.tab, activeTab === t.key && s.tabActive]}
                                onPress={() => setActiveTab(t.key)}
                            >
                                <Ionicons name={t.icon as any} size={14} color={activeTab === t.key ? '#000' : '#6B7280'} />
                                <Text style={[s.tabTxt, activeTab === t.key && s.tabTxtActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* CATEGORIES */}
                {activeTab === 'categories' && (
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>Categorias ({categories.length})</Text>
                            <TouchableOpacity style={s.addBtn} onPress={() => setCatModal(true)}>
                                <Ionicons name="add" size={14} color="#000" />
                                <Text style={s.addBtnTxt}>Nova</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Expense categories */}
                        <Text style={s.subTitle}>Despesas</Text>
                        {categories.filter(c => c.type !== 'income').map(cat => (
                            <View key={cat.id} style={s.catRow}>
                                <View style={[s.catIcon, { backgroundColor: cat.color + '20' }]}>
                                    <Ionicons name={(cat.icon || 'pricetag') as any} size={18} color={cat.color} />
                                </View>
                                <Text style={s.catName}>{cat.name}</Text>
                                {!cat.is_default && (
                                    <TouchableOpacity onPress={() => deleteCategory(cat.id, cat.name)} style={s.deleteBtn}>
                                        <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                                    </TouchableOpacity>
                                )}
                                {cat.is_default && <Text style={s.defaultBadge}>padrão</Text>}
                            </View>
                        ))}

                        <Text style={[s.subTitle, { marginTop: 16 }]}>Receitas</Text>
                        {categories.filter(c => c.type === 'income').map(cat => (
                            <View key={cat.id} style={s.catRow}>
                                <View style={[s.catIcon, { backgroundColor: cat.color + '20' }]}>
                                    <Ionicons name={(cat.icon || 'pricetag') as any} size={18} color={cat.color} />
                                </View>
                                <Text style={s.catName}>{cat.name}</Text>
                                {!cat.is_default && (
                                    <TouchableOpacity onPress={() => deleteCategory(cat.id, cat.name)} style={s.deleteBtn}>
                                        <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                                    </TouchableOpacity>
                                )}
                                {cat.is_default && <Text style={s.defaultBadge}>padrão</Text>}
                            </View>
                        ))}
                    </View>
                )}

                {/* BUDGETS */}
                {activeTab === 'budgets' && (
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>Orçamentos do Mês</Text>
                            <TouchableOpacity style={s.addBtn} onPress={() => router.push('/budget/new' as any)}>
                                <Ionicons name="add" size={14} color="#000" />
                                <Text style={s.addBtnTxt}>Novo</Text>
                            </TouchableOpacity>
                        </View>
                        {budgets.length === 0 ? (
                            <Text style={s.emptyTxt}>Nenhum orçamento definido</Text>
                        ) : budgets.map(b => {
                            const cat = getCat(b.category_id);
                            const pct = b.amount > 0 ? Math.min(b.spent / b.amount, 1) : 0;
                            const over = b.spent > b.amount;
                            return (
                                <View key={b.id} style={s.budgetCard}>
                                    <View style={s.budgetRow}>
                                        <View style={[s.catDot, { backgroundColor: cat?.color || '#6C5ECF' }]} />
                                        <Text style={s.budgetName}>{cat?.name || 'Categoria'}</Text>
                                        <Text style={[s.budgetPct, { color: over ? '#FF6B6B' : '#00D09C' }]}>{(pct * 100).toFixed(0)}%</Text>
                                    </View>
                                    <View style={s.progressBg}>
                                        <View style={[s.progressFg, { width: `${pct * 100}%` as any, backgroundColor: over ? '#FF6B6B' : '#00D09C' }]} />
                                    </View>
                                    <View style={s.budgetFooter}>
                                        <Text style={s.budgetSpent}>{fmt(b.spent)} gastos</Text>
                                        <Text style={s.budgetTotal}>de {fmt(b.amount)}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* RECURRING */}
                {activeTab === 'recurring' && (
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>Recorrentes</Text>
                            <TouchableOpacity style={s.addBtn} onPress={() => router.push('/recurring/new' as any)}>
                                <Ionicons name="add" size={14} color="#000" />
                                <Text style={s.addBtnTxt}>Novo</Text>
                            </TouchableOpacity>
                        </View>
                        {recurring.length === 0 ? (
                            <Text style={s.emptyTxt}>Nenhum lançamento recorrente</Text>
                        ) : recurring.filter(r => r.is_active).map(r => (
                            <View key={r.id} style={s.recCard}>
                                <View style={[s.recIcon, { backgroundColor: r.type === 'income' ? '#00D09C20' : '#FF6B6B20' }]}>
                                    <Ionicons name="repeat" size={18} color={r.type === 'income' ? '#00D09C' : '#FF6B6B'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.recDesc}>{r.description}</Text>
                                    <Text style={s.recFreq}>{FR_LABEL[r.frequency]}</Text>
                                </View>
                                <Text style={[s.recAmount, { color: r.type === 'income' ? '#00D09C' : '#FF6B6B' }]}>
                                    {r.type === 'income' ? '+' : '-'}{fmt(r.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* COMPANIES */}
                {activeTab === 'companies' && (
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>Empresas</Text>
                            <TouchableOpacity style={s.addBtn} onPress={() => router.push('/company/new' as any)}>
                                <Ionicons name="add" size={14} color="#000" />
                                <Text style={s.addBtnTxt}>Nova</Text>
                            </TouchableOpacity>
                        </View>
                        {companies.length === 0 ? (
                            <Text style={s.emptyTxt}>Nenhuma empresa cadastrada</Text>
                        ) : companies.map(c => (
                            <TouchableOpacity key={c.id} style={s.companyCard}>
                                <View style={[s.companyIcon, { backgroundColor: c.color + '20' }]}>
                                    <Ionicons name="business" size={20} color={c.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.companyName}>{c.name}</Text>
                                    {c.cnpj && <Text style={s.companyCnpj}>CNPJ: {c.cnpj}</Text>}
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#4B5563" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* App info */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Sobre o App</Text>
                    <View style={s.infoCard}>
                        {[
                            { icon: 'shield-checkmark-outline', label: 'Segurança', value: 'Dados criptografados' },
                            { icon: 'server-outline', label: 'Versão', value: '1.0.0' },
                            { icon: 'cloud-outline', label: 'Servidor', value: 'Online ✅' },
                        ].map(item => (
                            <View key={item.label} style={s.infoRow}>
                                <Ionicons name={item.icon as any} size={18} color="#6B7280" />
                                <Text style={s.infoLabel}>{item.label}</Text>
                                <Text style={s.infoValue}>{item.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity style={s.logoutBtn} onPress={logout}>
                    <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                    <Text style={s.logoutTxt}>Sair da conta</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* New Category Modal */}
            <Modal visible={catModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCatModal(false)}>
                <View style={m.container}>
                    <View style={m.handle} />
                    <Text style={m.title}>Nova Categoria</Text>

                    {/* Type toggle */}
                    <View style={m.typeRow}>
                        {(['expense', 'income'] as const).map(t => (
                            <TouchableOpacity key={t} style={[m.typeBtn, catType === t && m.typeBtnActive]} onPress={() => setCatType(t)}>
                                <Text style={[m.typeTxt, catType === t && m.typeTxtActive]}>
                                    {t === 'expense' ? '💸 Despesa' : '💰 Receita'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Name */}
                    <Text style={m.label}>Nome</Text>
                    <TextInput
                        style={m.input}
                        value={catName}
                        onChangeText={setCatName}
                        placeholder="Ex: Alimentação"
                        placeholderTextColor="#4B5563"
                    />

                    {/* Color */}
                    <Text style={m.label}>Cor</Text>
                    <View style={m.colorRow}>
                        {COLORS.map(c => (
                            <TouchableOpacity key={c} onPress={() => setCatColor(c)} style={[m.colorDot, { backgroundColor: c }, catColor === c && m.colorDotActive]} />
                        ))}
                    </View>

                    {/* Icon */}
                    <Text style={m.label}>Ícone</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={m.iconRow}>
                        {ICONS.map(ic => (
                            <TouchableOpacity key={ic} onPress={() => setCatIcon(ic)} style={[m.iconBtn, catIcon === ic && { backgroundColor: catColor + '30', borderColor: catColor }]}>
                                <Ionicons name={ic as any} size={20} color={catIcon === ic ? catColor : '#6B7280'} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Preview */}
                    <View style={m.preview}>
                        <View style={[m.previewIcon, { backgroundColor: catColor + '20' }]}>
                            <Ionicons name={catIcon as any} size={24} color={catColor} />
                        </View>
                        <Text style={m.previewName}>{catName || 'Sua categoria'}</Text>
                    </View>

                    <TouchableOpacity style={m.saveBtn} onPress={createCategory} disabled={catLoading}>
                        {catLoading ? <ActivityIndicator color="#000" /> : <Text style={m.saveTxt}>Criar Categoria</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={m.cancelBtn} onPress={() => setCatModal(false)}>
                        <Text style={m.cancelTxt}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0A0F1E' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
    sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6C5ECF', alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

    profileCard: { marginHorizontal: 20, backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6C5ECF', alignItems: 'center', justifyContent: 'center' },
    profileAvatarTxt: { color: '#FFF', fontWeight: '700', fontSize: 18 },
    profileName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    profileEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    profileBadge: { backgroundColor: '#00D09C20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#00D09C40' },
    profileBadgeTxt: { color: '#00D09C', fontSize: 12, fontWeight: '600' },

    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
    subTitle: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    quickGridItem: { width: '31%', backgroundColor: '#111827', borderRadius: 14, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    quickGridIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    quickGridLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', fontWeight: '500' },

    tabsRow: { marginBottom: 12 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    tabActive: { backgroundColor: '#00D09C' },
    tabTxt: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
    tabTxtActive: { color: '#000' },

    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00D09C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#000' },

    catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    catName: { flex: 1, fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
    deleteBtn: { padding: 4 },
    defaultBadge: { fontSize: 11, color: '#4B5563', backgroundColor: '#1F2937', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

    budgetCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    budgetName: { flex: 1, fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
    budgetPct: { fontSize: 13, fontWeight: '700' },
    progressBg: { height: 5, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
    progressFg: { height: '100%', borderRadius: 3 },
    budgetFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    budgetSpent: { fontSize: 12, color: '#9CA3AF' },
    budgetTotal: { fontSize: 12, color: '#4B5563' },

    recCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    recIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    recDesc: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
    recFreq: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    recAmount: { fontSize: 14, fontWeight: '700' },

    companyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    companyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    companyName: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
    companyCnpj: { fontSize: 12, color: '#6B7280', marginTop: 2 },

    infoCard: { backgroundColor: '#111827', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    infoLabel: { flex: 1, fontSize: 14, color: '#9CA3AF' },
    infoValue: { fontSize: 13, color: '#4B5563' },

    emptyTxt: { color: '#4B5563', fontSize: 13 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 20, backgroundColor: '#111827', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,107,107,0.2)' },
    logoutTxt: { color: '#FF6B6B', fontWeight: '600', fontSize: 15 },
});

const m = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0F1E', padding: 24, paddingTop: 12 },
    handle: { width: 40, height: 4, backgroundColor: '#374151', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 24 },
    typeRow: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 14, padding: 4, marginBottom: 20 },
    typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    typeBtnActive: { backgroundColor: '#00D09C' },
    typeTxt: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
    typeTxtActive: { color: '#000' },
    label: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#374151', paddingHorizontal: 16, height: 52, color: '#FFFFFF', fontSize: 15, marginBottom: 20 },
    colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorDotActive: { borderWidth: 3, borderColor: '#FFFFFF' },
    iconRow: { marginBottom: 20 },
    iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', marginRight: 8, borderWidth: 1, borderColor: '#374151' },
    preview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#374151' },
    previewIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    previewName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    saveBtn: { height: 52, backgroundColor: '#00D09C', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    saveTxt: { color: '#000', fontWeight: '800', fontSize: 16 },
    cancelBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151' },
    cancelTxt: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
});
