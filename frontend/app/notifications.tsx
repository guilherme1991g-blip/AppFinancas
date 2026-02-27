import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Image
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationsScreen() {
    const { colors, mode } = useTheme();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const styles = s(colors, mode);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await api.getNotifications() as any[];
            setNotifications(data);
        } catch (e) {
            console.error('Error fetching notifications:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function handleMarkAsRead(id: string) {
        try {
            await api.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (e) {
            console.error(e);
        }
    }

    async function handleMarkAllAsRead() {
        try {
            await api.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) {
            console.error(e);
        }
    }

    function getIcon(type: string) {
        switch (type) {
            case 'overdue': return { name: 'alert-circle', color: colors.expense };
            case 'budget': return { name: 'trending-up', color: colors.primary };
            case 'agenda': return { name: 'calendar', color: colors.secondary };
            default: return { name: 'notifications', color: colors.textSecondary };
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'Notificações',
                headerRight: () => (
                    <TouchableOpacity onPress={handleMarkAllAsRead} style={{ marginRight: 8 }}>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Ler tudo</Text>
                    </TouchableOpacity>
                )
            }} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={colors.primary} />}
            >
                {notifications.length === 0 ? (
                    <View style={styles.empty}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
                        </View>
                        <Text style={styles.emptyTitle}>Tudo em dia!</Text>
                        <Text style={styles.emptySub}>Você não tem nenhuma notificação no momento.</Text>

                        <TouchableOpacity
                            style={[styles.testBtn, { marginTop: 32 }]}
                            onPress={async () => {
                                try {
                                    await api.sendTestNotification();
                                    fetchNotifications();
                                } catch (e) { console.error(e); }
                            }}
                        >
                            <Ionicons name="flask-outline" size={20} color={colors.white} />
                            <Text style={styles.testBtnText}>Mandar Notificação Teste</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    notifications.map((notif) => {
                        const icon = getIcon(notif.type);
                        return (
                            <TouchableOpacity
                                key={notif.id}
                                style={[styles.item, !notif.read && styles.itemUnread]}
                                onPress={() => handleMarkAsRead(notif.id)}
                            >
                                <View style={[styles.iconWrap, { backgroundColor: icon.color + '15' }]}>
                                    <Ionicons name={icon.name as any} size={22} color={icon.color} />
                                </View>
                                <View style={styles.content}>
                                    <View style={styles.itemHeader}>
                                        <Text style={[styles.itemTitle, !notif.read && styles.itemTitleUnread]}>{notif.title}</Text>
                                        {!notif.read && <View style={styles.unreadDot} />}
                                    </View>
                                    <Text style={styles.itemBody}>{notif.body}</Text>
                                    <Text style={styles.itemDate}>
                                        {format(new Date(notif.created_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const s = (colors: any, mode: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 20, flexGrow: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 8 },
    emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

    item: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 16
    },
    itemUnread: { borderColor: colors.primary + '40', backgroundColor: mode === 'dark' ? colors.primary + '08' : colors.primary + '03' },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemTitle: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
    itemTitleUnread: { color: colors.text, fontWeight: '900' },
    itemBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
    itemDate: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    testBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, gap: 8 },
    testBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 }
});
