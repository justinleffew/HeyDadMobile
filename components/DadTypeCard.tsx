import { LinearGradient } from 'expo-linear-gradient';
import { deepLinkToSubscriptions } from 'expo-iap';
import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

type DadTypeCardProps = {
  hasAccess: boolean;
  isStripeSubscription: boolean;
  subscriptionType: string;
  isPowerDad: boolean;
  videosRemaining: number | null;
  onStoryPackPress: () => void;
  isDark: boolean;
};

export const DadTypeCard: React.FC<DadTypeCardProps> = ({
  isPowerDad,
  isStripeSubscription,
  subscriptionType,
  videosRemaining,
  onStoryPackPress,
  isDark,
}) => {
  const cardClass = `rounded-xl p-6 mb-4 shadow-sm border ${isDark ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-100'}`;
  const headerText = isPowerDad ? 'Power Dad' : 'Casual Dad';

  const headerColor = isDark ? 'text-gray-100' : 'text-gray-800';

  const badgeBg = isPowerDad
    ? 'bg-amber-500/20 border border-amber-500/50'
    : 'bg-sky-500/15 border border-sky-500/50';

  const badgeText = isPowerDad ? 'Full Access' : 'Limited Access';

  const subTextColor = isDark ? 'text-gray-100' : 'text-gray-800';
  const subTextColor2 = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <View className={`${cardClass} mb-4`}>
      <Text
        className={`font-merriweather text-3xl mb-2 ${headerColor}`}
      >
        {headerText}
      </Text>

      <View className="flex-row items-center mb-2">
        <View className={`px-3 py-1 rounded-full ${badgeBg}`}>
          <Text className={`text-xs font-semibold uppercase tracking-wide ${isPowerDad ? "text-amber-500" : "text-sky-500"}`}>
            {badgeText}
          </Text>
        </View>
      </View>

      <View className="mt-1">
        {isPowerDad ? (
          <>
            <View className="flex-row justify-between items-center">
              <Text className={`font-medium ${subTextColor}`}>
                You’re a Power Dad 💪
              </Text>
              <Text>
                {isPowerDad ?
                  <Text className={`ml-auto mt-1 text-xs font-semibold uppercase tracking-wide ${isPowerDad ? "text-amber-500" : "text-sky-500"}`}>
                    {subscriptionType === "year" ? "Unlimited - Annual" : "Unlimited Monthly"}
                  </Text>
                  : null}
              </Text>

            </View>
            <Text className={`text-sm mt-2 ${subTextColor2}`}>
              Enjoy priority support and extended Hey Dad features.
            </Text>
          </>
        ) : (
          <>
            {videosRemaining ?
              <Text className={`mt-1 ${subTextColor}`}>
                {typeof videosRemaining === 'number'
                  ? `You have ${videosRemaining} stories remaining`
                  : 'Videos remaining: Not set'}
              </Text>
              : <Text className={`mt-1 ${subTextColor}`}>
                You have no stories available. Purchase a story pack here
              </Text>}
            <TouchableOpacity
              onPress={onStoryPackPress}
              accessibilityRole="button"
              className={`my-auto p-3 mt-4 items-center justify-center ${isDark ? "bg-transparent border border-slate-600" : "bg-slate-800"} rounded-full`}>
              <Text className={`text-white font-medium`}>
                Get Story Pack
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {isPowerDad ?
        <TouchableOpacity onPress={() => {
          isStripeSubscription ?
            Linking.openURL("https://billing.stripe.com/p/login/3cI28r4Ja74maTK389aIM00")
            : deepLinkToSubscriptions()
        }}>
          <LinearGradient
            colors={["#D4B996", "#C2A16C", "#D4B996"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ marginTop: 12, paddingTop: 12, paddingBottom: 12, borderRadius: 20 }}
            className="overflow-hidden px-5 rounded-full justify-center items-center"
          >
            <Text className="text-center text-white font-semibold ml-2">Manage Subscription</Text>
          </LinearGradient>
        </TouchableOpacity>
        : null}
    </View>
  );
};
