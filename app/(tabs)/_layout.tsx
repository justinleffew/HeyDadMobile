import { useEffect, useState } from "react"
import { Alert } from 'react-native'
import { Tabs, useSegments, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../hooks/useAuth.ts';
import { useProfileAccess } from 'hooks/useProfileAccess';

export default function TabLayout() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [isTrial, setIsTrial] = useState(true)
  const segments = useSegments()
  const router = useRouter()

  const tabBarBackground = isDark ? '#1f2937' : '#ffffff';
  const statusBarStyle = isDark ? 'light' : 'dark';

  const { user, trialStartDate, setShowPricingModal } = useAuth()
  const { isPowerDad, videosRemaining, hasSubscription } = useProfileAccess()

  useEffect(() => {
    if (user) {
      if (!trialStartDate) { return setIsTrial(true) }
      const createdAt = new Date(trialStartDate)
      const now = new Date()
      const diffMs = now.getTime() - createdAt.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) {
        console.log('_layout.tsx: jetting isTrial to true', diffDays)
        setIsTrial(true)
      } else {
        console.log('_layout.tsx: Setting isTrial to false')
        setIsTrial(false)
      }
    }
  }, [user, trialStartDate])

  useEffect(() => {
    const isSubscribed = hasSubscription || isPowerDad
    const createdAt = new Date(trialStartDate)
    const now = new Date()
    const diffMs = now - createdAt
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const isTrialActive = !!trialStartDate && diffDays <= 30

    if (!isTrialActive && !isSubscribed && !videosRemaining) {
      const inTabsGroup = segments[0] === '(tabs)'
      if (inTabsGroup && segments.length > 1) {
        if (trialStartDate) {
          Alert.alert(`Trial period has ended`, 'Purchase a story pack or a Hey Dad Subscription to continue using Hey Dad', [
            {
              text: 'Upgrade to Premium',
              onPress: () => {
                console.log('Premium upgrade pressed');
                setShowPricingModal(true)
              },
            },
            {
              text: 'Dismiss',
              style: 'cancel',
            },
          ])
        } else {
          Alert.alert(
            'Unlock More Stories',
            'Start a free trial, purchase a story pack or a Hey Dad Subscription to continue using Hey Dad',
            [
              {
                text: 'Start Trial',
                onPress: () => {
                  console.log('Start Trial pressed');
                  setShowPricingModal(true)
                },
              },
              {
                text: 'Dismiss',
                style: 'cancel',
              },
            ],
            { cancelable: true }
          );
        }
        router.replace('(tabs)/')
      }
    }
  }, [segments, isTrial, user, hasSubscription, isPowerDad, videosRemaining, trialStartDate])

  return (
    <ProtectedRoute requireAuth={true}>
      <StatusBar style={statusBarStyle} backgroundColor={tabBarBackground} />
      <Tabs
        screenOptions={{
          popToTopOnBlur: true,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabBarBackground,
            borderTopColor: 'transparent',
            borderTopWidth: 1,
            height: 60,
            paddingTop: 8,
            paddingBottom: 16,
          },
          tabBarActiveTintColor: '#c4a471',
          tabBarInactiveTintColor: isDark ? '#cbd5f5' : '#94a3b8',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="memories"
          options={{
            title: 'Dad Stories',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="saythis"
          options={{
            title: 'Dad Chat',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="children"
          options={{
            title: 'Children',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
