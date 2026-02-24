import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, ActivityIndicator, Alert, Platform
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

export default function NotificationSettingsScreen() {
    const { colors, mode } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prefs, setPrefs] = useState({
        bill_reminders: true,
        budget_alerts: true,
        daily_summary: false,
        recurring_alerts: true
    });

    const styles = s(colors);

    useEffect(() => {
        async function load() {
            try {
                const data = await api.getPreferences();
                setPrefs(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function togglePref(key: keyof typeof prefs) {
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        setPrefs(newPrefs);
        setSaving(true);
        try {
            await api.updatePreferences(newPrefs);
        } catch (e: any) {
            Alert.alert('Erro', 'Não foi possível salvar sua preferência');
            setPrefs(prefs); // Revert
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    const settings = [
        {
            key: 'bill_reminders',
            label: 'Vencimento de Faturas',
            sub: 'Lembretes antes do fechamento e vencimento',
            icon: 'receipt-outline',
            color: '#6366F1'
        },
        {
            key: 'budget_alerts',
            label: 'Alertas de Orçamento',
            sub: 'Avisar quando atingir 80% e 100% do limite',
            icon: 'pie-chart-outline',
            color: colors.primary
        },
        {
            key: 'daily_summary',
            label: 'Resumo Diário',
            sub: 'Uma visão geral dos seus gastos no final do dia',
            icon: 'calendar-outline',
            color: colors.secondary
        },
        {
            key: 'recurring_alerts',
            label: 'Lançamentos Recorrentes',
            sub: 'Confirmar pagamentos automáticos do dia',
            icon: 'repeat-outline',
            color: '#10B981'
        }
    ] as const;

    return (
        <View style={styles.root}>
            <Stack.Screen options={{
                title: 'Notificações',
                headerShown: true,
                headerTransparent: true,
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '900' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.headerSpacer} />

                <View style={styles.intro}>
                    <Text style={styles.introTitle}>Personalize seus Alertas</Text>
                    <Text style={styles.introSub}>Escolha quais notificações são importantes para você acompanhar suas finanças.</Text>
                </View>

                <View style={styles.group}>
                    {settings.map((item, idx) => (
                        <View key={item.key} style={[styles.row, idx === settings.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={[styles.iconWrap, { backgroundColor: item.color + '15' }]}>
                                <Ionicons name={item.icon as any} size={20} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>{item.label}</Text>
                                <Text style={styles.sub}>{item.sub}</Text>
                            </View>
                            <Switch
                                value={prefs[item.key]}
                                onValueChange={() => togglePref(item.key)}
                                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                thumbColor={prefs[item.key] ? colors.primary : colors.textSecondary}
                                disabled={saving}
                            />
                        </View>
                    ))}
                </View>

                {saving && (
                    <View style={styles.savingBadge}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.savingTxt}>Salvando...</Text>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.infoBoxTxt}>As notificações ajudam você a manter o controle e evitar atrasos que geram multas e juros.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20 },
    headerSpacer: { height: 100 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

    intro: { marginBottom: 32 },
    introTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 8 },
    introSub: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, fontWeight: '500' },

    group: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 16 },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 16, fontWeight: '800', color: colors.text },
    sub: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '500', lineHeight: 16 },

    savingBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
    savingTxt: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

    infoBox: { flexDirection: 'row', gap: 12, marginTop: 40, padding: 20, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
    infoBoxTxt: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 18, fontWeight: '500' }
});
