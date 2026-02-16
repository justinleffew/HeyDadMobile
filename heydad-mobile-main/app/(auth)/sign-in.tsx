import { View, Text, Image, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as AppleAuthentication from 'expo-apple-authentication'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useAuth } from 'hooks/useAuth';
import { supabase } from 'utils/supabase';
import { useTheme } from '../../providers/ThemeProvider';

export default function SignInScreen() {
  // GoogleSignin configured in useEffect below

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, syncFromSession } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "870176413610-odhkv6966mu0net7ff1u885oh8s0qmof.apps.googleusercontent.com",
      iosClientId: "870176413610-b0nq2pnugvk0u89h36tbf12t80vrkrm2.apps.googleusercontent.com"
    });
  }, []);

  const buttonScale = useSharedValue(1);
  const formOpacity = useSharedValue(0);

  useEffect(() => {
    formOpacity.value = withTiming(1, { duration: 800 });
  }, []);

  async function signInWithEmail() {
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      Alert.alert(error.message);
      throw error;
    }
    return user;
  }

  const handleSignIn = async () => {
    try {
      if (!email || !password) return;
      setIsLoading(true);
      buttonScale.value = withSpring(0.95, { duration: 100 });
      setTimeout(() => {
        buttonScale.value = withSpring(1, { duration: 200 });
      }, 100);

      const user = await signInWithEmail();
      if (user) {
        const synced = await syncFromSession();
        if (!synced) {
          signIn(user);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  async function handleGoogleSignIn() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: userInfo.data?.idToken || '', })
      if (error) {
        throw error;
      }

      if (data?.user) {
        const synced = await syncFromSession();
        if (!synced) {
          signIn(data.user);
        }
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
    }
  }

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0f172a' : '#ffffff'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white dark:bg-gray-900"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={formStyle} className="flex-1 justify-center px-6 py-10">
            <View className="mb-12">
              <View className="rounded-xl bg-slate-800 items-center justify-center mx-auto">
                <Image
                  className="w-24 h-24 rounded-2xl justify-center items-center"
                  source={require('../../assets/logo.png')}
                  contentFit="cover"
                  transition={1000}
                />
              </View>
              <Text className="mt-8 text-center font-merriweather text-slate-800 dark:text-slate-100 text-3xl mb-3">
                Welcome back, Dad
              </Text>
              <Text className="text-center text-slate-500 dark:text-slate-300 text-base leading-6">
                Sign in to continue building your legacy
              </Text>
            </View>

            <View className="mb-8">
              <View className="mb-6">
                <Text className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">Email address</Text>
                <View className="relative">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-slate-800 dark:text-slate-100 text-base"
                  />
                  <View className="absolute right-4 top-4">
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={email ? '#3b82f6' : isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">Password</Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-slate-800 dark:text-slate-100 text-base pr-12"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={isDark ? '#94a3b8' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Animated.View style={buttonStyle}>
                <TouchableOpacity
                  onPress={handleSignIn}
                  disabled={isLoading || !email || !password}
                  className={`w-full py-3 rounded-xl flex-row justify-center items-center ${isLoading || !email || !password
                    ? 'bg-gray-300 dark:bg-gray-700'
                    : 'bg-slate-800 dark:bg-slate-700'
                    }`}
                  activeOpacity={0.9}
                >
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <Text className="text-white font-semibold text-base">Signing in...</Text>
                    </View>
                  ) : (
                    <Text className="text-white font-semibold text-base">Sign in</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View className="flex-row items-center mb-8">
              <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <Text className="mx-4 text-gray-500 dark:text-gray-400 text-sm">Or continue with</Text>
              <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </View>

            {Platform.OS === "ios" ?
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={5}
                style={{ width: "100%", height: 44 }}
                onPress={async () => {
                  try {
                    const credential = await AppleAuthentication.signInAsync({
                      requestedScopes: [
                        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication.AppleAuthenticationScope.EMAIL,
                      ],
                    });
                    // signed in
                    if (credential.identityToken) {
                      const {
                        error,
                        data: { user },
                      } = await supabase.auth.signInWithIdToken({
                        provider: 'apple',
                        token: credential.identityToken,
                      })
                      if (!error) {
                        if (credential.fullName) {
                          const nameParts = []
                          if (credential.fullName.givenName) nameParts.push(credential.fullName.givenName)
                          if (credential.fullName.middleName) nameParts.push(credential.fullName.middleName)
                          if (credential.fullName.familyName) nameParts.push(credential.fullName.familyName)
                          const fullName = nameParts.join(' ')
                          await supabase.auth.updateUser({
                            data: {
                              full_name: fullName,
                              given_name: credential.fullName.givenName,
                              family_name: credential.fullName.familyName,
                            }
                          })
                        }
                        if (user) {
                          const synced = await syncFromSession();
                          if (!synced) {
                            signIn(user);
                          }
                        }
                        // User is signed in.
                      }
                    } else {
                      throw new Error('No identityToken.')
                    }

                  } catch (e) {
                    if (e.code === 'ERR_REQUEST_CANCELED') {
                      // handle that the user canceled the sign-in flow
                    } else {
                      // handle other errors
                    }
                  }
                }}
              />
              : null}

            <TouchableOpacity
              onPress={handleGoogleSignIn}
              className="mt-2 w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl flex-row justify-center items-center mb-8"
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color={isDark ? '#e2e8f0' : '#334155'} style={{ marginRight: 12 }} />
              <Text className="text-slate-700 dark:text-slate-200 font-medium text-base">
                Continue with Google
              </Text>
            </TouchableOpacity>

            <View className="mt-2 flex-row justify-center items-center">
              <Text className="text-gray-600 dark:text-gray-300 text-base">Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-slate-600 dark:text-slate-200 font-semibold text-base">Sign up here</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
