import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Switch, Alert, Modal, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from 'hooks/useAuth';
import { supabase } from 'utils/supabase';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useProfileAccess } from 'hooks/useProfileAccess';
import { DadTypeCard } from 'components/DadTypeCard';
import PricingModal from 'components/PricingModal';

const DARK_BACKGROUND = '#1f2937';

const getTrackColor = (isDark: boolean) => ({ false: isDark ? '#374151' : '#F3F4F6', true: '#10B981' });

const getThumbColor = (isDark: boolean) => (isDark ? '#f9fafb' : '#ffffff');

const SettingsScreen = () => {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();
  const { hasAccess, isPowerDad, videosRemaining, hasSubscription, isStripe, subscriptionInterval, } = useProfileAccess()
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [profile, setProfile] = useState({
    email: '',
    full_name: '',
    phone: '',
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    child_requests: true,
    video_reminders: true,
  });

  const { user, setHasName } = useAuth();
  const { colorScheme, setPreference, preference } = useTheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#d1d5db' : '#6B7280';

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserSettings();
    }
  }, [user]);

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return `(${phoneNumber}`;
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setProfile({ ...profile, phone: formatted });
    if (formatted && !validatePhone(formatted)) {
      setFieldErrors({ ...fieldErrors, phone: 'Please enter a valid phone number' });
    } else {
      setFieldErrors({ ...fieldErrors, phone: '' });
    }
  };

  const validatePhoneBeforeSave = () => {
    if (profile.phone && !validatePhone(profile.phone)) {
      setFieldErrors((prev) => ({ ...prev, phone: 'Please enter a valid phone number' }));
      return false;
    }

    setFieldErrors((prev) => ({ ...prev, phone: '' }));
    return true;
  };

  const listAllFiles = async (bucket: string, prefix: string) => {
    const allFiles: string[] = [];
    const pageSize = 100;
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });

      if (error) {
        console.warn(`Error listing files for ${bucket}:`, error);
        break;
      }

      const files = (data || []).filter((item: any) => !!item.name).map((item: any) => `${prefix}/${item.name}`);
      allFiles.push(...files);

      if (!data || data.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return allFiles;
  };

  const removeFilesInBatches = async (bucket: string, paths: string[]) => {
    const batchSize = 100;

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      if (!batch.length) continue;

      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) {
        console.warn(`Error deleting files from ${bucket}:`, error);
      }
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { data, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (subscriptionError) throw subscriptionError;

      const res = await fetch(
        `https://heydad.pro/api/cancel-subscription?id=${(data as any).stripe_subscription_id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw Error('Cancel subscription failed');
    } catch (e) {
      console.error('Error updating subscription:', e);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);

      const storageBuckets = ['videos', 'narrations', 'child-images'];

      for (const bucket of storageBuckets) {
        const filePaths = await listAllFiles(bucket, user!.id);
        if (filePaths.length > 0) {
          await removeFilesInBatches(bucket, filePaths);
        }
      }

      if (isPowerDad) {
        await handleCancelSubscription();
      }

      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;

      await supabase.auth.signOut();
      signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const userEmail = user?.email || '';
      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (data) {
        setProfile({
          email: userEmail,
          full_name: (data as any).full_name || '',
          phone: (data as any).phone || '',
        });
        const nameParts = (data as any).full_name?.split(' ') || [];
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      } else {
        setProfile({ email: userEmail, phone: '' });
        const nameParts = userName.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
        if (userName) {
          try {
            await supabase.from('profiles').upsert({
              id: user!.id,
              full_name: userName,
              phone: '',
              updated_at: new Date().toISOString(),
            });
            setHasName(true);
          } catch (error) {
            console.log('Could not create new profile data', error);
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile({ email: user?.email || '', phone: '' });
      const nameParts = (user?.user_metadata?.full_name || user?.user_metadata?.name || '').split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }
  };

  const changePassword = async () => {
    if (!user?.email) {
      setMessage('Unable to verify your account right now. Please sign in again.');
      return;
    }

    if (!passwordData.currentPassword) {
      setMessage('Current password is required.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });

      if (reauthError) {
        setMessage('Current password is incorrect.');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      if (error) throw error;

      setMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage('Error changing password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setNotifications({
          email_notifications: (data as any).email_notifications ?? true,
          push_notifications: (data as any).push_notifications ?? true,
          child_requests: (data as any).child_requests ?? true,
          video_reminders: (data as any).video_reminders ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveProfile = async () => {
    setMessage('');
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      console.log('saveProfile: fullName', fullName)
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { first_name: firstName, full_name: fullName },
      });
      if (updateUserError) throw updateUserError;
      console.log('saveProfile: updated user name')

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .upsert({
          id: user!.id,
          full_name: fullName,
          phone: profile.phone,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (updateProfileError) throw updateProfileError;
      console.log('saveProfile: saved fullName', fullName)

      await loadUserProfile();
    } catch (error) {
      console.error('Error in saveProfile:', error);
      if (!message.includes('successfully')) {
        setMessage('Error updating profile. Please try again.');
      }
    }
  };

  const saveNotificationSettings = async () => {
    setMessage('');
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: user!.id,
        ...notifications,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;
  };

  const saveAllSettings = async () => {
    try {
      if (!validatePhoneBeforeSave()) {
        return;
      }

      setLoading(true);
      await Promise.all([saveNotificationSettings(), saveProfile()]);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = async (value: boolean) => {
    try {
      await setPreference(value ? 'dark' : 'light');
    } catch (error) {
      Alert.alert('Theme', 'Unable to update theme preference. Please try again.');
      console.error('Error setting theme preference', error);
    }
  };

  const handleMatchSystem = async () => {
    try {
      await setPreference('system');
    } catch (error) {
      Alert.alert('Theme', 'Unable to match system theme right now.');
      console.error('Error setting system theme preference', error);
    }
  };

  const BASE_URL = "https://heydad.pro"
  const [giftCode, setGiftCode] = useState("")
  const [giftCodeStatus, setGiftCodeStatus] = useState("checking");
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)

  const cardClass = `rounded-xl p-6 mb-4 shadow-sm border ${isDark ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-100'}`;
  const sectionTitleClass = `text-lg font-merriweather ml-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`;
  const labelClass = `text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`;
  const inputClass = `border rounded-lg px-4 py-3 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`;
  const helperTextClass = `text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;
  const bodyTextClass = `${isDark ? 'text-gray-100' : 'text-gray-800'}`;
  const subTextClass = `text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? DARK_BACKGROUND : '#1e293b'} />
      <ScrollView
        stickyHeaderIndices={[0]}
        className="flex-1 px-4 mt-6">
        <View className={`${cardClass} mt-0 mb-4`}>
          <Text className={`font-merriweather text-3xl mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Settings</Text>
          <Text className={`${subTextClass} font-semibold text-base mb-4 leading-5`}>
            Manage your account, notifications, and privacy preferences.
          </Text>
          <TouchableOpacity
            onPress={saveAllSettings}
            className="bg-green-600 rounded-lg py-3 px-4 flex-row items-center justify-center"
          >
            <Feather name="save" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Save All Settings</Text>
          </TouchableOpacity>
        </View>

        <DadTypeCard
          onStoryPackPress={() => {
            setShowPricingModal(true)
          }}
          isStripeSubscription={isStripe}
          subscriptionType={subscriptionInterval}
          hasAccess={!!hasAccess}
          isPowerDad={isPowerDad}
          videosRemaining={videosRemaining} isDark={isDark} />


        <View className={cardClass}>
          <View className="flex-row items-center mb-4">
            <Feather name="moon" size={20} color={iconColor} />
            <Text className={sectionTitleClass}>Appearance</Text>
          </View>

          <View className={`flex-row justify-between items-center pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <View className="flex-1 pr-4">
              <Text className={`${bodyTextClass} font-medium`}>Dark Mode</Text>
              <Text className={`${subTextClass}`}>Toggle the HeyDad dark theme</Text>
            </View>
            <Switch
              value={colorScheme === 'dark'}
              onValueChange={handleThemeToggle}
              trackColor={getTrackColor(isDark)}
              thumbColor={getThumbColor(isDark)}
            />
          </View>

          <TouchableOpacity className="flex-row items-center justify-between pt-4" onPress={handleMatchSystem}>
            <View className="flex-1 pr-4">
              <Text className={`${bodyTextClass} font-medium`}>Match device settings</Text>
              <Text className={subTextClass}>
                {preference === 'system'
                  ? 'Currently following your device theme.'
                  : 'Switch to your device theme automatically.'}
              </Text>
            </View>
            <Feather name="smartphone" size={18} color={iconColor} />
          </TouchableOpacity>
        </View>

        <View className={cardClass}>
          <View className="flex-row items-center mb-4">
            <Feather name="user" size={20} color={iconColor} />
            <Text className={sectionTitleClass}>Profile Information</Text>
          </View>

          <View className="mb-4">
            <Text className={labelClass}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor="#9CA3AF"
              className={inputClass}
            />
          </View>

          <View className="mb-4">
            <Text className={labelClass}>Last Name</Text>
            <TextInput
              placeholder="Enter your last name"
              placeholderTextColor="#9CA3AF"
              value={lastName}
              onChangeText={setLastName}
              className={inputClass}
            />
          </View>

          <View className="mb-4">
            <Text className={labelClass}>Email Address</Text>
            <TextInput
              defaultValue={user?.email}
              className={`border rounded-lg px-4 py-3 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-300 border-gray-200 text-gray-600'}`}
              editable={false}
            />
            <Text className={helperTextClass}>Contact support if you need to change your email</Text>
          </View>

          <View>
            <Text className={labelClass}>Phone Number</Text>
            <TextInput
              placeholder="(xxx) xxx-xxxx"
              className={inputClass}
              placeholderTextColor="#9CA3AF"
              value={profile.phone}
              onChangeText={handlePhoneChange}
            />
            {fieldErrors.phone ? <Text className="text-red-400 text-xs mt-1">{fieldErrors.phone}</Text> : null}
          </View>
        </View>

        {user && user.app_metadata.provider === 'email' ? (
          <View className={cardClass}>
            <View className="flex-row items-center mb-4">
              <Feather name="shield" size={20} color={iconColor} />
              <Text className={sectionTitleClass}>Security</Text>
            </View>

            <View className="mb-4">
              <Text className={labelClass}>Current Password</Text>
              <TextInput
                secureTextEntry
                value={passwordData.currentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                className={inputClass}
                onChangeText={(currentPassword) =>
                  setPasswordData({ ...passwordData, currentPassword })
                }
              />
            </View>

            <View className="mb-4">
              <Text className={labelClass}>New Password</Text>
              <TextInput
                secureTextEntry
                value={passwordData.newPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                onChangeText={(newPassword) => {
                  setPasswordData({ ...passwordData, newPassword });
                  if (newPassword !== passwordData.confirmPassword) {
                    setPasswordError('Passwords do not match');
                  } else {
                    setPasswordError('');
                  }
                }}
                className={inputClass}
              />
            </View>

            <View className="mb-4">
              <Text className={labelClass}>Confirm New Password</Text>
              <TextInput
                secureTextEntry
                value={passwordData.confirmPassword}
                placeholder="Confirm new password"
                className={inputClass}
                onChangeText={(confirmPassword) => {
                  setPasswordData({ ...passwordData, confirmPassword });
                  if (confirmPassword !== passwordData.newPassword) {
                    setPasswordError('Passwords do not match');
                  } else {
                    setPasswordError('');
                  }
                }}
                placeholderTextColor="#9CA3AF"
              />
              {passwordError ? <Text className="text-red-400 text-xs mt-1">{passwordError}</Text> : null}
            </View>

            <TouchableOpacity
              disabled={loading || !!passwordError || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword.length < 8 || !passwordData.confirmPassword}
              onPress={changePassword}
              className={`bg-green-600 rounded-lg py-3 px-4 flex-row items-center justify-center ${loading || !!passwordError || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword.length < 8 || !passwordData.confirmPassword ? 'opacity-80' : ''
                }`}
            >
              <Feather name="save" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Save Password</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View className={cardClass}>
          <View className="flex-row items-center mb-4">
            <Feather name="bell" size={20} color={iconColor} />
            <Text className={sectionTitleClass}>Notification Preferences</Text>
          </View>

          <View className={`flex-row justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <View className="flex-row items-center flex-1">
              <Feather name="bell" size={16} color={iconColor} />
              <View className="ml-3 flex-1">
                <Text className={`${bodyTextClass} font-medium`}>Email Notifications</Text>
                <Text className={subTextClass}>Receive updates via email</Text>
              </View>
            </View>
            <Switch
              value={notifications.email_notifications}
              onValueChange={(value) => {
                setNotifications({ ...notifications, email_notifications: value });
              }}
              trackColor={getTrackColor(isDark)}
              thumbColor={getThumbColor(isDark)}
            />
          </View>

          <View className={`flex-row justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <View className="flex-row items-center flex-1">
              <Feather name="user" size={16} color={iconColor} />
              <View className="ml-3 flex-1">
                <Text className={`${bodyTextClass} font-medium`}>Child Requests</Text>
                <Text className={subTextClass}>Get notified when your children send requests</Text>
              </View>
            </View>
            <Switch
              value={notifications.child_requests}
              onValueChange={(value) => {
                setNotifications({ ...notifications, child_requests: value });
              }}
              trackColor={getTrackColor(isDark)}
              thumbColor={getThumbColor(isDark)}
            />
          </View>

          <View className="flex-row justify-between items-center py-3">
            <View className="flex-row items-center flex-1">
              <Feather name="video" size={16} color={iconColor} />
              <View className="ml-3 flex-1">
                <Text className={`${bodyTextClass} font-medium`}>Video Reminders</Text>
                <Text className={subTextClass}>Reminders to create new legacy videos</Text>
              </View>
            </View>
            <Switch
              value={notifications.video_reminders}
              onValueChange={(value) => {
                setNotifications({ ...notifications, video_reminders: value });
              }}
              trackColor={getTrackColor(isDark)}
              thumbColor={getThumbColor(isDark)}
            />
          </View>
        </View>

        <View className={cardClass}>
          <View className="flex-row items-center mb-4">
            <Feather name="info" size={20} color={iconColor} />
            <Text className={sectionTitleClass}>Privacy Policy & Terms</Text>
          </View>

          <TouchableOpacity className="flex-row items-center justify-between pt-4"
            onPress={() => Linking.openURL('https://heydad.pro/privacy')}
          >
            <View className="flex-1 pr-4">
              <Text className={`mb-1 ${bodyTextClass} font-medium`}>Privacy Policy</Text>
              <Text className={subTextClass}>Our privacy policy explains how we use and protect your personal information.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://heydad.pro/terms')}
            className="flex-row items-center justify-between pt-4"
          >
            <View className="flex-1 pr-4">
              <Text className={`${bodyTextClass} font-medium`}>Terms</Text>
              <Text className={subTextClass}>Our terms of use outline the rules and guidelines for using the Hey Dad app</Text>
            </View>
          </TouchableOpacity>



        </View>


        <View className={`${cardClass} mb-6`}>
          <View className="flex-row items-center mb-4">
            <Feather name="database" size={20} color={iconColor} />
            <Text className={sectionTitleClass}>Data Management</Text>
          </View>

          <View
            className={`rounded-lg p-4 border ${isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'
              }`}
          >
            <Text className={`${isDark ? 'text-red-300' : 'text-red-800'} font-semibold mb-2`}>Delete Account</Text>
            <Text className={`${isDark ? 'text-red-200' : 'text-red-700'} text-sm mb-3`}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </Text>

            <View className="flex-row items-center mb-3">
              <TouchableOpacity hitSlop={24} onPress={() => setDeleteConfirm(!deleteConfirm)} className="mr-3">
                <View
                  className={`w-4 h-4 items-center justify-center border-2 border-red-500 ${deleteConfirm ? 'bg-red-500' : isDark ? 'bg-gray-900' : 'bg-white'
                    }`}
                >
                  {deleteConfirm && <Feather name="check" size={12} color="white" />}
                </View>
              </TouchableOpacity>
              <Text className={`${isDark ? 'text-red-200' : 'text-red-700'} text-sm flex-1`}>
                I understand that this action cannot be undone
              </Text>
            </View>

            <TouchableOpacity
              disabled={!deleteConfirm}
              className={`rounded-lg py-4 px-4 ${deleteConfirm ? 'bg-red-600' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                }`}
              onPress={handleDeleteAccount}
            >
              <Text
                className={`text-center font-semibold ${deleteConfirm ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}
              >
                Delete Account
              </Text>
            </TouchableOpacity>

            <Text className={helperTextClass}>
              You must maintain an active subscription to access your videos.{'\n'}
              Canceling your membership will lock existing stories.
            </Text>
          </View>

          <TouchableOpacity onPress={signOut} className="bg-green-600 mt-4 rounded-lg py-4 px-4">
            <Text className="text-center font-semibold text-white">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PricingModal
        isOpen={showPricingModal}
        setIsOpen={setShowPricingModal}
        showGiftModal={() => setShowGiftModal(true)}
      />
    </SafeAreaView>
  );
};

export default SettingsScreen;
