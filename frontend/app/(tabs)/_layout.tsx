import { Tabs, Redirect, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { View, ActivityIndicator, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

export default function TabsLayout() {
    const { user, isLoading } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const segments = useSegments();

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
                            title: 'Início',
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
                            title: 'Transações',
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
                            tabBarIcon: () => (
                                <TouchableOpacity
                                    style={fabStyles.fab}
                                    onPress={() => router.push('/transaction/new' as any)}
                                    activeOpacity={0.85}
                                >
                                    <View style={fabStyles.fabInner}>
                                        <Ionicons name="add" size={32} color="#FFFFFF" />
                                    </View>
                                </TouchableOpacity>
                            ),
                            tabBarButton: () => (
                                <TouchableOpacity
                                    style={fabStyles.fabContainer}
                                    onPress={() => router.push('/transaction/new' as any)}
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
                            title: 'Ferramentas',
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
                            title: 'Ajustes',
                            tabBarIcon: ({ color, focused }) => (
                                <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : undefined}>
                                    <Ionicons name={focused ? 'menu' : 'menu-outline'} size={22} color={color} />
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen name="cards" options={{ href: null }} />
                </Tabs>
            </View>
        </PanGestureHandler>
    );
}

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
