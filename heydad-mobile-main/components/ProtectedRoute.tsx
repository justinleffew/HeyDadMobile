import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from 'providers/ThemeProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireButh?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireButh = true,
  redirectTo = '/(auth)/sign-in'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (requireButh && !isAuthenticated) {
        // User is not authenticated, redirect to auth
        router.replace(redirectTo);
      } else if (!requireButh && isAuthenticated) {
        // User is authenticated but trying to access auth screens
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, requireButh, redirectTo]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-800">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Show nothing while redirecting
  if ((requireButh && !isAuthenticated) || (!requireButh && isAuthenticated)) {
    return null;
  }


  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const tabBarBackground = isDark ? '#1f2937' : '#1f2937';

  return <SafeAreaView style={{ flex: 1 }}>
    <View style={{ backgroundColor: tabBarBackground, position: "absolute", bottom: 0, left: 0, right: 0, height: 40 }}></View>
    {children}
  </SafeAreaView>;
}
