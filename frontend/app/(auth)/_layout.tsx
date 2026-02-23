import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    if (user) {
        return <Redirect href="/(tabs)" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
