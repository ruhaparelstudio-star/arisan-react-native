import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { auth } from '@/services/firebase';
import { loadUserProfile } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { colors, typography } from '@/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const setUser = useAuthStore((s) => s.setUser);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await loadUserProfile(fbUser.uid);
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return unsub;
  }, [setUser, setInitializing]);

  useEffect(() => {
    if (initializing || !loaded) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!user && !inAuthGroup) {
      router.replace('/auth/phone');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [initializing, loaded, user, segments, router]);

  if (!loaded || initializing) {
    return <SplashView />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.page },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="winner" options={{ animation: 'fade' }} />
        <Stack.Screen name="set-date" />
        <Stack.Screen name="tukar" />
        <Stack.Screen name="approval" />
        <Stack.Screen name="riwayat" />
        <Stack.Screen name="pengaturan" />
      </Stack>
    </SafeAreaProvider>
  );
}

function SplashView() {
  return (
    <View style={styles.splash}>
      <StatusBar style="light" />
      <Text style={styles.brand}>Arisan</Text>
      <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: typography.h1.fontSize,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  spinner: { marginTop: 24 },
});
