import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'theme-preference';

type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  colorScheme: 'light' | 'dark';
  preference: ThemePreference;
  isLoaded: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
  toggle: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemScheme = (): 'light' | 'dark' => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(getSystemScheme());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system') {
          setPreferenceState(storedPreference);
          setColorScheme(storedPreference === 'system' ? getSystemScheme() : storedPreference);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreference();
  }, []);

  useEffect(() => {
    if (preference !== 'system') {
      return;
    }

    const subscription = Appearance.addChangeListener(({ colorScheme: nextScheme }) => {
      setColorScheme(nextScheme === 'dark' ? 'dark' : 'light');
    });

    return () => subscription.remove();
  }, [preference]);

  const persistPreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    setColorScheme(nextPreference === 'system' ? getSystemScheme() : nextPreference);
  }, []);

  const toggle = useCallback(async () => {
    const nextPreference = colorScheme === 'dark' ? 'light' : 'dark';
    await persistPreference(nextPreference);
  }, [colorScheme, persistPreference]);

  const value = useMemo<ThemeContextValue>(() => ({
    colorScheme,
    preference,
    isLoaded,
    setPreference: persistPreference,
    toggle,
  }), [colorScheme, preference, isLoaded, persistPreference, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
