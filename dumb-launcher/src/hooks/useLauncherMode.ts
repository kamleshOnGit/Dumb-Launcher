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
  followSystemTheme: boolean;
  followSystemFont: boolean;
  followSystemWallpaper: boolean;
}

interface LauncherModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => boolean;
  forceMode: (mode: Mode) => void;
  isFocusWindow: boolean;
  currentTime: Date;
  settings: LauncherSettings;
  updateSettings: (updates: Partial<LauncherSettings>) => void;
  canUseRelax: boolean;
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

  useEffect(() => {
    if (isFocusWindow && mode === 'Relax') {
      setModeState('Focus');
    }
  }, [isFocusWindow, mode]);

  const setMode = useCallback(
    (nextMode: Mode) => {
      if (nextMode === 'Relax' && isFocusWindow) {
        return false;
      }

      setModeState(nextMode);
      return true;
    },
    [isFocusWindow]
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
      currentTime,
      settings,
      updateSettings,
      canUseRelax: !isFocusWindow,
      canPeekApp,
    }),
    [mode, setMode, forceMode, isFocusWindow, currentTime, settings, updateSettings, canPeekApp]
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