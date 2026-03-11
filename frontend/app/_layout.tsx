import { ThemeProvider as NavigationProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { UpgradeProvider, useUpgrade } from '@/contexts/UpgradeContext';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSegments, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api, setPlanLimitListener } from '@/services/api';
import { UpgradeModal } from '@/components/UpgradeModal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    return;
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
    } catch (e) {
      console.log('Error getting push token', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

function RootLayoutNav() {
  const { user, isLoading, skipProfileRequirement } = useAuth();
  const { mode, colors } = useTheme();
  const { visible, message, hideUpgrade } = useUpgrade();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProfile = segments[segments.length - 1] === 'profile';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (user && inAuthGroup) {
      if (user.profile_complete === false && !skipProfileRequirement) {
        router.replace('/profile' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } else if (user && !inAuthGroup && !inProfile && user.profile_complete === false && !skipProfileRequirement) {
      router.replace('/profile' as any);
    }
  }, [user, segments, isLoading, skipProfileRequirement]);

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          api.updatePushToken(token).catch(err => {
            console.error('Error saving push token:', err);
          });
        }
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="transfer/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="budget/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="company/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recurring/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="objetivos/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="agenda/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notification-settings" options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Notificações',
          headerTransparent: true,
          headerBlurEffect: 'regular',
        }} />
      </Stack>
      <UpgradeModal visible={visible} message={message} onClose={hideUpgrade} />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </NavigationProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <LocaleProvider>
              <UpgradeProvider>
                <RootLayoutNav />
              </UpgradeProvider>
            </LocaleProvider>
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
