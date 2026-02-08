import { View, Image, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { useState } from 'react';
import { Link, router } from 'expo-router';
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

export default function SignUpScreen() {
  GoogleSignin.configure({
    webClientId: "870176413610-odhkv6966mu0net7ff1u885oh8s0qmof.apps.googleusercontent.com",
    iosClientId: "870176413610-b0nq2pnugvk0u89h36tbf12t80vrkrm2.apps.googleusercontent.com"
  })

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const { signIn } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const buttonScale = useSharedValue(1);
  const formOpacity = useSharedValue(0);

  useState(() => {
    formOpacity.value = withTiming(1, { duration: 800 });
  });

  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = email && isPasswordValid && doPasswordsMatch;

  const handleSignUp = async () => {
    try {
      if (!isFormValid) return;
      setIsLoading(true);
      buttonScale.value = withSpring(0.95, { duration: 100 });
      setTimeout(() => {
        buttonScale.value = withSpring(1, { duration: 200 });
      }, 100);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error) {
        console.log('No error!')
        signIn(data?.user!)
      }
      else {
        console.log('An error occurred', error)
      }
      return { data, error };
    } catch (e) {
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  };

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  async function handleGoogleSignIn() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: userInfo.data.idToken, })
    } catch (error) {
      console.error('Google Sign-In Error:', error);
    }
  }

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
          <Animated.View style={formStyle} className="flex-1 justify-center px-6 py-8">
            <View className="mb-4">

              <View className="rounded-xl bg-slate-800 items-center justify-center mx-auto">
                <Image
                  className="w-24 h-24 rounded-2xl justify-center items-center"
                  source={require('../../assets/logo.png')}
                  contentFit="cover"
                  transition={1000}
                />
              </View>

              <Text className="mt-8 text-center font-merriweather text-slate-800 dark:text-slate-100 text-3xl mb-3">
                Start recording the moments that matter
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleGoogleSignIn}
              className="mt-2 w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl flex-row justify-center items-center mb-6"
              activeOpacity={0.7}
            >
              <View className="w-5 h-5 mr-3">
                <Image
                  className="w-5 h-5"
                  source={{
                    uri: 'https://image.similarpng.com/file/similarpng/very-thumbnail/2020/06/Logo-google-icon-PNG.png',
                  }}
                />
              </View>
              <Text className="text-slate-700 dark:text-slate-200 font-medium text-base">Continue with Google</Text>
            </TouchableOpacity>

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
                      }
                    } else {
                      throw new Error('No identityToken.')
                    }

                  } catch (e) {
                    console.log(e)
                  }
                }}
              />
              : null}


            <View className="mt-3 flex-row items-center mb-6">
              <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <Text className="mx-4 text-gray-500 dark:text-gray-400 text-sm">Or sign up with email</Text>
              <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </View>

            <View className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 dark:border-gray-700 dark:bg-gray-800/60">
              <Text className="text-slate-800 dark:text-slate-100 text-lg font-semibold mb-2">Sign up with Email</Text>
              <Text className="text-gray-500 dark:text-gray-300 text-sm mb-4">
                Sign up for a Hey Dad account using email and password
              </Text>
              <TouchableOpacity
                onPress={() => setShowEmailModal(true)}
                activeOpacity={0.85}
                className="w-full flex-row items-center justify-between rounded-xl bg-slate-800 px-4 py-3 dark:bg-slate-700"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-white/10 p-2">
                    <Ionicons name="mail-outline" size={18} color="#ffffff" />
                  </View>
                  <Text className="text-white text-base font-semibold">Continue with email</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-center items-center">
              <Text className="text-gray-600 dark:text-gray-300 text-base">Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-slate-600 dark:text-slate-200 font-semibold text-base">Sign in here</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {showEmailModal ? <View className="bg-black/40 absolute inset-0"></View> : null}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}>


        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-1 justify-end">
            <TouchableOpacity
              activeOpacity={1}
              className="flex-1"
              onPress={() => setShowEmailModal(false)}
            />
            <View className="rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-semibold text-slate-800 dark:text-slate-100">Create your account</Text>
                <TouchableOpacity onPress={() => setShowEmailModal(false)} className="rounded-full bg-gray-100 p-2 dark:bg-gray-800" accessibilityLabel="Close email sign up">
                  <Ionicons name="close" size={18} color={isDark ? '#e2e8f0' : '#0f172a'} />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
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

              <View className="mb-4">
                <Text className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">Password</Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password"
                    placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-slate-800 dark:text-slate-100 text-base pr-12 ${password && !isPasswordValid ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      }`}
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
                {password && !isPasswordValid ? (
                  <Text className="text-red-500 text-xs mt-1">Password must be at least 8 characters</Text>
                ) : null}
              </View>

              <View className="mb-6">
                <Text className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">Confirm Password</Text>
                <View className="relative">
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-slate-800 dark:text-slate-100 text-base pr-12 ${confirmPassword && !doPasswordsMatch ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      }`}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-4"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={isDark ? '#94a3b8' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword && !doPasswordsMatch ? (
                  <Text className="text-red-500 text-xs mt-1">Passwords don't match</Text>
                ) : null}
              </View>

              <Animated.View style={buttonStyle}>
                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={!isFormValid || isLoading}
                  className={`w-full py-3 rounded-xl flex-row justify-center items-center ${!isFormValid || isLoading
                    ? 'bg-gray-300 dark:bg-gray-700'
                    : 'bg-slate-800 dark:bg-slate-700'
                    }`}
                  activeOpacity={0.9}
                >
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <Text className="text-white font-semibold text-base">Creating account...</Text>
                    </View>
                  ) : (
                    <Text className="text-white font-semibold text-base">Sign up</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
