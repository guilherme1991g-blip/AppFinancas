import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { View, ActivityIndicator } from 'react-native';

export default function TabsLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    if (!user) return <Redirect href="/(auth)/login" />;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Início',
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'Transações',
                    tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="accounts"
                options={{
                    title: 'Contas',
                    tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Relatórios',
                    tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: 'Mais',
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
