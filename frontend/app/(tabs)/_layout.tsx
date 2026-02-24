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
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '800', marginTop: -4, marginBottom: 4 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'Extrato',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="accounts"
                options={{
                    title: 'Bancos',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="cards"
                options={{
                    title: 'Cartões',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'card' : 'card-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Análise',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: colors.primary + '15', padding: 8, borderRadius: 14 } : null}>
                            <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={22} color={color} />
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
                            <Ionicons name={focused ? 'options' : 'options-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}
