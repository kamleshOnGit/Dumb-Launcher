import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, Pressable, ScrollView, Platform, PanResponder, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { ALL_LAUNCHER_APPS, LauncherApp } from '../../src/constants/launcherApps';

const COLOR_OPTIONS = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EF4444'];
const ICON_OPTIONS = ['apps', 'home', 'rocket-launch', 'dashboard-customize', 'widgets'];
const SYSTEM_SHORTCUTS = [
  { key: 'wallpaper', label: 'Wallpaper', action: 'android.settings.WALLPAPER_SETTINGS', fallback: 'app-settings:' },
  { key: 'display', label: 'Display', action: 'android.settings.DISPLAY_SETTINGS', fallback: 'app-settings:' },
  { key: 'home', label: 'Home app', action: 'android.settings.HOME_SETTINGS', fallback: 'app-settings:' },
  { key: 'theme', label: 'Theme settings', action: 'android.settings.SETTINGS', fallback: 'app-settings:' },
] as const;

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

// Map app names to MaterialIcons for consistent theming
const getMaterialIconForApp = (appName: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
  const nameLower = appName.toLowerCase();
  if (nameLower.includes('phone') || nameLower.includes('dial')) return 'phone';
  if (nameLower.includes('message') || nameLower.includes('sms')) return 'message';
  if (nameLower.includes('contact')) return 'contacts';
  if (nameLower.includes('camera')) return 'camera-alt';
  if (nameLower.includes('gallery') || nameLower.includes('photo')) return 'photo-library';
  if (nameLower.includes('setting')) return 'settings';
  if (nameLower.includes('calculator')) return 'calculate';
  if (nameLower.includes('calendar')) return 'calendar-month';
  if (nameLower.includes('clock') || nameLower.includes('alarm')) return 'access-time';
  if (nameLower.includes('browser') || nameLower.includes('chrome')) return 'language';
  if (nameLower.includes('mail') || nameLower.includes('gmail')) return 'email';
  if (nameLower.includes('map') || nameLower.includes('navigation')) return 'map';
  if (nameLower.includes('music') || nameLower.includes('spotify')) return 'music-note';
  if (nameLower.includes('video') || nameLower.includes('youtube') || nameLower.includes('netflix')) return 'play-circle-filled';
  if (nameLower.includes('file') || nameLower.includes('document')) return 'folder';
  if (nameLower.includes('note')) return 'note';
  if (nameLower.includes('weather')) return 'wb-sunny';
  if (nameLower.includes('shopping') || nameLower.includes('amazon')) return 'shopping-bag';
  if (nameLower.includes('social') || nameLower.includes('facebook') || nameLower.includes('instagram')) return 'people';
  if (nameLower.includes('chat') || nameLower.includes('whatsapp') || nameLower.includes('telegram')) return 'chat';
  if (nameLower.includes('work') || nameLower.includes('slack') || nameLower.includes('teams')) return 'work';
  if (nameLower.includes('bank') || nameLower.includes('pay') || nameLower.includes('wallet')) return 'account-balance-wallet';
  if (nameLower.includes('health') || nameLower.includes('fitness')) return 'favorite';
  if (nameLower.includes('game')) return 'sports-esports';
  if (nameLower.includes('book') || nameLower.includes('read')) return 'book';
  if (nameLower.includes('drive') || nameLower.includes('cloud')) return 'cloud';
  if (nameLower.includes('search') || nameLower.includes('google')) return 'search';
  return 'apps';
};

type DeviceApp = {
  id: string;
  name: string;
  category: string;
  icon: string | React.ComponentProps<typeof MaterialIcons>['name'];
  packageName?: string;
  scheme?: string;
  accentColor?: string;
};

export default function TabTwoScreen() {
  const { mode, currentTime, settings, updateSettings, canPeekApp } = useLauncherMode();
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activePicker, setActivePicker] = useState<'focusPeekApps' | 'productivePeekApps' | null>(null);
  const [installedApps, setInstalledApps] = useState<DeviceApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(Platform.OS === 'android');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadInstalledApps = async () => {
      if (Platform.OS !== 'android') {
        setInstalledApps(
          ALL_LAUNCHER_APPS.map((app) => ({
            id: app.id,
            name: app.name,
            category: app.category,
            icon: app.icon,
            scheme: app.scheme,
          }))
        );
        setIsLoadingApps(false);
        return;
      }

      try {
        const apps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: true });

        if (!isMounted) {
          return;
        }

        const normalizedApps: DeviceApp[] = apps.map((app, index) => ({
          id: `${app.packageName}-${index}`,
          name: app.label,
          category: 'Installed app',
          icon: app.icon,
          packageName: app.packageName,
          accentColor: app.accentColor,
        }));

        setInstalledApps(normalizedApps);
      } catch (error) {
        if (isMounted) {
          setInstalledApps(
            ALL_LAUNCHER_APPS.map((app) => ({
              id: app.id,
              name: app.name,
              category: app.category,
              icon: app.icon,
              scheme: app.scheme,
            }))
          );
          Alert.alert('Installed apps unavailable', 'Falling back to sample app list. Use a native Android build to load real installed apps.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingApps(false);
        }
      }
    };

    loadInstalledApps();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredApps = installedApps.filter((app) => app.name.toLowerCase().includes(search.toLowerCase()));

  const availablePickerApps = useMemo(() => ALL_LAUNCHER_APPS, []);

  const swipeResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 60) {
          router.push('/(tabs)');
        }
      },
    }),
    []
  );

  const isAppLocked = (appName: string, category: string) => {
    if (mode === 'Relax') {
      return false;
    }

    return !canPeekApp(appName, category);
  };

  const launchApp = async (app: DeviceApp | LauncherApp) => {
    try {
      if (isAppLocked(app.name, app.category)) {
        Alert.alert('Peek only', `${app.name} is blocked in ${mode} mode unless added as a ${mode === 'Focus' ? 'focus peek' : 'productive peek'} app.`);
        return;
      }

      if (Platform.OS === 'android' && 'packageName' in app && app.packageName) {
        await RNLauncherKitHelper.launchApplication(app.packageName);
        return;
      }

      if (!('scheme' in app) || !app.scheme) {
        Alert.alert(`${app.name} not available`, `Cannot open ${app.name} on this device.`);
        return;
      }

      const canOpen = await Linking.canOpenURL(app.scheme);
      if (canOpen) {
        await Linking.openURL(app.scheme);
      } else {
        Alert.alert(`${app.name} not available`, `Cannot open ${app.name} on this device.`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open ${app.name}`);
    }
  };

  const handleHourChange = (key: 'focusStartHour' | 'focusEndHour', value: string) => {
    const parsed = Number(value);

    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 23) {
      updateSettings({ [key]: parsed } as Pick<typeof settings, typeof key>);
    }
  };

  const togglePeekApp = (key: 'focusPeekApps' | 'productivePeekApps', appName: string) => {
    const currentApps = settings[key];
    const nextApps = currentApps.includes(appName)
      ? currentApps.filter((item) => item !== appName)
      : [...currentApps, appName];

    updateSettings({ [key]: nextApps } as Pick<typeof settings, typeof key>);
  };

  const openSystemShortcut = async (action: string, fallback: string) => {
    try {
      if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
        await Linking.sendIntent(action);
        return;
      }

      const supported = await Linking.canOpenURL(fallback);
      if (supported) {
        await Linking.openURL(fallback);
        return;
      }

      await Linking.openSettings();
    } catch (error) {
      Alert.alert('Unavailable', 'This settings screen is not available on this device.');
    }
  };

  return (
    <View
      className="flex-1 bg-black px-6 pt-16"
      style={{ backgroundColor: 'transparent' }}
      {...swipeResponder.panHandlers}
    >
      {/* Header with Real-time Status */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-white text-3xl font-light tracking-tight">Library</Text>
          <Text className={`text-xs mt-1 font-mono ${
            mode === 'Focus' ? 'text-green-400' : mode === 'Productive' ? 'text-emerald-300' : 'text-purple-400'
          }`}>
            {formatTime(currentTime)} • {mode}
          </Text>
        </View>
        <Pressable onPress={() => setShowSettings((current) => !current)} className="rounded-full border border-white/10 p-3">
          <MaterialIcons name={settings.launcherIcon as any} size={22} color={settings.launcherColor} />
        </Pressable>
      </View>

      {showSettings && (
        <View className="mb-6 max-h-[420px] rounded-3xl border border-white/10 bg-zinc-950/95 p-5" style={{ borderColor: withAlpha(settings.launcherColor, '55') }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-4 text-lg font-medium text-white">Launcher settings</Text>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Focus schedule</Text>
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3">
                <Text className="mb-2 text-xs text-zinc-500">Start hour</Text>
                <TextInput
                  value={String(settings.focusStartHour)}
                  onChangeText={(value) => handleHourChange('focusStartHour', value)}
                  keyboardType="number-pad"
                  className="text-white"
                />
              </View>
              <View className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3">
                <Text className="mb-2 text-xs text-zinc-500">End hour</Text>
                <TextInput
                  value={String(settings.focusEndHour)}
                  onChangeText={(value) => handleHourChange('focusEndHour', value)}
                  keyboardType="number-pad"
                  className="text-white"
                />
              </View>
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Peek allowance</Text>
            <View className="mb-4 rounded-2xl bg-zinc-900 px-4 py-3">
              <Text className="mb-2 text-xs text-zinc-500">Minutes</Text>
              <TextInput
                value={String(settings.peekMinutes)}
                onChangeText={(value) => {
                  const parsed = Number(value);
                  if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 30) {
                    updateSettings({ peekMinutes: parsed });
                  }
                }}
                keyboardType="number-pad"
                className="text-white"
              />
            </View>

            {[
              ['focusPeekApps', 'Focus peek apps'],
              ['productivePeekApps', 'Productive entertainment peek apps'],
            ].map(([key, label]) => {
              const settingKey = key as 'focusPeekApps' | 'productivePeekApps';
              const selectedApps = settings[settingKey];
              const isOpen = activePicker === settingKey;

              return (
                <View key={settingKey} className="mb-4 rounded-2xl bg-zinc-900 px-4 py-3">
                  <Pressable onPress={() => setActivePicker((current) => current === settingKey ? null : settingKey)} className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="mb-2 text-xs text-zinc-500">{label}</Text>
                      <Text className="text-sm text-white">{selectedApps.length ? selectedApps.join(', ') : 'Select apps'}</Text>
                    </View>
                    <MaterialIcons name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={settings.launcherColor} />
                  </Pressable>

                  {isOpen && (
                    <View className="mt-4 flex-row flex-wrap gap-2">
                      {availablePickerApps.map((app) => {
                        const isSelected = selectedApps.includes(app.name);

                        return (
                          <Pressable
                            key={`${settingKey}-${app.id}`}
                            onPress={() => togglePeekApp(settingKey, app.name)}
                            className="flex-row items-center gap-2 rounded-2xl border px-3 py-2"
                            style={{
                              borderColor: isSelected ? settings.launcherColor : '#27272a',
                              backgroundColor: isSelected ? withAlpha(settings.launcherColor, '22') : '#18181b',
                            }}
                          >
                            <MaterialIcons name={app.icon} size={16} color={isSelected ? settings.launcherColor : '#a1a1aa'} />
                            <Text className="text-sm" style={{ color: isSelected ? '#ffffff' : '#d4d4d8' }}>{app.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Launcher color</Text>
            <View className="mb-4 flex-row gap-2">
              {COLOR_OPTIONS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => updateSettings({ launcherColor: color })}
                  className="h-10 w-10 rounded-full border border-white/10 items-center justify-center"
                  style={{ backgroundColor: color, borderColor: settings.launcherColor === color ? '#ffffff' : withAlpha(color, '66') }}
                >
                  {settings.launcherColor === color && <MaterialIcons name="check" size={16} color="#ffffff" />}
                </Pressable>
              ))}
            </View>

            <View className="mb-4 rounded-2xl px-4 py-4" style={{ backgroundColor: withAlpha(settings.launcherColor, '22') }}>
              <Text className="mb-2 text-xs text-zinc-300">Wallpaper and icon tint preview</Text>
              <View className="flex-row items-center justify-between rounded-2xl bg-black/30 px-4 py-4">
                <View className="flex-row gap-3">
                  {['phone', 'chat', 'camera-alt'].map((iconName) => (
                    <View key={iconName} className="h-12 w-12 items-center justify-center rounded-2xl bg-black/25">
                      <MaterialIcons name={iconName as any} size={24} color={settings.launcherColor} />
                    </View>
                  ))}
                </View>
                <View className="items-end">
                  <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Tint</Text>
                  <Text className="mt-1 text-sm text-white">{settings.launcherColor}</Text>
                </View>
              </View>
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Launcher icon</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <Pressable
                  key={icon}
                  onPress={() => updateSettings({ launcherIcon: icon })}
                  className={`rounded-2xl border px-4 py-3 ${settings.launcherIcon === icon ? 'border-white bg-white/10' : 'border-white/10 bg-zinc-900'}`}
                  style={settings.launcherIcon === icon ? { borderColor: settings.launcherColor, backgroundColor: withAlpha(settings.launcherColor, '22') } : undefined}
                >
                  <MaterialIcons name={icon as any} size={18} color={settings.launcherColor} />
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Android personalization</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {SYSTEM_SHORTCUTS.map((shortcut) => (
                <Pressable
                  key={shortcut.key}
                  onPress={() => openSystemShortcut(shortcut.action, shortcut.fallback)}
                  className="rounded-2xl border border-white/10 px-4 py-3"
                  style={{ backgroundColor: withAlpha(settings.launcherColor, '18') }}
                >
                  <Text className="text-sm text-white">{shortcut.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">System theme hooks</Text>
            <View className="gap-2">
              {[
                ['followSystemTheme', 'Use Android system color theme'],
                ['followSystemFont', 'Use Android system font'],
                ['followSystemWallpaper', 'Use Android wallpaper accent'],
              ].map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => updateSettings({ [key]: !settings[key as keyof typeof settings] } as Partial<typeof settings>)}
                  className="flex-row items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3"
                >
                  <Text className="text-sm text-white">{label}</Text>
                  <View className={`h-6 w-11 rounded-full ${settings[key as keyof typeof settings] ? 'bg-emerald-500' : 'bg-zinc-700'} p-1`}>
                    <View className={`h-4 w-4 rounded-full bg-white ${settings[key as keyof typeof settings] ? 'ml-auto' : ''}`} />
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Search Input */}
      <View className="flex-row items-center bg-zinc-900 rounded-xl px-4 mb-8 border border-white/5">
        <MaterialIcons name="search" color="#71717a" size={20} />
        <TextInput
          placeholder="Search all apps..."
          placeholderTextColor="#71717a"
          className="flex-1 h-12 ml-3 text-white font-light"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* App List */}
      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={isLoadingApps ? <Text className="mb-4 text-sm text-zinc-500">Loading installed apps...</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className="py-4 border-b border-white/5 flex-row justify-between items-center"
            disabled={isAppLocked(item.name, item.category)}
            onPress={() => launchApp(item)}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl overflow-hidden" style={{ backgroundColor: isAppLocked(item.name, item.category) ? '#18181b' : withAlpha(item.accentColor || settings.launcherColor, '22') }}>
                <MaterialIcons
                  name={getMaterialIconForApp(item.name)}
                  size={24}
                  color={isAppLocked(item.name, item.category) ? '#52525b' : item.accentColor || settings.launcherColor}
                />
              </View>
              <View>
                <Text className={`text-xl font-light ${isAppLocked(item.name, item.category) ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  {item.name}
                </Text>
                <Text className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{item.category}</Text>
                {isAppLocked(item.name, item.category) && (
                  <Text className="text-xs text-zinc-800 uppercase tracking-widest mt-1">Peek blocked in {mode}</Text>
                )}
              </View>
            </View>
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: isAppLocked(item.name, item.category) ? '#3f3f46' : settings.launcherColor }} />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Mode Status Footer with Real-time Info */}
      <View className="py-6 border-t border-white/10">
        <Text className="text-zinc-600 text-center text-xs uppercase tracking-[4px] mb-2">
          {mode === 'Focus' ? 'Focus Protocol Active' : mode === 'Productive' ? 'Productive Mode Active' : 'Relax Mode Available'}
        </Text>
        <Text className="text-zinc-700 text-center text-xs font-mono">
          {mode === 'Focus'
            ? `Communication/productive peek: ${settings.peekMinutes} min`
            : mode === 'Productive'
              ? `Entertainment peek: ${settings.peekMinutes} min`
              : 'All Apps Available'}
        </Text>
        <View className="mt-4 flex-row items-center justify-center gap-3">
          <Pressable onPress={() => router.push('/(tabs)/productive')}>
            <MaterialIcons name="fiber-manual-record" size={10} color={withAlpha(settings.launcherColor, '44')} />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)')}>
            <MaterialIcons name="fiber-manual-record" size={10} color={withAlpha(settings.launcherColor, '44')} />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/two')}>
            <MaterialIcons name="fiber-manual-record" size={10} color={settings.launcherColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
