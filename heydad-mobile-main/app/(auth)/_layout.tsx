import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../providers/ThemeProvider';
import { initNotifications, scheduleWeeklyPrompt, registerPushTokenForUser, markUserActive } from '../../utils/notifications'
import { supabase } from "../../utils/supabase"

export default function AuthLayout() {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const { colorScheme } = useTheme();
  const [hasProfile, setHasProfile] = useState(false)


  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const { data, error: selectError } = await supabase
            .from("profiles")
            .select("id,email")
            .eq("id", session?.user.id)
            .maybeSingle();

          if (selectError) { console.log('auth layout:', selectError) }

          if (!data?.email) {
            const { error: profileError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: session.user.id,
                  full_name: session.user?.user_metadata?.first_name || "",
                  email: session.user?.email,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "id" }
              );
            if (profileError) {
              console.error("Error creating profile:", profileError);
            } else {
              setHasProfile(true)
              signIn(session?.user);
            }
          } else {
            setHasProfile(true)
            signIn(session?.user);
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const id = session.user.id
          await registerPushTokenForUser(id)
          const ok = await initNotifications();
          //Set user last active
          await markUserActive(id)
          if (ok) {
            await scheduleWeeklyPrompt();
          }
        } catch (e) {
          console.log(e)
        }
      })();
    }

  }, [isAuthenticated, isLoading]);


  useEffect(() => {
    if (!isLoading && isAuthenticated && hasProfile) {
      router.replace('/(tabs)');
    }
  }, [hasProfile, isAuthenticated, isLoading]);

  if (isLoading) {
    return null;
  }

  const backgroundColor = colorScheme === 'dark' ? '#111827' : '#ffffff';
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <>
      <StatusBar style={statusBarStyle} backgroundColor={backgroundColor} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen
          name="sign-in"
          options={{
            title: 'Sign In',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="sign-up"
          options={{
            title: 'Sign Up',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
