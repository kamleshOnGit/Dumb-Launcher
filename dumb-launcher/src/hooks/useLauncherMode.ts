import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Mode = 'Focus' | 'Productive' | 'Relax';

export type PeekTarget = 'productive' | 'communication' | 'entertainment';

const LAUNCHER_SETTINGS_STORAGE_KEY = 'launcher-settings';

export interface LauncherSettings {
  focusStartHour: number;
  focusEndHour: number;
  peekMinutes: number;
  focusPeekApps: string[];
  productivePeekApps: string[];
  launcherColor: string;
  launcherIcon: string;
  wallpaperUri: string | null;
  followSystemTheme: boolean;
  followSystemFont: boolean;
  followSystemWallpaper: boolean;
}

interface LauncherModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => boolean;
  forceMode: (mode: Mode) => void;
  isFocusWindow: boolean;
  isWeekend: boolean;
  currentTime: Date;
  settings: LauncherSettings;
  updateSettings: (updates: Partial<LauncherSettings>) => void;
  canUseRelax: boolean;
  canUseProductivePeek: boolean;
  productivePeekEndsAt: Date | null;
  canPeekApp: (appName: string, category: string) => boolean;
}

const defaultSettings: LauncherSettings = {
  focusStartHour: 9,
  focusEndHour: 19,
  peekMinutes: 5,
  focusPeekApps: ['Slack', 'Messages'],
  productivePeekApps: ['Netflix'],
  launcherColor: '#3B82F6',
  launcherIcon: 'apps',
  wallpaperUri: null,
  followSystemTheme: true,
  followSystemFont: true,
  followSystemWallpaper: true,
};

type PersistedLauncherSettings = Partial<LauncherSettings>;

const LauncherModeContext = createContext<LauncherModeContextValue | undefined>(undefined);

export function LauncherModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('Focus');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<LauncherSettings>(defaultSettings);
  const [productivePeekEndsAtMs, setProductivePeekEndsAtMs] = useState<number | null>(null);
  const [productivePeekHourKey, setProductivePeekHourKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem(LAUNCHER_SETTINGS_STORAGE_KEY);

        if (!savedSettings || !isMounted) {
          return;
        }

        const parsedSettings = JSON.parse(savedSettings) as PersistedLauncherSettings;
        setSettings((current) => ({ ...current, ...parsedSettings }));
      } catch (error) {
        console.warn('Failed to load launcher settings', error);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const persistSettings = async () => {
      try {
        await AsyncStorage.setItem(LAUNCHER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.warn('Failed to save launcher settings', error);
      }
    };

    persistSettings();
  }, [settings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isFocusWindow = useMemo(() => {
    const hours = currentTime.getHours();
    return hours >= settings.focusStartHour && hours < settings.focusEndHour;
  }, [currentTime, settings.focusEndHour, settings.focusStartHour]);

  const isWeekend = useMemo(() => {
    const day = currentTime.getDay();
    return day === 0 || day === 6;
  }, [currentTime]);

  const currentHourKey = useMemo(
    () => `${currentTime.getFullYear()}-${currentTime.getMonth()}-${currentTime.getDate()}-${currentTime.getHours()}`,
    [currentTime]
  );

  const productivePeekEndsAt = useMemo(
    () => (productivePeekEndsAtMs ? new Date(productivePeekEndsAtMs) : null),
    [productivePeekEndsAtMs]
  );

  const isProductivePeekActive = useMemo(
    () => productivePeekEndsAtMs !== null && productivePeekEndsAtMs > currentTime.getTime(),
    [productivePeekEndsAtMs, currentTime]
  );

  const canUseProductivePeek = useMemo(() => {
    if (isWeekend || !isFocusWindow) {
      return true;
    }

    if (isProductivePeekActive) {
      return true;
    }

    return productivePeekHourKey !== currentHourKey;
  }, [currentHourKey, isFocusWindow, isProductivePeekActive, isWeekend, productivePeekHourKey]);

  useEffect(() => {
    if (!isWeekend && isFocusWindow && mode === 'Relax') {
      setModeState('Focus');
    }

    if (!isWeekend && isFocusWindow && mode === 'Productive' && productivePeekEndsAtMs !== null && productivePeekEndsAtMs <= currentTime.getTime()) {
      setModeState('Focus');
      setProductivePeekEndsAtMs(null);
    }

    if (productivePeekHourKey && productivePeekHourKey !== currentHourKey && productivePeekEndsAtMs !== null && !isProductivePeekActive) {
      setProductivePeekEndsAtMs(null);
    }
  }, [currentHourKey, currentTime, isFocusWindow, isProductivePeekActive, isWeekend, mode, productivePeekEndsAtMs, productivePeekHourKey]);

  const setMode = useCallback(
    (nextMode: Mode) => {
      if (nextMode === 'Relax' && !isWeekend && isFocusWindow) {
        return false;
      }

      if (nextMode === 'Productive' && !isWeekend && isFocusWindow && !isProductivePeekActive) {
        if (productivePeekHourKey === currentHourKey) {
          return false;
        }

        const endsAt = Date.now() + 5 * 60 * 1000;
        setProductivePeekHourKey(currentHourKey);
        setProductivePeekEndsAtMs(endsAt);
      }

      if (nextMode !== 'Productive' && mode === 'Productive' && !isProductivePeekActive) {
        setProductivePeekEndsAtMs(null);
      }

      setModeState(nextMode);
      return true;
    },
    [currentHourKey, isFocusWindow, isProductivePeekActive, isWeekend, mode, productivePeekHourKey]
  );

  const forceMode = useCallback((nextMode: Mode) => {
    setModeState(nextMode);
  }, []);

  const updateSettings = useCallback((updates: Partial<LauncherSettings>) => {
    setSettings((current) => ({ ...current, ...updates }));
  }, []);

  const canPeekApp = useCallback(
    (appName: string, category: string) => {
      if (mode === 'Focus') {
        return category === 'Work' || category === 'Utility' || category === 'Communication' || settings.focusPeekApps.includes(appName);
      }

      if (mode === 'Productive') {
        return category !== 'Entertainment' || settings.productivePeekApps.includes(appName);
      }

      return true;
    },
    [mode, settings.focusPeekApps, settings.productivePeekApps]
  );

  const value = useMemo(
    () => ({
      mode,
      setMode,
      forceMode,
      isFocusWindow,
      isWeekend,
      currentTime,
      settings,
      updateSettings,
      canUseRelax: isWeekend || !isFocusWindow,
      canUseProductivePeek,
      productivePeekEndsAt,
      canPeekApp,
    }),
    [mode, setMode, forceMode, isFocusWindow, isWeekend, currentTime, settings, updateSettings, canUseProductivePeek, productivePeekEndsAt, canPeekApp]
  );

  return React.createElement(LauncherModeContext.Provider, { value }, children);
}

export const useLauncherMode = () => {
  const context = useContext(LauncherModeContext);

  if (!context) {
    throw new Error('useLauncherMode must be used within a LauncherModeProvider');
  }

  return context;
};