import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from 'providers/ThemeProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/(auth)/sign-in'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const tabBarBackground = isDark ? '#1f2937' : '#ffffff';

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.replace(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-800">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if ((requireAuth && !isAuthenticated) || (!requireAuth && isAuthenticated)) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ backgroundColor: tabBarBackground, position: "absolute", bottom: 0, left: 0, right: 0, height: 40 }} />
      {children}
    </SafeAreaView>
  );
}
