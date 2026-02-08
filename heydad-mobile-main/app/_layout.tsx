import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Merriweather_400Regular, Merriweather_600SemiBold, Merriweather_700Bold } from '@expo-google-fonts/merriweather';
import '../global.css';
import { AppState } from 'react-native';
import { supabase } from 'utils/supabase';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';

SplashScreen.preventAutoHideAsync();

// AppState listener moved inside RootLayoutNav component



const RootLayoutNav = () => {
  const { colorScheme, isLoaded } = useTheme();
  const [fontsLoaded, error] = useFonts({
    merriweather: Merriweather_400Regular,
    merriweatherSemibold: Merriweather_600SemiBold,
    merriweatherBold: Merriweather_700Bold,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (fontsLoaded && isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoaded]);

  if (!fontsLoaded || !isLoaded) {
    return null;
  }

  const backgroundColor = colorScheme === 'dark' ? '#1f2937' : '#f8fafc';
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar style={statusBarStyle} backgroundColor={backgroundColor} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="kids"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
