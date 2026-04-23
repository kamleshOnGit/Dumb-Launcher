import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, Pressable, ScrollView, Platform, PanResponder, Image, ImageBackground, PermissionsAndroid } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { ALL_LAUNCHER_APPS, LauncherApp } from '../../src/constants/launcherApps';

const ICON_OPTIONS = ['apps', 'home', 'rocket-launch', 'dashboard-customize', 'widgets'];
const ANDROID_FONT_OPTIONS = ['System', 'sans-serif', 'sans-serif-light', 'sans-serif-medium', 'sans-serif-condensed', 'serif', 'monospace', 'casual', 'cursive'];
const ImagePickerModule = (() => {
  try {
    return require('expo-image-picker');
  } catch {
    return null;
  }
})();
const ContactsModule = (() => {
  try {
    return require('expo-contacts');
  } catch {
    return null;
  }
})();
const LocationModule = (() => {
  try {
    return require('expo-location');
  } catch {
    return null;
  }
})();
const SYSTEM_SHORTCUTS = [
  { key: 'wallpaper', label: 'Wallpaper', action: 'android.settings.WALLPAPER_SETTINGS', fallback: 'app-settings:' },
  { key: 'display', label: 'Display', action: 'android.settings.DISPLAY_SETTINGS', fallback: 'app-settings:' },
  { key: 'home', label: 'Home app', action: 'android.settings.HOME_SETTINGS', fallback: 'app-settings:' },
  { key: 'theme', label: 'Theme settings', action: 'android.settings.SETTINGS', fallback: 'app-settings:' },
] as const;

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

const toAlphaHex = (percent: number) => Math.max(0, Math.min(255, Math.round((percent / 100) * 255)))
  .toString(16)
  .padStart(2, '0');

const normalizeHexColor = (value: string) => {
  const cleaned = value.trim().replace(/[^0-9a-fA-F]/g, '').slice(0, 6);

  if (cleaned.length === 3) {
    return `#${cleaned.split('').map((char) => `${char}${char}`).join('').toUpperCase()}`;
  }

  if (cleaned.length === 6) {
    return `#${cleaned.toUpperCase()}`;
  }

  return null;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex);

  if (!normalized) {
    return { r: 59, g: 130, b: 246 };
  }

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b]
  .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0'))
  .join('')
  .toUpperCase()}`;

const getAppCategory = (appName: string, packageName?: string) => {
  const combined = `${appName} ${packageName || ''}`.toLowerCase();

  if (combined.includes('mail') || combined.includes('message') || combined.includes('sms') || combined.includes('chat') || combined.includes('whatsapp') || combined.includes('telegram') || combined.includes('phone') || combined.includes('contact')) return 'Communication';
  if (combined.includes('calendar') || combined.includes('docs') || combined.includes('drive') || combined.includes('slack') || combined.includes('teams') || combined.includes('meet') || combined.includes('zoom') || combined.includes('note') || combined.includes('keep') || combined.includes('task')) return 'Productivity';
  if (combined.includes('camera') || combined.includes('photo') || combined.includes('gallery') || combined.includes('music') || combined.includes('spotify') || combined.includes('youtube') || combined.includes('video') || combined.includes('netflix') || combined.includes('prime') || combined.includes('hotstar')) return 'Media';
  if (combined.includes('chrome') || combined.includes('browser') || combined.includes('firefox') || combined.includes('edge') || combined.includes('search')) return 'Browser';
  if (combined.includes('setting') || combined.includes('config')) return 'System';
  if (combined.includes('game')) return 'Games';
  return 'App';
};

// Map app names to MaterialIcons for consistent theming
const getMaterialIconForApp = (appName: string, packageName?: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
  const nameLower = appName.toLowerCase();
  const packageLower = (packageName || '').toLowerCase();
  const combined = `${nameLower} ${packageLower}`;

  if (combined.includes('camera') || combined.includes('gcam')) return 'camera-alt';
  if (combined.includes('calendar')) return 'calendar-month';
  if (combined.includes('message') || combined.includes('sms') || combined.includes('messaging')) return 'message';
  if (combined.includes('contact')) return 'contacts';
  if (combined.includes('phone') || combined.includes('dialer') || combined.includes('call')) return 'phone';
  if (combined.includes('gallery') || combined.includes('photo') || combined.includes('photos')) return 'photo-library';
  if (combined.includes('mail') || combined.includes('gmail') || combined.includes('outlook') || combined.includes('yahoo')) return 'email';
  if (combined.includes('map') || combined.includes('navigation') || combined.includes('uber') || combined.includes('ola')) return 'map';
  if (combined.includes('music') || combined.includes('spotify') || combined.includes('wynk') || combined.includes('gaana')) return 'music-note';
  if (combined.includes('youtube') || combined.includes('netflix') || combined.includes('video') || combined.includes('prime video') || combined.includes('hotstar')) return 'play-circle-filled';
  if (combined.includes('chrome') || combined.includes('browser') || combined.includes('firefox') || combined.includes('edge')) return 'language';
  if (combined.includes('setting') || combined.includes('config')) return 'settings';
  if (combined.includes('calculator')) return 'calculate';
  if (combined.includes('clock') || combined.includes('alarm')) return 'access-time';
  if (combined.includes('file') || combined.includes('document') || combined.includes('docs') || combined.includes('drive') || combined.includes('files')) return 'folder';
  if (combined.includes('note') || combined.includes('keep') || combined.includes('memo')) return 'note';
  if (combined.includes('weather')) return 'wb-sunny';
  if (combined.includes('amazon') || combined.includes('flipkart') || combined.includes('myntra') || combined.includes('shopping')) return 'shopping-bag';
  if (combined.includes('instagram') || combined.includes('facebook') || combined.includes('snapchat') || combined.includes('social')) return 'people';
  if (combined.includes('whatsapp') || combined.includes('telegram') || combined.includes('signal') || combined.includes('chat')) return 'chat';
  if (combined.includes('slack') || combined.includes('teams') || combined.includes('meet') || combined.includes('zoom') || combined.includes('work')) return 'work';
  if (combined.includes('bank') || combined.includes('wallet') || combined.includes('paytm') || combined.includes('phonepe') || combined.includes('gpay') || combined.includes('paypal')) return 'account-balance-wallet';
  if (combined.includes('health') || combined.includes('fitness')) return 'favorite';
  if (combined.includes('game') || combined.includes('gaming')) return 'sports-esports';
  if (combined.includes('book') || combined.includes('kindle') || combined.includes('reader')) return 'book';
  if (combined.includes('cloud') || combined.includes('dropbox') || combined.includes('onedrive')) return 'cloud';
  if (combined.includes('search') || combined.includes('google')) return 'search';
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

type DeviceContact = {
  id: string;
  name: string;
  phone?: string;
};

export default function TabTwoScreen() {
  const { mode, currentTime, settings, updateSettings, canPeekApp, requestAppAccess } = useLauncherMode();
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activePicker, setActivePicker] = useState<'focusPeekApps' | 'productivePeekApps' | 'favoriteContactIds' | 'homeShortcuts' | null>(null);
  const [installedApps, setInstalledApps] = useState<DeviceApp[]>([]);
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(Platform.OS === 'android');
  const [colorInput, setColorInput] = useState(settings.launcherColor);

  const launcherFontStyle = settings.followSystemFont || settings.launcherFontFamily === 'System'
    ? undefined
    : { fontFamily: settings.launcherFontFamily };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const currentRgb = hexToRgb(settings.launcherColor);

  const updateRgbChannel = (channel: 'r' | 'g' | 'b', value: string) => {
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0 || parsed > 255) {
      return;
    }

    const nextRgb = { ...currentRgb, [channel]: parsed };
    const nextColor = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setColorInput(nextColor);
    updateSettings({ launcherColor: nextColor, followSystemTheme: false });
  };

  const applyHexColor = (value: string) => {
    setColorInput(value);
    const normalized = normalizeHexColor(value);

    if (normalized) {
      updateSettings({ launcherColor: normalized, followSystemTheme: false });
    }
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
          category: getAppCategory(app.label, app.packageName),
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

  useEffect(() => {
    setColorInput(settings.launcherColor);
  }, [settings.launcherColor]);

  useEffect(() => {
    let isMounted = true;

    const loadContacts = async () => {
      if (!ContactsModule) {
        return;
      }

      try {
        const permission = await ContactsModule.requestPermissionsAsync();

        if (permission.status !== 'granted' || !isMounted) {
          return;
        }

        const response = await ContactsModule.getContactsAsync({
          fields: [ContactsModule.Fields.PhoneNumbers],
          sort: ContactsModule.SortTypes.FirstName,
        });

        if (!isMounted) {
          return;
        }

        const normalizedContacts = response.data
          .filter((contact: { name?: string }) => !!contact.name)
          .map((contact: { id: string; lookupKey?: string; name?: string; phoneNumbers?: Array<{ number?: string }> }) => ({
            id: contact.lookupKey || contact.id,
            name: contact.name || 'Unknown',
            phone: contact.phoneNumbers?.[0]?.number,
          }));

        setContacts(normalizedContacts);
      } catch (error) {
        if (isMounted) {
          setContacts([]);
        }
      }
    };

    loadContacts();

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
      const hasAccess = mode === 'Productive'
        ? requestAppAccess(app.name, app.category)
        : !isAppLocked(app.name, app.category);

      if (!hasAccess) {
        Alert.alert('Peek only', `${app.name} is blocked in ${mode} mode unless added as a ${mode === 'Focus' ? 'focus peek' : 'productive peek'} app.`);
        return;
      }

      if (Platform.OS === 'android' && 'packageName' in app && app.packageName) {
        await RNLauncherKitHelper.launchApplication(app.packageName);
        return;
      }

      if (Platform.OS === 'android') {
        if (app.name === 'Camera') {
          const cameraPackages = [
            'com.android.camera',
            'com.google.android.GoogleCamera',
            'com.samsung.android.camera',
            'com.sec.android.app.camera',
            'com.oplus.camera',
            'com.oneplus.camera',
            'com.motorola.camera3',
            'org.lineageos.snap',
            'com.huawei.camera'
          ];

          for (const packageName of cameraPackages) {
            try {
              await RNLauncherKitHelper.launchApplication(packageName);
              return;
            } catch (error) {
              continue;
            }
          }

          const androidApps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
          const cameraApp = androidApps.find((installedApp) =>
            installedApp.label.toLowerCase().includes('camera') ||
            installedApp.packageName.toLowerCase().includes('camera') ||
            installedApp.packageName.toLowerCase().includes('gcam')
          );

          if (cameraApp?.packageName) {
            await RNLauncherKitHelper.launchApplication(cameraApp.packageName);
            return;
          }

          if (typeof Linking.sendIntent === 'function') {
            try {
              await Linking.sendIntent('android.media.action.STILL_IMAGE_CAMERA');
              return;
            } catch (error) {
              // continue
            }
          }
        }

        if (app.name === 'Contacts') {
          const androidApps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
          const contactsPackages = ['com.google.android.contacts', 'com.android.contacts', 'com.samsung.android.contacts', 'com.android.dialer'];

          for (const packageName of contactsPackages) {
            try {
              await RNLauncherKitHelper.launchApplication(packageName);
              return;
            } catch (error) {
              continue;
            }
          }

          const contactsApp = androidApps.find((installedApp) =>
            installedApp.label.toLowerCase() === 'contacts' ||
            installedApp.label.toLowerCase() === 'phone' ||
            installedApp.label.toLowerCase().includes('contacts') ||
            installedApp.packageName.toLowerCase().includes('contacts') ||
            installedApp.packageName.toLowerCase().includes('dialer')
          );

          if (contactsApp?.packageName) {
            await RNLauncherKitHelper.launchApplication(contactsApp.packageName);
            return;
          }
        }

        if (app.name === 'Calendar') {
          const androidApps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
          const calendarPackages = ['com.google.android.calendar', 'com.samsung.android.calendar', 'com.android.calendar'];

          for (const packageName of calendarPackages) {
            try {
              await RNLauncherKitHelper.launchApplication(packageName);
              return;
            } catch (error) {
              continue;
            }
          }

          const calendarApp = androidApps.find((installedApp) =>
            installedApp.label.toLowerCase() === 'calendar' ||
            installedApp.label.toLowerCase().includes('calendar') ||
            installedApp.packageName.toLowerCase().includes('calendar')
          );

          if (calendarApp?.packageName) {
            await RNLauncherKitHelper.launchApplication(calendarApp.packageName);
            return;
          }
        }
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

  const requestImportantPermissions = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android only', 'This permission helper is available on Android devices.');
      return;
    }

    try {
      const permissionResults = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ]);

      if (ContactsModule) {
        await ContactsModule.requestPermissionsAsync();
      }

      if (LocationModule) {
        await LocationModule.requestForegroundPermissionsAsync();
      }

      const grantedCount = Object.values(permissionResults).filter((status) => status === PermissionsAndroid.RESULTS.GRANTED).length;
      Alert.alert('Permissions updated', `${grantedCount} Android permissions granted. You can also manage any denied permissions from system settings.`);
    } catch (error) {
      Alert.alert('Permission request failed', 'Could not request permissions on this device.');
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

  const toggleHomeShortcut = (pkg: string) => {
    const currentPackages = settings.homeShortcutPackages || [];
    const nextPackages = currentPackages.includes(pkg)
      ? currentPackages.filter((item) => item !== pkg)
      : [...currentPackages, pkg].slice(0, 8);

    updateSettings({ homeShortcutPackages: nextPackages });
  };

  const toggleFavoriteContact = (contactId: string) => {
    const alreadySelected = settings.favoriteContactIds.includes(contactId);
    const nextIds = alreadySelected
      ? settings.favoriteContactIds.filter((item) => item !== contactId)
      : [...settings.favoriteContactIds, contactId].slice(0, 3);

    updateSettings({ favoriteContactIds: nextIds });
  };

  const selectedContactNames = settings.favoriteContactIds
    .map((contactId) => contacts.find((contact) => contact.id === contactId || contact.id === contactId.split('::')[0])?.name || contactId)
    .filter(Boolean) as string[];

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

  const pickLauncherWallpaper = async () => {
    if (!ImagePickerModule) {
      Alert.alert('Wallpaper picker unavailable', 'Install the image picker dependency and rebuild to use launcher wallpapers.');
      return;
    }

    try {
      const permission = await ImagePickerModule.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo access to choose a launcher wallpaper.');
        return;
      }

      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        updateSettings({ wallpaperUri: result.assets[0].uri, followSystemWallpaper: false });
      }
    } catch (error) {
      Alert.alert('Wallpaper failed', 'Could not choose a launcher wallpaper.');
    }
  };

  const clearLauncherWallpaper = () => {
    updateSettings({ wallpaperUri: null, followSystemWallpaper: true });
  };

  const renderAppVisual = (item: DeviceApp) => {
    const isLocked = isAppLocked(item.name, item.category);
    const tintColor = isLocked ? '#52525b' : settings.launcherColor;
    const iconValue = typeof item.icon === 'string' ? item.icon : undefined;
    const looksLikeUri = !!iconValue && (iconValue.startsWith('data:') || iconValue.startsWith('content:') || iconValue.startsWith('file:') || iconValue.startsWith('http'));
    const imageUri = looksLikeUri ? iconValue : iconValue && iconValue.length > 120 ? `data:image/png;base64,${iconValue}` : null;

    if (imageUri) {
      return (
        <View className="h-12 w-12 items-center justify-center rounded-2xl overflow-hidden border" style={{ backgroundColor: isLocked ? '#18181b' : withAlpha(settings.launcherColor, '14'), borderColor: isLocked ? '#27272a' : withAlpha(settings.launcherColor, '35') }}>
          <Image source={{ uri: imageUri }} style={{ width: 30, height: 30, opacity: isLocked ? 0.4 : 1 }} resizeMode="contain" />
        </View>
      );
    }

    return (
      <View className="h-12 w-12 items-center justify-center rounded-2xl overflow-hidden" style={{ backgroundColor: isLocked ? '#18181b' : withAlpha(item.accentColor || settings.launcherColor, '22') }}>
        <MaterialIcons
          name={getMaterialIconForApp(item.name, item.packageName)}
          size={24}
          color={tintColor}
        />
      </View>
    );
  };

  return (
    <ImageBackground
      source={settings.wallpaperUri ? { uri: settings.wallpaperUri } : undefined}
      resizeMode="cover"
      className="flex-1"
      imageStyle={{ opacity: settings.wallpaperUri ? 0.85 : 1 }}
    >
    <View
      className="flex-1 bg-black px-6 pt-16"
      style={{ backgroundColor: settings.wallpaperUri ? 'rgba(0,0,0,0.16)' : 'transparent' }}
      {...swipeResponder.panHandlers}
    >
      {/* Header with Real-time Status */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-white text-3xl font-light tracking-tight" style={launcherFontStyle}>Library</Text>
          <Text className={`text-xs mt-1 font-mono ${
            mode === 'Focus' ? 'text-green-400' : mode === 'Productive' ? 'text-emerald-300' : 'text-purple-400'
          }`} style={launcherFontStyle}>
            {formatTime(currentTime)} • {mode}
          </Text>
        </View>
        <Pressable onPress={() => setShowSettings((current) => !current)} className="rounded-full border border-white/10 p-3" style={{ backgroundColor: withAlpha('#020617', '10') }}>
          <MaterialIcons name={settings.launcherIcon as any} size={22} color={settings.launcherColor} />
        </Pressable>
      </View>

      {showSettings && (
        <View className="mb-6 max-h-[420px] rounded-3xl border border-white/10 bg-zinc-950/95 p-5" style={{ borderColor: withAlpha(settings.launcherColor, '55'), backgroundColor: withAlpha(settings.launcherColor, '10') }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-4 text-lg font-medium text-white" style={launcherFontStyle}>Launcher settings</Text>

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

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Home screen shortcuts</Text>
            <View className="mb-4 rounded-2xl bg-zinc-900 px-4 py-3">
              <Pressable onPress={() => setActivePicker((current) => current === 'homeShortcuts' ? null : 'homeShortcuts')} className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="mb-2 text-xs text-zinc-500">Selected apps</Text>
                  <Text className="text-sm text-white">
                    {settings.homeShortcutPackages?.length 
                      ? settings.homeShortcutPackages.map(pkg => {
                          const app = installedApps.find(a => a.packageName === pkg || a.id === pkg || a.scheme === pkg);
                          return app?.name || pkg.split('.').pop() || pkg;
                        }).join(', ') 
                      : 'Select apps'}
                  </Text>
                </View>
                <MaterialIcons name={activePicker === 'homeShortcuts' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={settings.launcherColor} />
              </Pressable>

              {activePicker === 'homeShortcuts' && (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {installedApps.map((app) => {
                    const identifier = app.packageName || app.scheme || app.id;
                    const isSelected = settings.homeShortcutPackages?.includes(identifier);

                    return (
                      <Pressable
                        key={`home-${app.id}`}
                        onPress={() => toggleHomeShortcut(identifier)}
                        className="flex-row items-center gap-2 rounded-2xl border px-3 py-2"
                        style={{
                          borderColor: isSelected ? settings.launcherColor : '#27272a',
                          backgroundColor: isSelected ? withAlpha(settings.launcherColor, '22') : '#18181b',
                        }}
                      >
                        {renderAppVisual(app)}
                        <Text className="text-sm" style={{ color: isSelected ? '#ffffff' : '#d4d4d8' }}>{app.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Surface opacity</Text>
            <View className="mb-4 rounded-2xl bg-zinc-900 px-4 py-3">
              <Text className="mb-2 text-xs text-zinc-500">Cards, buttons and clock tint (0-100)</Text>
              <TextInput
                value={String(settings.surfaceOpacity)}
                onChangeText={(value) => {
                  const parsed = Number(value);
                  if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                    updateSettings({ surfaceOpacity: parsed });
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

            <View className="mb-4 rounded-2xl bg-zinc-900 px-4 py-3">
              <Pressable onPress={() => setActivePicker((current) => current === 'favoriteContactIds' ? null : 'favoriteContactIds')} className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="mb-2 text-xs text-zinc-500">Favorite contacts</Text>
                  <Text className="text-sm text-white">{selectedContactNames.length ? selectedContactNames.join(', ') : 'Select up to 3 contacts'}</Text>
                </View>
                <MaterialIcons name={activePicker === 'favoriteContactIds' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={settings.launcherColor} />
              </Pressable>

              {activePicker === 'favoriteContactIds' && (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {contacts.length ? contacts.map((contact) => {
                    const isSelected = settings.favoriteContactIds.includes(contact.id);
                    const maxReached = !isSelected && settings.favoriteContactIds.length >= 3;

                    return (
                      <Pressable
                        key={contact.id}
                        onPress={() => toggleFavoriteContact(contact.id)}
                        disabled={maxReached}
                        className="flex-row items-center gap-2 rounded-2xl border px-3 py-2"
                        style={{
                          borderColor: isSelected ? settings.launcherColor : '#27272a',
                          backgroundColor: isSelected ? withAlpha(settings.launcherColor, '22') : '#18181b',
                          opacity: maxReached ? 0.45 : 1,
                        }}
                      >
                        <MaterialIcons name="person" size={16} color={isSelected ? settings.launcherColor : '#a1a1aa'} />
                        <Text className="text-sm" style={{ color: isSelected ? '#ffffff' : '#d4d4d8' }}>{contact.name}</Text>
                      </Pressable>
                    );
                  }) : (
                    <View className="items-center py-2">
                      <Text className="mb-3 text-sm text-zinc-500">No contacts found or permission missing.</Text>
                      <Pressable 
                        onPress={requestImportantPermissions}
                        className="rounded-xl bg-zinc-800 px-4 py-2 border border-white/5"
                        style={{ backgroundColor: withAlpha(settings.launcherColor, '22') }}
                      >
                        <Text className="text-xs text-white" style={launcherFontStyle}>Grant Permissions</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Launcher color</Text>
            <View className="mb-4 rounded-2xl bg-zinc-900 px-4 py-5">
              <Text className="mb-2 text-xs text-zinc-500" style={launcherFontStyle}>Curated palette</Text>
              <View className="flex-row flex-wrap gap-3 mb-6">
                {['#3B82F6', '#10B981', '#8B5CF6', '#F43F5E', '#F59E0B', '#6366F1', '#71717A', '#FFFFFF'].map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => applyHexColor(color)}
                    className="h-10 w-10 rounded-full border-2"
                    style={{ 
                      backgroundColor: color, 
                      borderColor: settings.launcherColor === color ? '#ffffff' : 'transparent'
                    }}
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs text-zinc-500" style={launcherFontStyle}>Custom Hex</Text>
              <View className="flex-row items-center gap-3">
                <TextInput
                  value={colorInput}
                  onChangeText={applyHexColor}
                  autoCapitalize="characters"
                  placeholder="#3B82F6"
                  placeholderTextColor="#71717a"
                  className="flex-1 rounded-xl border border-white/10 px-3 py-3 text-white"
                  style={launcherFontStyle}
                />
                <View className="h-12 w-12 rounded-xl border border-white/10" style={{ backgroundColor: settings.launcherColor }} />
              </View>
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Launcher font</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {ANDROID_FONT_OPTIONS.map((fontName) => {
                const isSelected = settings.launcherFontFamily === fontName;

                return (
                  <Pressable
                    key={fontName}
                    onPress={() => updateSettings({ launcherFontFamily: fontName, followSystemFont: fontName === 'System' })}
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: isSelected ? settings.launcherColor : '#27272a',
                      backgroundColor: isSelected ? withAlpha(settings.launcherColor, '22') : '#18181b',
                    }}
                  >
                    <Text className="text-sm text-white" style={fontName === 'System' ? undefined : { fontFamily: fontName }}>{fontName}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mb-4 rounded-2xl px-4 py-4" style={{ backgroundColor: withAlpha(settings.launcherColor, toAlphaHex(Math.max(10, settings.surfaceOpacity))) }}>
              <Text className="mb-2 text-xs text-zinc-300" style={launcherFontStyle}>Wallpaper and icon tint preview</Text>
              <View className="flex-row items-center justify-between rounded-2xl bg-black/30 px-4 py-4">
                <View className="flex-row gap-3">
                  {['phone', 'chat', 'camera-alt'].map((iconName) => (
                    <View key={iconName} className="h-12 w-12 items-center justify-center rounded-2xl bg-black/25">
                      <MaterialIcons name={iconName as any} size={24} color={settings.launcherColor} />
                    </View>
                  ))}
                </View>
                <View className="items-end">
                  <Text className="text-xs uppercase tracking-[2px] text-zinc-400" style={launcherFontStyle}>Tint</Text>
                  <Text className="mt-1 text-sm text-white" style={launcherFontStyle}>{settings.launcherColor}</Text>
                </View>
              </View>
            </View>

            <Text className="mb-2 text-xs uppercase tracking-[2px] text-zinc-500">Launcher wallpaper</Text>
            <View className="mb-4 gap-2">
              <Pressable
                onPress={pickLauncherWallpaper}
                className="rounded-2xl border border-white/10 px-4 py-3"
                style={{ backgroundColor: withAlpha(settings.launcherColor, toAlphaHex(Math.max(8, settings.surfaceOpacity))) }}
              >
                <Text className="text-sm text-white">Choose launcher wallpaper</Text>
              </Pressable>
              <Pressable
                onPress={clearLauncherWallpaper}
                className="rounded-2xl border border-white/10 px-4 py-3 bg-zinc-900"
              >
                <Text className="text-sm text-white">Clear custom wallpaper</Text>
              </Pressable>
              <Text className="text-xs text-zinc-500">
                {settings.wallpaperUri ? 'Custom wallpaper active' : 'No custom wallpaper selected'}
              </Text>
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
              <Pressable
                onPress={requestImportantPermissions}
                className="rounded-2xl border border-white/10 px-4 py-3"
                style={{ backgroundColor: withAlpha(settings.launcherColor, toAlphaHex(Math.max(8, settings.surfaceOpacity))) }}
              >
                <Text className="text-sm text-white">Grant app permissions</Text>
              </Pressable>
              {SYSTEM_SHORTCUTS.map((shortcut) => (
                <Pressable
                  key={shortcut.key}
                  onPress={() => openSystemShortcut(shortcut.action, shortcut.fallback)}
                  className="rounded-2xl border border-white/10 px-4 py-3"
                  style={{ backgroundColor: withAlpha(settings.launcherColor, toAlphaHex(Math.max(8, settings.surfaceOpacity))) }}
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
              {renderAppVisual(item)}
              <View>
                <Text className="text-xl font-light" style={[{ color: isAppLocked(item.name, item.category) ? '#3f3f46' : settings.launcherColor }, launcherFontStyle]}>
                  {item.name}
                </Text>
                <Text className="mt-1 text-xs uppercase tracking-widest text-zinc-500" style={launcherFontStyle}>{item.category}</Text>
                {isAppLocked(item.name, item.category) && (
                  <Text className="text-xs text-zinc-800 uppercase tracking-widest mt-1" style={launcherFontStyle}>Peek blocked in {mode}</Text>
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
        <Text className="text-zinc-600 text-center text-xs uppercase tracking-[4px] mb-2" style={launcherFontStyle}>
          {mode === 'Focus' ? 'Focus Protocol Active' : mode === 'Productive' ? 'Productive Mode Active' : 'Relax Mode Available'}
        </Text>
        <Text className="text-zinc-700 text-center text-xs font-mono" style={launcherFontStyle}>
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
    </ImageBackground>
  );
}
