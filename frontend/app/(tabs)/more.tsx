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
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';


const FR_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const { mode, colors, toggleTheme } = useTheme();
    const { t, fmt } = useLocale();
    const now = new Date();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'recurring' | 'companies'>('recurring');

    async function fetchData() {
        try {
            const [r, c, cats, accs] = await Promise.all([
                api.getRecurring() as Promise<any[]>,
                api.getCompanies() as Promise<any[]>,
                api.getCategories() as Promise<any[]>,
                api.getAccounts() as Promise<any[]>,
            ]);
            setRecurring(r); setCompanies(c); setCategories(cats); setAccounts(accs);
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    async function handleExportJSON() {
        try {
            const data = await api.exportData();
            const fileName = `otto_backup_${new Date().toISOString().split('T')[0]}.json`;
            const filePath = `${FileSystem.cacheDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2));
            await Sharing.shareAsync(filePath);
        } catch (e: any) {
            Alert.alert('Erro', `Não foi possível exportar os dados: ${e.message}`);
        }
    }

    async function handleExportCSV() {
        try {
            const data: any = await api.exportData();
            const txs = data.transactions || [];

            if (txs.length === 0) {
                Alert.alert('Aviso', 'Não há transações para exportar.');
                return;
            }

            const header = 'Data;Descrição;Categoria;Valor;Tipo;Status\n';
            const rows = txs.map((t: any) => {
                const date = new Date(t.date).toLocaleDateString();
                const type = t.type === 'income' ? 'Receita' : 'Despesa';
                const status = t.is_paid ? 'Pago' : 'Pendente';
                return `${date};${t.description};${t.category};${t.amount.toFixed(2).replace('.', ',')};${type};${status}`;
            }).join('\n');

            const fileName = `otto_transacoes_${new Date().toISOString().split('T')[0]}.csv`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            // Add UTF-8 BOM for Excel
            await FileSystem.writeAsStringAsync(filePath, '\ufeff' + header + rows);
            await Sharing.shareAsync(filePath);
        } catch (e: any) {
            Alert.alert('Erro', `Não foi possível gerar a planilha: ${e.message}`);
        }
    }

    async function handleImport() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
            const data = JSON.parse(fileContent);

            Alert.alert(
                'Confirmar Importação',
                'Isso irá substituir todos os dados atuais (exceto seu perfil). Deseja continuar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Sim, Importar',
                        style: 'destructive',
                        onPress: async () => {
                            setRefreshing(true);
                            try {
                                await api.importData(data);
                                Alert.alert('Sucesso', 'Dados importados com sucesso!');
                                fetchData();
                            } catch (e: any) {
                                Alert.alert('Erro', 'Falha ao importar arquivo. Verifique o formato.');
                            } finally {
                                setRefreshing(false);
                            }
                        }
                    }
                ]
            );
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Formato de arquivo inválido.');
        }
    }

    function getCat(id: string) { return categories.find(c => c.id === id); }

    async function handleImportCSV() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const file = result.assets[0];
            const ext = file.name?.toLowerCase()?.split('.').pop();
            if (ext !== 'csv' && ext !== 'txt') {
                Alert.alert('Erro', 'Selecione um arquivo .csv ou .txt');
                return;
            }

            const fileContent = await FileSystem.readAsStringAsync(file.uri);

            // Detectar separador (;  ou ,)
            const firstLine = fileContent.split('\n')[0];
            const separator = firstLine.includes(';') ? ';' : ',';

            const lines = fileContent.split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                Alert.alert('Erro', 'Arquivo vazio ou sem dados.');
                return;
            }

            // Parse header
            const header = lines[0].split(separator).map(h => h.trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')); // Remove acentos

            // Detectar colunas
            const colDate = header.findIndex(h => h.includes('data'));
            const colDesc = header.findIndex(h => h.includes('descri'));
            const colCat = header.findIndex(h => h.includes('categ'));
            const colAmount = header.findIndex(h => h.includes('valor') || h.includes('amount'));
            const colType = header.findIndex(h => h.includes('tipo') || h.includes('type'));
            const colStatus = header.findIndex(h => h.includes('status') || h.includes('pago'));

            if (colDate === -1 || colDesc === -1 || colAmount === -1) {
                Alert.alert('Erro', 'Planilha precisa ter pelo menos colunas: Data, Descrição, Valor');
                return;
            }

            // Parse rows
            const rows = lines.slice(1).map(line => {
                const cols = line.split(separator).map(c => c.trim());
                return {
                    date: cols[colDate] || '',
                    description: cols[colDesc] || '',
                    category: colCat >= 0 ? cols[colCat] || '' : '',
                    amount: colAmount >= 0 ? cols[colAmount] || '0' : '0',
                    type: colType >= 0 ? cols[colType] || '' : '',
                    status: colStatus >= 0 ? cols[colStatus] || '' : '',
                };
            }).filter(r => r.description && r.amount !== '0');

            if (rows.length === 0) {
                Alert.alert('Aviso', 'Nenhuma transação encontrada na planilha.');
                return;
            }

            // Pedir para escolher a conta
            if (accounts.length === 0) {
                Alert.alert('Erro', 'Você precisa cadastrar pelo menos uma conta antes de importar.');
                return;
            }

            const accountButtons = accounts.slice(0, 8).map((acc: any) => ({
                text: acc.name,
                onPress: () => processCSVImport(rows, acc)
            }));
            accountButtons.push({ text: 'Cancelar', onPress: async () => { } });

            Alert.alert(
                'Escolha a Conta',
                `${rows.length} transações encontradas. Para qual conta deseja importar?`,
                accountButtons as any
            );
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível ler a planilha.');
        }
    }

    async function processCSVImport(rows: any[], account: any) {
        setRefreshing(true);
        let imported = 0;
        let errors = 0;

        // Buscar categorias para mapeamento por nome
        const catMap: Record<string, string> = {};
        categories.forEach((c: any) => {
            catMap[c.name.toLowerCase()] = c.id;
        });
        const defaultCatId = categories.length > 0 ? categories[0].id : null;

        for (const row of rows) {
            try {
                // Parse valor - aceita "1.234,56" ou "1234.56"
                let amountStr = row.amount.replace(/[^\d.,-]/g, '');
                if (amountStr.includes(',')) {
                    amountStr = amountStr.replace(/\./g, '').replace(',', '.');
                }
                const amount = Math.abs(parseFloat(amountStr));
                if (isNaN(amount) || amount === 0) continue;

                // Parse tipo
                let type: 'income' | 'expense' = 'expense';
                const typeLower = row.type.toLowerCase();
                if (typeLower.includes('receita') || typeLower.includes('income') || typeLower.includes('entrada')) {
                    type = 'income';
                }

                // Parse data - aceita dd/mm/yyyy ou yyyy-mm-dd
                let dateObj: Date;
                const dateParts = row.date.split('/');
                if (dateParts.length === 3) {
                    const [d, m, y] = dateParts;
                    dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                } else {
                    dateObj = new Date(row.date);
                }
                if (isNaN(dateObj.getTime())) dateObj = new Date();

                // Mapear categoria
                const catId = catMap[row.category.toLowerCase()] || defaultCatId;
                if (!catId) continue;

                // Parse status
                const statusLower = row.status.toLowerCase();
                const isPaid = statusLower.includes('pago') || statusLower.includes('paid') || statusLower === '';

                await api.createTransaction({
                    account_id: account.id,
                    category_id: catId,
                    type,
                    amount,
                    description: row.description,
                    date: dateObj.toISOString(),
                    is_paid: isPaid,
                });
                imported++;
            } catch {
                errors++;
            }
        }

        setRefreshing(false);
        Alert.alert(
            'Importação Concluída',
            `✅ ${imported} transações importadas${errors > 0 ? `\n⚠️ ${errors} falharam` : ''}`
        );
        fetchData();
    }

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
                        <Text style={styles.title}>{t('settings.title')}</Text>
                        <Text style={styles.sub}>{t('settings.subtitle')}</Text>
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
                        {(() => {
                            const plan = (user as any)?.plan || 'free';
                            const planConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
                                free: { label: 'Grátis', color: '#64748B', bg: '#64748B15', border: '#64748B20' },
                                basic: { label: 'Básico', color: '#3B82F6', bg: '#3B82F615', border: '#3B82F620' },
                                premium: { label: 'Premium', color: '#F59E0B', bg: '#F59E0B15', border: '#F59E0B20' },
                            };
                            const cfg = planConfig[plan] || planConfig.free;
                            return (
                                <View style={[styles.profileBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                                    <Text style={[styles.profileBadgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            );
                        })()}
                    </View>

                    {/* Premium/Trial Banner */}
                    {(user as any)?.trial_active && (
                        <TouchableOpacity
                            style={styles.premiumBanner}
                            onPress={() => { }}
                            activeOpacity={0.9}
                        >
                            <View style={styles.premiumBannerContent}>
                                <View style={styles.premiumIconWrap}>
                                    <Ionicons name="sparkles" size={20} color="#FFF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.premiumTitle}>Período Premium Ativo!</Text>
                                    <Text style={styles.premiumSub}>
                                        Você tem {(user as any).trial_days_left} {(user as any).trial_days_left === 1 ? 'dia' : 'dias'} de acesso total. Aproveite!
                                    </Text>
                                </View>
                                <Ionicons name="star" size={24} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', right: -10, top: -5 }} />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Settings Rows */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>{t('settings.title')}</Text>
                    <View style={styles.settingsGroup}>
                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/profile' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="person-outline" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.profile')}</Text>
                                <Text style={styles.settingSub}>{t('settings.profile_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/security' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#F59E0B15' }]}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.security_menu')}</Text>
                                <Text style={styles.settingSub}>{t('settings.security_menu_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/notification-settings' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.secondary + '15' }]}>
                                <Ionicons name="notifications-outline" size={20} color={colors.secondary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
                                <Text style={styles.settingSub}>{t('settings.notifications_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/dashboard-customization' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="grid-outline" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.dashboard')}</Text>
                                <Text style={styles.settingSub}>{t('settings.dashboard_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/category')}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#6366F115' }]}>
                                <Ionicons name="pricetags-outline" size={20} color="#6366F1" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.categories')}</Text>
                                <Text style={styles.settingSub}>{t('settings.categories_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/(tabs)/accounts' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.income + '15' }]}>
                                <Ionicons name="wallet-outline" size={20} color={colors.income} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.accounts')}</Text>
                                <Text style={styles.settingSub}>{t('settings.accounts_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/(tabs)/cards' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: colors.warning + '15' }]}>
                                <Ionicons name="card-outline" size={20} color={colors.warning} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.cards')}</Text>
                                <Text style={styles.settingSub}>{t('settings.cards_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/preferences' as any)}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#EC489915' }]}>
                                <Ionicons name="options-outline" size={20} color="#EC4899" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>{t('settings.preferences')}</Text>
                                <Text style={styles.settingSub}>{t('settings.preferences_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Data Management Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Gestão de Dados</Text>
                    <View style={styles.settingsGroup}>
                        <TouchableOpacity style={styles.settingRow} onPress={handleExportCSV}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#10B98115' }]}>
                                <Ionicons name="download-outline" size={20} color="#10B981" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Exportar Transações (Planilha)</Text>
                                <Text style={styles.settingSub}>Gere um arquivo CSV para abrir no Excel ou Sheets</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={handleExportJSON}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#3B82F615' }]}>
                                <Ionicons name="cloud-download-outline" size={20} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Exportar Backup Completo</Text>
                                <Text style={styles.settingSub}>Inclui faturas, contas e configurações (JSON)</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingRow} onPress={handleImportCSV}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#F59E0B15' }]}>
                                <Ionicons name="document-text-outline" size={20} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Importar Planilha (CSV)</Text>
                                <Text style={styles.settingSub}>Importe transações de um arquivo .csv</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={handleImport}>
                            <View style={[styles.settingIconWrap, { backgroundColor: '#8B5CF615' }]}>
                                <Ionicons name="cloud-upload-outline" size={20} color="#8B5CF6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Importar Backup</Text>
                                <Text style={styles.settingSub}>Selecione um arquivo de backup anterior (.json)</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Foot Info */}
                <View style={styles.infoSection}>
                    <View style={styles.listCard}>
                        <View style={styles.listItem}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.infoLabel}>{t('settings.security')}</Text>
                            <Text style={styles.infoVal}>{t('settings.encrypted')}</Text>
                        </View>
                        <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                            <Ionicons name="server-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.infoLabel}>{t('settings.version')}</Text>
                            <Text style={styles.infoVal}>1.3.0</Text>
                        </View>
                    </View>

                    <View style={{ height: 20 }} />
                </View>
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
    deleteBtnTxt: { fontSize: 15, fontWeight: '800', color: colors.danger },

    premiumBanner: {
        marginTop: 12,
        borderRadius: 20,
        backgroundColor: '#8B5CF6',
        padding: 16,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        overflow: 'hidden',
    },
    premiumBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    premiumIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
    },
    premiumSub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginTop: 2,
    },
});
