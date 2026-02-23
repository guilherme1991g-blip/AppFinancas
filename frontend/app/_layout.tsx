import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="transfer/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="budget/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="company/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recurring/new" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
