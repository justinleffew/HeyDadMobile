import React, { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react'
import { View, Text, Modal, Linking, KeyboardAvoidingView, TouchableOpacity, Platform, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons';
import { useIAP, getReceiptIOS, ErrorCode } from 'expo-iap';
import { useAuth } from 'hooks/useAuth';
import { useProfileAccess } from 'hooks/useProfileAccess';

interface PricingModalProps {
  isOpen: boolean;
  hasSubscription: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showModalRepeatedly: boolean;
  currentPlan: string;
  showGiftModal: () => void
}

interface PricingItemProps {
  id: string;
  title: string;
  type: string;
  hasSubscription: boolean;
  description: string;
  price: string;
  popular?: boolean
  currentPlan?: string
}

const API_BASE_URL = "https://heydad.pro"

export default function(props: PricingModalProps) {
  const { isOpen, setIsOpen, showGiftModal, currentPlan, hasSubscription, showModalRepeatedly } = props
  const { isPowerDad, videosRemaining } = useProfileAccess()

  const { user, trialStartDate, setTrialStartDate } = useAuth()
  const [isTrial, setIsTrial] = useState(true)

  const PRICING_DISMISSED_KEY = "pricingPopupDismissedIfNotPaid";

  const persistDismissal = useCallback(async () => {
    try {
      if (!showModalRepeatedly) {
        await AsyncStorage.setItem(PRICING_DISMISSED_KEY, "true");
      }
    } catch (error) {
      console.warn("Failed to persist onboarding popup dismissal", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (!trialStartDate) { return setIsTrial(true) }
      const createdAt = new Date(user.created_at)
      const now = new Date()
      const diffMs = now.getTime() - createdAt.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) {
        setIsTrial(true)
      } else {
        setIsTrial(false)
      }
    }
  }, [user, trialStartDate])

  const startTrial = useCallback(async () => {
    try {
      if (!trialStartDate) {
        setTrialStartDate(new Date().toISOString())
      }
    } catch (error) {
      console.warn("Failed to set trial start date", error);
    }
  }, []);


  const productIds = ['stories_consumable', 'unlimited_annual', 'unlimited_monthly'];

  const verifyReceiptOnServer = async (purchase: any, userId: string) => {
    try {
      if (Platform.OS !== "ios") {
        console.warn("verifyReceiptOnServer: skipping (not iOS)");
        return false;
      }
      const receiptData = await getReceiptIOS();

      if (!receiptData) {
        console.warn("verifyReceiptOnServer: getReceiptIOS() returned empty");
        return false;
      }
      const productId = purchase?.productId ?? purchase?.sku;


      if (!productId) {
        console.warn("verifyReceiptOnServer: no productId/sku in purchase");
        return false;
      }

      const res = await fetch(`${API_BASE_URL}/api/validate-payment-apple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          receiptData,
          productId,
        }),
      });

      const json = await res.json();
      console.log("Apple validatePayment response:", json);

      if (!res.ok) {
        console.warn("Server returned non-200 for validatePayment");
        return false;
      }

      return json?.success === true;
    } catch (err) {
      console.error("Error calling /api/validatePayment:", err);
      return false;
    }
  };

  const {
    connected,
    products,
    fetchProducts,
    subscriptions,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const userId = user?.id
      try {
        console.log("Purchase successful:", purchase);

        if (!userId) {
          console.warn("No userId available, cannot validate purchase");
          return;
        }

        const productId = purchase?.productId ?? purchase?.sku;

        const isValid = await verifyReceiptOnServer(purchase, userId);

        if (!isValid) {
          console.warn("Receipt invalid or server rejected purchase");
          return;
        }
        const isConsumable = productId === "stories_consumable";

        await finishTransaction({
          purchase,
          isConsumable,
        });

        console.log("Transaction finished for", productId);
        setIsOpen(false)
      } catch (err) {
        console.error("Error handling purchase:", err);
      }
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) {
        // User cancelled the purchase
        // Don't show error message, just continue
        return;
      }
    },
  });

  useEffect(() => {
    if (connected) {
      fetchProducts({ skus: productIds, type: 'all' });
    }
  }, [connected, fetchProducts]);

  const purchaseSubscription = async (productId: string) => {
    if (!connected) {
      Alert.alert('Error', 'Store not connected');
      return;
    }

    try {
      const subscription = subscriptions.find((sub) => sub.id === productId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      console.log('Requesting purchase', productId)
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
        type: 'subs',
      });
    } catch (error) {
      if (error.code === ErrorCode.UserCancelled) {
        // User cancelled the purchase
        // Don't show error message, just continue
        return;
      }
      console.error('Purchase failed:', error);
      Alert.alert('Error', 'Failed to purchase subscription');
    }
  };

  const purchaseStories = async () => {
    try {
      await requestPurchase({
        request: {
          ios: {
            sku: 'stories_consumable',
            quantity: 1,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
        type: 'in-app',
      });

    } catch (e) {
      if (e.code === ErrorCode.UserCancelled) {
        // User cancelled the purchase
        // Don't show error message, just continue
        return;
      }
      console.log(e)
    }
  }


  const PricingItem = ({ id, hasSubscription, title, description, price, popular, type, currentPlan: itemCurrentPlan }: PricingItemProps) => {

    const isCurrentSubAnnual = hasSubscription && itemCurrentPlan === "year"
    const isAnnualIAP = id === "unlimited_annual"
    // Unlimited stories for 30 days. No credit card needed. 
    const titleMap = {
      "Unlimited - Monthly": {
        title: "Unlimited Monthly (Best Value)",
        description: "Record as many stories as you want. Cancel anytime and continue viewing what you paid for",
        price: "$4.99 / month"
      },
      "20 Stories": {
        title: "Pay As You Go",
        description: "20 permanent stories. You and your kids own them forever. No monthly fees.",
        price: "$29.99 / 20 stories"
      }
    }
    return <TouchableOpacity
      onPress={() => type === "subs" ? purchaseSubscription(id) : purchaseStories()}
      className="mt-2">
      <View className="relative bg-slate-900 w-full rounded-md p-3 border border-[#D4B996]/50">
        {hasSubscription && isCurrentSubAnnual && isAnnualIAP && type === "subs" ?
          <View style={{ flexGrow: 0, marginTop: 4, marginRight: "auto", borderRadius: 8 }} className="mb-3 grow-0 p-1 px-2 bg-green-500 items-center justify-center">
            <Text className="font-medium text-white text-xs tracking-[0.15em] uppercase">Active</Text>
          </View>
          : popular ?
            <View style={{ borderRadius: 8 }} className="p-1 px-2 absolute right-2 top-2 bg-[#D4B996] items-center justify-center">
              <Text className="font-medium text-white text-xs tracking-[0.15em] uppercase">Most Popular</Text>
            </View>
            : null}

        {hasSubscription && !isCurrentSubAnnual && !isAnnualIAP && type === "subs" ?
          <View style={{ flexGrow: 0, marginTop: 4, marginRight: "auto", borderRadius: 8 }} className="mb-3 grow-0 p-1 px-2 bg-green-500 items-center justify-center">
            <Text className="font-medium text-white text-xs tracking-[0.15em] uppercase">Active</Text>
          </View>
          : null}

        <Text className="text-xl font-bold font-merriweather text-[#D4B996] ">{titleMap[title]?.title ?? `${title}`}</Text>
        <Text className="mt-2 font-medium text-white ">{titleMap[title]?.price ?? price}</Text>
        <Text className="mt-2 text-sm font-medium text-slate-400">{titleMap[title]?.description ?? description}</Text>
        {hasSubscription && isCurrentSubAnnual && isAnnualIAP && type === "subs" ?
          <View style={{ flexGrow: 0, marginTop: 4, marginRight: "auto", borderRadius: 8 }} className="mb-3 grow-0 p-1 px-2 bg-green-500 items-center justify-center">
            <Text className="font-medium text-white text-xs tracking-[0.15em] uppercase">Active</Text>
          </View>
          : null}
      </View>
    </TouchableOpacity>
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={showGiftModal}>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ alignItems: "center", justifyContent: "center" }}
          className="flex-1 justify-center items-center">
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={() => setIsOpen(false)}
          />
          <View style={{ width: "95%" }} className="absolute rounded-3xl min-h-2/3 bg-slate-800 p-6 shadow-2xl">
            <TouchableOpacity onPress={() => {
              setIsOpen(false)
              persistDismissal()
            }
            } className="rounded-full w-8 h-8 ml-auto bg-gray-100 p-2 dark:bg-gray-800" accessibilityLabel="Close email sign up">
              <Ionicons name="close" size={14} color="#0f172a" />
            </TouchableOpacity>


            <View className="mt-6 flex-row items-center justify-between">
              <View>
                <Text className="text-3xl font-bold font-merriweather text-white text-center">Start Building Your Legacy Now</Text>
                {!trialStartDate && (!isPowerDad && !videosRemaining) ?
                  <TouchableOpacity
                    onPress={() => {
                      startTrial()
                      persistDismissal()
                      Alert.alert(
                        'Trial has started',
                        'Enjoy 30 days of unlimited Hey Dad stories!',
                      );
                      setIsOpen(false)
                    }}
                    className="mt-6">
                    <View className="relative bg-slate-900 w-full rounded-md p-3 border border-[#D4B996]/50">
                      <Text className="text-xl font-bold font-merriweather text-[#D4B996] ">Start Recording Free</Text>
                      <Text className="mt-1 text-sm font-medium text-slate-400">Unlimited stories for 30 days. No credit card needed. </Text>
                    </View>
                  </TouchableOpacity>
                  : null}

                <Text className="text-xl font-bold font-merriweather text-white mt-6 mb-2">Available Premium Plans</Text>
                {subscriptions.filter((s) => s.title !== "Unlimited - Annual").reverse().map((sub) => {
                  return <PricingItem
                    key={sub.id}
                    hasSubscription={hasSubscription}
                    id={sub.id}
                    currentPlan={currentPlan}
                    type={sub.type}
                    popular={sub.title === "Unlimited - Annual"}
                    title={sub.title}
                    description={sub.description}
                    price={sub.displayPrice} />
                })}

                {products.map((product) => {
                  return <PricingItem
                    key={product.id}
                    id={product.id}
                    currentPlan={currentPlan}
                    hasSubscription={hasSubscription}
                    type={product.type}
                    title={product.title}
                    description={product.description}
                    price={product.displayPrice} />
                })}

                <View className="flex-row mt-3 items-center">
                  <TouchableOpacity
                    hitSlop={30}
                    onPress={() => Linking.openURL('https://heydad.pro/terms')}>
                    <Text className="text-white/90 text-xs underline underline-offset-2 decoration-white/40">
                      Terms of Use
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity hitSlop={30} style={{ marginLeft: 8 }} onPress={() => Linking.openURL('https://heydad.pro/privacy')}>
                    <Text className="text-white/90 text-xs underline underline-offset-2 decoration-white/40">
                      Privacy Policy
                    </Text>
                  </TouchableOpacity>

                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

  )
}
