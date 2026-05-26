import { Stack } from 'expo-router';
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
import { View } from 'react-native';
import { colors } from '@/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.page }} />;
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
