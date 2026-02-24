import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { View, ActivityIndicator, Platform } from 'react-native';

export default function TabsLayout() {
    const { user, isLoading } = useAuth();
    const { colors } = useTheme();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    if (!user) return <Redirect href="/(auth)/login" />;

    return (
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
                    paddingHorizontal: 20,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarItemStyle: {
                    marginHorizontal: 12,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '800', marginTop: -4, marginBottom: 4 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Início',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="accounts"
                options={{
                    title: 'Contas',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="tools"
                options={{
                    title: 'Ferramentas',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
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
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'menu' : 'menu-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen name="cards" options={{ href: null }} />
            <Tabs.Screen name="transactions" options={{ href: null }} />
        </Tabs>
    );
}
