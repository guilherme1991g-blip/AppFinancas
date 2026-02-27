import React, { useState, useRef, useEffect } from 'react';
import { Tabs, Redirect, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { View, ActivityIndicator, Platform, TouchableOpacity, StyleSheet, Animated, Modal, Text, Pressable } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useLocale } from '@/contexts/LocaleContext';

function QuickActionMenu({ visible, onClose, colors, router, t }: { visible: boolean; onClose: () => void; colors: any; router: any; t: (key: string) => string }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(60)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 60, duration: 150, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const actions = [
        { icon: 'arrow-up-circle', label: t('action.expense'), sub: t('action.expense_sub'), color: colors.expense, route: '/transaction/new?type=expense' },
        { icon: 'arrow-down-circle', label: t('action.income'), sub: t('action.income_sub'), color: colors.income, route: '/transaction/new?type=income' },
        { icon: 'swap-horizontal', label: t('action.transfer'), sub: t('action.transfer_sub'), color: colors.primary, route: '/transfer/new' },
    ];

    const ms = menuS(colors);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <Pressable style={ms.overlay} onPress={onClose}>
                <Animated.View style={{ opacity: fadeAnim, flex: 1 }} />
            </Pressable>
            <Animated.View style={[ms.menuContainer, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: fadeAnim }]}>
                <View style={ms.menuCard}>
                    <Text style={ms.menuTitle}>{t('action.title')}</Text>
                    {actions.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[ms.actionRow, i === actions.length - 1 && { borderBottomWidth: 0 }]}
                            activeOpacity={0.7}
                            onPress={() => { onClose(); setTimeout(() => router.push(action.route as any), 100); }}
                        >
                            <View style={[ms.actionIcon, { backgroundColor: action.color + '15' }]}>
                                <Ionicons name={action.icon as any} size={26} color={action.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={ms.actionLabel}>{action.label}</Text>
                                <Text style={ms.actionSub}>{action.sub}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Cancel button */}
                <TouchableOpacity style={ms.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                    <Text style={ms.cancelText}>{t('action.cancel')}</Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
}

export default function TabsLayout() {
    const { user, isLoading } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const segments = useSegments();
    const [menuOpen, setMenuOpen] = useState(false);
    const { t } = useLocale();

    const TABS = ['index', 'transactions', 'accounts', 'tools', 'more'];
    const currentTab = segments[1] || 'index';
    const currentIndex = TABS.indexOf(currentTab);

    const onGestureEvent = (event: any) => {
        const { translationX, velocityX, state } = event.nativeEvent;

        if (state === State.END) {
            const swipeThreshold = 100;
            const velocityThreshold = 500;

            if (Math.abs(translationX) > swipeThreshold && Math.abs(velocityX) > velocityThreshold) {
                if (translationX > 0 && currentIndex > 0) {
                    const nextTab = TABS[currentIndex - 1];
                    const route = nextTab === 'index' ? '/(tabs)' : `/(tabs)/${nextTab}`;
                    router.push(route as any);
                } else if (translationX < 0 && currentIndex < TABS.length - 1) {
                    const nextTab = TABS[currentIndex + 1];
                    const route = nextTab === 'index' ? '/(tabs)' : `/(tabs)/${nextTab}`;
                    router.push(route as any);
                }
            }
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    if (!user) return <Redirect href="/(auth)/login" />;

    const fabStyles = fabS(colors);

    return (
        <PanGestureHandler
            onHandlerStateChange={onGestureEvent}
            activeOffsetX={[-50, 50]}
            failOffsetY={[-20, 20]}
        >
            <View style={{ flex: 1 }}>
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.border,
                            borderTopWidth: 1,
                            height: Platform.OS === 'ios' ? 88 : 74,
                            paddingTop: 8,
                            paddingBottom: Platform.OS === 'ios' ? 28 : 14,
                            paddingHorizontal: 8,
                            elevation: 0,
                            shadowOpacity: 0,
                        },
                        tabBarItemStyle: {
                            marginHorizontal: 2,
                        },
                        tabBarActiveTintColor: colors.primary,
                        tabBarInactiveTintColor: colors.textMuted,
                        tabBarLabelStyle: { fontSize: 9.5, fontWeight: '800', marginTop: -4, marginBottom: 4 },
                    }}
                >
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: t('tab.home'),
                            tabBarIcon: ({ color, focused }) => (
                                <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : undefined}>
                                    <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="transactions"
                        options={{
                            title: t('tab.transactions'),
                            tabBarIcon: ({ color, focused }) => (
                                <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : undefined}>
                                    <Ionicons name={focused ? 'list' : 'list-outline'} size={22} color={color} />
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="accounts"
                        options={{
                            title: '',
                            tabBarLabel: () => null,
                            tabBarIcon: () => null,
                            tabBarButton: () => (
                                <TouchableOpacity
                                    style={fabStyles.fabContainer}
                                    onPress={() => setMenuOpen(true)}
                                    activeOpacity={0.85}
                                >
                                    <View style={fabStyles.fab}>
                                        <View style={fabStyles.fabGlow} />
                                        <View style={fabStyles.fabInner}>
                                            <Ionicons name="add" size={32} color="#FFFFFF" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="tools"
                        options={{
                            title: t('tab.tools'),
                            tabBarIcon: ({ color, focused }) => (
                                <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : undefined}>
                                    <Ionicons name={focused ? 'apps' : 'apps-outline'} size={22} color={color} />
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="more"
                        options={{
                            title: t('tab.settings'),
                            tabBarIcon: ({ color, focused }) => (
                                <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : undefined}>
                                    <Ionicons name={focused ? 'menu' : 'menu-outline'} size={22} color={color} />
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen name="cards" options={{ href: null }} />
                </Tabs>

                {/* Quick Action Menu Modal */}
                <QuickActionMenu visible={menuOpen} onClose={() => setMenuOpen(false)} colors={colors} router={router} t={t} />
            </View>
        </PanGestureHandler>
    );
}

/* ──────────── FAB Styles ──────────── */
const fabS = (colors: any) => StyleSheet.create({
    fabContainer: {
        top: -20,
        justifyContent: 'center',
        alignItems: 'center',
        width: 68,
        height: 68,
    },
    fab: {
        width: 62,
        height: 62,
        borderRadius: 31,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabGlow: {
        position: 'absolute',
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: colors.primary,
        opacity: 0.3,
        transform: [{ scale: 1.15 }],
    },
    fabInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
        elevation: 8,
    },
});

/* ──────────── Menu Styles ──────────── */
const menuS = (colors: any) => StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    menuContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 110 : 90,
        left: 20,
        right: 20,
    },
    menuCard: {
        backgroundColor: colors.surface,
        borderRadius: 28,
        padding: 8,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    menuTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    actionSub: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 2,
    },
    cancelBtn: {
        marginTop: 10,
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textSecondary,
    },
});
