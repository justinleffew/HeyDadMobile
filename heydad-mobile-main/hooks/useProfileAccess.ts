import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export function useProfileAccess() {
  const [hasAccess, setHasAccess] = useState(false)
  const [isPowerDad, setIsPowerDad] = useState(false)
  const [videosRemaining, setVideosRemaining] = useState(0)
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("")
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscriptionInterval, setSubscriptionInterval] = useState("")
  const [isStripe, setIsStripe] = useState(false)

  const fetchSubscription = async (userId: string) => {
    if (userId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, interval, current_period_end, created_at, stripe_subscription_id")
        .eq("user_id", `${userId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching latest subscription:", error);
        return null;
      }
      if (data?.status) {
        setHasSubscription(data?.status === 'active')
        setSubscriptionInterval(data?.interval)
        setIsStripe(!!data?.stripe_subscription_id)
      }
      return data;
    }
  };

  async function getUserId(): Promise<string | undefined> {
    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) throw new Error("No auth user");
      setUserId(session?.user?.id)
      return session?.user?.id;
    } catch (e) {
      console.log(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getUserId()
  }, [])

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('has_access,is_power_dad,videos_remaining',)
        .eq('id', userId)
        .maybeSingle();

      setHasAccess(data?.has_access ?? null);
      setVideosRemaining(data?.videos_remaining ?? null);
      setIsPowerDad(data?.is_power_dad ?? null);
      setLoading(false);
    };

    fetchSubscription(userId)
    load()

    const interval = setInterval(() => {
      fetchSubscription(userId)
    }, 5000)
    const subInterval = setInterval(load, 5000)
    return () => {
      clearInterval(interval)
      clearInterval(subInterval)
    }
  }, [userId, fetchSubscription]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('profiles_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setHasAccess(payload.new.has_access);
          setVideosRemaining(payload.new.videos_remaining);
          setIsPowerDad(payload.new.is_power_dad);
        }
      )
      .subscribe();
  }, [userId]);

  return { isStripe, hasAccess, videosRemaining, isPowerDad, loading, hasSubscription, subscriptionInterval };
}
