import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from 'utils/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  videoCount: number;
  trialStartDate: string;
  showPricingModal: boolean;
  hasAccess: boolean;
  hasName: boolean;
  hasChild: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (user: User) => boolean;
  syncFromSession: () => Promise<boolean>;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
  setShowPricingModal: (loading: boolean) => void;
  setTrialStartDate: (date: string) => void;
  setHasAccess: (hasAccess: boolean) => void;
  setHasChild: (hasChild: boolean) => void;
  setHasName: (hasName: boolean) => void;
  setVideoCount: (count: number) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      trialStartDate: "",
      hasAccess: false,
      showPricingModal: false,
      hasName: false,
      hasChild: false,
      videoCount: 3,
      isAuthenticated: false,
      isLoading: false,
      signIn: (user: User) => {
        set({ isLoading: true });
        try {
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          });

          return true;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },
      syncFromSession: async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return false;
          }

          set({ user: session.user, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return false;
        }
      },
      signOut: () => {
        supabase.auth.signOut().then(() => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        })
      },
      setHasChild: (hasChild) => { set({ hasChild }); },
      setTrialStartDate: (trialStartDate) => {
        set({ trialStartDate });
      },
      setHasAccess: (hasAccess) => {
        set({ hasAccess });
      },
      setHasName: (hasName) => { set({ hasName }); },
      setVideoCount: (videoCount) => { set({ videoCount }); },
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      setShowPricingModal: (value: boolean) => {
        console.log('Setting pricing modal to true')
        set({ showPricingModal: value });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        trialStartDate: state.trialStartDate,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);
