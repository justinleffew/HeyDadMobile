import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export function useProfileAccess() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isPowerDad, setIsPowerDad] = useState(false);
  const [videosRemaining, setVideosRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionInterval, setSubscriptionInterval] = useState('');
  const [isStripe, setIsStripe] = useState(false);

  const fetchSubscription = useCallback(async (uid: string) => {
    if (!uid) return null;
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, interval, current_period_end, created_at, stripe_subscription_id')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest subscription:', error);
      return null;
    }
    if (data?.status) {
      setHasSubscription(data.status === 'active');
      setSubscriptionInterval(data.interval || '');
      setIsStripe(!!data.stripe_subscription_id);
    } else {
      setHasSubscription(false);
      setSubscriptionInterval('');
      setIsStripe(false);
    }
    return data;
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    if (!uid) return;
    const { data } = await supabase
      .from('profiles')
      .select('has_access,is_power_dad,videos_remaining')
      .eq('id', uid)
      .maybeSingle();

    setHasAccess(data?.has_access ?? false);
    setVideosRemaining(data?.videos_remaining ?? 0);
    setIsPowerDad(data?.is_power_dad ?? false);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error('No auth user');
        setUserId(session.user.id);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    fetchSubscription(userId);
    loadProfile(userId);

    const interval = setInterval(() => {
      fetchSubscription(userId);
      loadProfile(userId);
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, fetchSubscription, loadProfile]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profiles_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setHasAccess(payload.new.has_access ?? false);
            setVideosRemaining(payload.new.videos_remaining ?? 0);
            setIsPowerDad(payload.new.is_power_dad ?? false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isStripe, hasAccess, videosRemaining, isPowerDad, loading, hasSubscription, subscriptionInterval };
}
