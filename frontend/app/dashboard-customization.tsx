import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/services/api';

interface DashboardCard {
    id: string;
    enabled: boolean;
    order: number;
}

export default function DashboardCustomizationScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useLocale();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cards, setCards] = useState<DashboardCard[]>([]);

    useEffect(() => {
        loadPreferences();
    }, []);

    async function loadPreferences() {
        try {
            const prefs: any = await api.getPreferences();
            const defaultCards: DashboardCard[] = [
                { id: 'balance', enabled: true, order: 0 },
                { id: 'summary', enabled: true, order: 1 },
                { id: 'cards', enabled: true, order: 2 },
                { id: 'spending_categories', enabled: true, order: 3 },
                { id: 'budget_progress', enabled: true, order: 4 },
                { id: 'upcoming_bills', enabled: true, order: 5 },
                { id: 'transactions', enabled: true, order: 6 },
                { id: 'goals', enabled: false, order: 7 },
            ];

            if (prefs.dashboard_cards && prefs.dashboard_cards.length > 0) {
                // Merge existing preferences with defaults to ensure new cards appear
                const existingIds = new Set(prefs.dashboard_cards.map((c: any) => c.id));
                const missingCards = defaultCards.filter(c => !existingIds.has(c.id));
                const combined = [...prefs.dashboard_cards, ...missingCards];
                setCards(combined.sort((a, b) => a.order - b.order));
            } else {
                setCards(defaultCards);
            }
        } catch (e) {
            Alert.alert(t('common.error'), 'Failed to load preferences');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            // Update order based on current list index
            const updatedCards = cards.map((c, index) => ({ ...c, order: index }));
            await api.updatePreferences({ dashboard_cards: updatedCards });
            Alert.alert('✅', t('dashboard.save_success'));
            router.back();
        } catch (e) {
            Alert.alert(t('common.error'), 'Failed to save layout');
        } finally {
            setSaving(false);
        }
    }

    function toggleCard(id: string) {
        setCards(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    }

    function moveUp(index: number) {
        if (index === 0) return;
        const newCards = [...cards];
        [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
        setCards(newCards);
    }

    function moveDown(index: number) {
        if (index === cards.length - 1) return;
        const newCards = [...cards];
        [newCards[index + 1], newCards[index]] = [newCards[index], newCards[index + 1]];
        setCards(newCards);
    }

    const styles = s(colors);

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('dashboard.customization_title')}</Text>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>Organize a ordem dos cards movendo-os para cima ou para baixo, e escolha quais deseja visualizar na tela inicial.</Text>
                </View>

                {cards.map((card, index) => (
                    <View key={card.id} style={[styles.cardRow, !card.enabled && { opacity: 0.6 }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name={getCardIcon(card.id)} size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardLabel}>{t(`dashboard.card_${card.id}`)}</Text>
                            </View>
                            <Switch
                                value={card.enabled}
                                onValueChange={() => toggleCard(card.id)}
                                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                thumbColor={card.enabled ? colors.primary : colors.textSecondary}
                            />
                        </View>

                        <View style={styles.orderControls}>
                            <TouchableOpacity
                                style={[styles.orderBtn, index === 0 && { opacity: 0.3 }]}
                                onPress={() => moveUp(index)}
                                disabled={index === 0}
                            >
                                <Ionicons name="arrow-up" size={18} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.orderBtn, index === cards.length - 1 && { opacity: 0.3 }]}
                                onPress={() => moveDown(index)}
                                disabled={index === cards.length - 1}
                            >
                                <Ionicons name="arrow-down" size={18} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

function getCardIcon(id: string): any {
    switch (id) {
        case 'balance': return 'wallet-outline';
        case 'summary': return 'stats-chart-outline';
        case 'cards': return 'card-outline';
        case 'transactions': return 'swap-horizontal-outline';
        case 'goals': return 'flag-outline';
        case 'spending_categories': return 'pie-chart-outline';
        case 'upcoming_bills': return 'calendar-outline';
        case 'budget_progress': return 'speedometer-outline';
        default: return 'square-outline';
    }
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
    saveBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary + '15',
    },
    saveBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

    infoBox: {
        flexDirection: 'row', gap: 12, margin: 20, padding: 16, borderRadius: 16,
        backgroundColor: colors.primary + '08', borderWidth: 1, borderColor: colors.primary + '15',
    },
    infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

    cardRow: {
        marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 20,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardLabel: { fontSize: 15, fontWeight: '700', color: colors.text },

    orderControls: {
        flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: colors.border, justifyContent: 'flex-end',
    },
    orderBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background,
        borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    },
});
