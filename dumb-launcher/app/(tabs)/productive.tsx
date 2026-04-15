import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView, PanResponder, Platform, PermissionsAndroid } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { ALL_LAUNCHER_APPS, PRODUCTIVE_LAUNCHER_APP_NAMES } from '../../src/constants/launcherApps';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

// Get Material icon for any app name
const getMaterialIconForApp = (appName: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
  const nameLower = appName.toLowerCase();
  if (nameLower.includes('music') || nameLower.includes('spotify') || nameLower.includes('player')) return 'music-note';
  if (nameLower.includes('calendar')) return 'event';
  if (nameLower.includes('mail') || nameLower.includes('email') || nameLower.includes('gmail')) return 'email';
  if (nameLower.includes('contact')) return 'contacts';
  if (nameLower.includes('message') || nameLower.includes('sms')) return 'message';
  if (nameLower.includes('camera')) return 'camera-alt';
  if (nameLower.includes('phone') || nameLower.includes('dial')) return 'phone';
  if (nameLower.includes('clock') || nameLower.includes('alarm')) return 'access-time';
  return 'apps';
};

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  date: string;
}

interface FavoriteContact {
  id: string;
  name: string;
  phone?: string;
}

interface MusicInfo {
  isPlaying: boolean;
  track: string;
  artist: string;
  appName: string;
}

interface EmailInfo {
  unreadCount: number;
  lastSender: string;
  subject: string;
}

export default function ProductiveScreen() {
  const { currentTime, settings } = useLauncherMode();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [favoriteContacts, setFavoriteContacts] = useState<FavoriteContact[]>([]);
  const [musicInfo, setMusicInfo] = useState<MusicInfo>({
    isPlaying: false,
    track: 'Not Playing',
    artist: 'Tap to open music',
    appName: 'Music'
  });
  const [emailInfo, setEmailInfo] = useState<EmailInfo>({
    unreadCount: 0,
    lastSender: '',
    subject: 'No new emails'
  });
  const [installedApps, setInstalledApps] = useState<{packageName: string; label: string}[]>([]);

  const productiveApps = useMemo(
    () => ALL_LAUNCHER_APPS.filter((app) => PRODUCTIVE_LAUNCHER_APP_NAMES.includes(app.name)),
    []
  );

  const swipeResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -60) {
          router.push('/(tabs)');
        }
      },
    }),
    []
  );

  // Load dynamic data
  useEffect(() => {
    // Calendar events - placeholder for real calendar API integration
    // To get real events, need to integrate with Android Calendar API or Google Calendar
    setCalendarEvents([]);

    // Load installed apps to find music/email apps
    const loadApps = async () => {
      if (Platform.OS !== 'android') return;
      try {
        const apps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
        setInstalledApps(apps.map(a => ({ packageName: a.packageName, label: a.label })));

        // Find music app
        const musicApp = apps.find(a =>
          a.label.toLowerCase().includes('music') ||
          a.label.toLowerCase().includes('spotify') ||
          a.label.toLowerCase().includes('youtube music') ||
          a.label.toLowerCase().includes('gaana') ||
          a.label.toLowerCase().includes('wynk')
        );
        if (musicApp) {
          setMusicInfo(prev => ({ ...prev, appName: musicApp.label }));
        }

        // Find email app
        const emailApp = apps.find(a =>
          a.label.toLowerCase().includes('gmail') ||
          a.label.toLowerCase().includes('email') ||
          a.label.toLowerCase().includes('outlook') ||
          a.label.toLowerCase().includes('yahoo')
        );
        if (emailApp) {
          setEmailInfo(prev => ({ ...prev, appName: emailApp.label }));
        }
      } catch (e) {
        console.log('Could not load installed apps');
      }
    };

    loadApps();

    // Request contacts permission and load favorites on Android
    const loadContacts = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
            {
              title: 'Contacts Permission',
              message: 'App needs access to contacts to show favorites',
              buttonPositive: 'OK',
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            // Try to load real starred/favorite contacts from device
            // Note: Requires native module integration for full Contacts API access
            // For now, show placeholder that real data is expected
            setFavoriteContacts([
              { id: '1', name: 'Favorite 1', phone: '' },
              { id: '2', name: 'Favorite 2', phone: '' },
              { id: '3', name: 'Favorite 3', phone: '' },
            ]);
          }
        } catch (e) {
          console.log('Contacts permission denied');
        }
      }
    };

    loadContacts();
  }, []);

  const launchApp = async (scheme: string, name: string) => {
    try {
      // For Camera on Android, use package name if available
      if (name === 'Camera' && Platform.OS === 'android') {
        const cameraPackages = ['com.android.camera', 'com.google.android.GoogleCamera', 'com.samsung.android.camera'];
        for (const pkg of cameraPackages) {
          try {
            await RNLauncherKitHelper.launchApplication(pkg);
            return;
          } catch (e) {
            continue;
          }
        }
      }

      // For Calendar on Android, try specific calendar packages first
      if (name === 'Calendar' && Platform.OS === 'android') {
        const calendarPackages = ['com.google.android.calendar', 'com.samsung.android.calendar', 'com.android.calendar'];
        for (const pkg of calendarPackages) {
          try {
            await RNLauncherKitHelper.launchApplication(pkg);
            return;
          } catch (e) {
            continue;
          }
        }
        // Fallback to searching installed apps
        const calendarApp = installedApps.find(a =>
          a.label.toLowerCase() === 'calendar' ||
          a.packageName?.includes('calendar')
        );
        if (calendarApp?.packageName) {
          await RNLauncherKitHelper.launchApplication(calendarApp.packageName);
          return;
        }
      }

      // For other apps - exact name match first
      if (Platform.OS === 'android') {
        const exactMatch = installedApps.find(a => a.label.toLowerCase() === name.toLowerCase());
        if (exactMatch?.packageName) {
          await RNLauncherKitHelper.launchApplication(exactMatch.packageName);
          return;
        }
        // Partial match as fallback
        const partialMatch = installedApps.find(a => a.label.toLowerCase().includes(name.toLowerCase()));
        if (partialMatch?.packageName) {
          await RNLauncherKitHelper.launchApplication(partialMatch.packageName);
          return;
        }
      }

      const canOpen = await Linking.canOpenURL(scheme);
      if (canOpen) {
        await Linking.openURL(scheme);
      } else {
        Alert.alert(`${name} not available`, `Cannot open ${name} on this device.`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open ${name}`);
    }
  };

  const openMusicApp = async () => {
    const musicApps = ['com.spotify.music', 'com.google.android.apps.youtube.music', 'com.android.music', 'com.samsung.android.app.music'];
    for (const pkg of musicApps) {
      try {
        await RNLauncherKitHelper.launchApplication(pkg);
        return;
      } catch (e) {
        continue;
      }
    }
    Alert.alert('No music app found', 'Install a music app to use this widget');
  };

  const openEmailApp = async () => {
    const emailApps = ['com.google.android.gm', 'com.microsoft.office.outlook', 'com.yahoo.mobile.client.android.mail'];
    for (const pkg of emailApps) {
      try {
        await RNLauncherKitHelper.launchApplication(pkg);
        return;
      } catch (e) {
        continue;
      }
    }
    Linking.openURL('mailto:');
  };

  const openCalendarApp = async () => {
    // Try common calendar packages first
    const calendarApps = ['com.google.android.calendar', 'com.samsung.android.calendar', 'com.android.calendar'];
    for (const pkg of calendarApps) {
      try {
        await RNLauncherKitHelper.launchApplication(pkg);
        return;
      } catch (e) {
        continue;
      }
    }

    // Fallback: try using calendar scheme via Linking
    try {
      const canOpen = await Linking.canOpenURL('content://com.android.calendar/time');
      if (canOpen) {
        await Linking.openURL('content://com.android.calendar/time');
        return;
      }
    } catch (e) {
      // Ignore and try next
    }

    // Final fallback: open installed calendar app by searching
    const allApps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
    const calendarApp = allApps.find(a =>
      a.label.toLowerCase().includes('calendar') ||
      a.packageName?.includes('calendar')
    );

    if (calendarApp?.packageName) {
      try {
        await RNLauncherKitHelper.launchApplication(calendarApp.packageName);
        return;
      } catch (e) {
        // Fall through to alert
      }
    }

    Alert.alert('Calendar not found', 'Install a calendar app');
  };

  const callContact = async (contact: FavoriteContact) => {
    if (Platform.OS === 'android') {
      try {
        await RNLauncherKitHelper.launchApplication('com.android.dialer');
      } catch (e) {
        Linking.openURL(`tel:${contact.phone || ''}`);
      }
    } else {
      Linking.openURL(`tel:${contact.phone || ''}`);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-black px-6 pt-16"
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      {...swipeResponder.panHandlers}
    >
      <View className="mb-8 flex-row items-start justify-between">
        <View>
          <Text className="text-3xl font-light text-white">Productive</Text>
          <View className="mt-2 flex-row items-center gap-3">
            <Pressable onPress={() => router.push('/(tabs)/productive')}>
              <MaterialIcons name="fiber-manual-record" size={10} color={settings.launcherColor} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)')}>
              <MaterialIcons name="fiber-manual-record" size={10} color={withAlpha(settings.launcherColor, '44')} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/two')}>
              <MaterialIcons name="fiber-manual-record" size={10} color={withAlpha(settings.launcherColor, '44')} />
            </Pressable>
          </View>
        </View>
        <Text className="text-sm text-zinc-400">
          {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* Music Widget */}
      <Pressable onPress={openMusicApp} className="mb-4 w-full">
        <View
          className="rounded-3xl border p-5 min-h-[140px]"
          style={{
            borderColor: withAlpha(settings.launcherColor, '44'),
            backgroundColor: withAlpha(settings.launcherColor, '18'),
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black/20">
              <MaterialIcons name="music-note" size={24} color={settings.launcherColor} />
            </View>
            <View className="flex-row items-center gap-2">
              {musicInfo.isPlaying && (
                <View className="flex-row gap-0.5">
                  <View className="w-1 h-4 bg-white rounded-full animate-pulse" />
                  <View className="w-1 h-6 bg-white rounded-full animate-pulse" />
                  <View className="w-1 h-3 bg-white rounded-full animate-pulse" />
                </View>
              )}
              <MaterialIcons name={musicInfo.isPlaying ? 'pause' : 'play-arrow'} size={20} color={settings.launcherColor} />
            </View>
          </View>
          <Text className="text-xl font-medium text-white">{musicInfo.track}</Text>
          <Text className="mt-1 text-sm text-zinc-300">{musicInfo.artist}</Text>
          <Text className="mt-2 text-xs uppercase tracking-[2px] text-zinc-400">{musicInfo.appName}</Text>
        </View>
      </Pressable>

      {/* Calendar Widget */}
      <Pressable onPress={openCalendarApp} className="mb-4 w-full">
        <View
          className="rounded-3xl border p-5"
          style={{
            borderColor: withAlpha(settings.launcherColor, '44'),
            backgroundColor: withAlpha(settings.launcherColor, '12'),
          }}
        >
          <View className="flex-row items-center gap-3 mb-4">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black/20">
              <MaterialIcons name="event" size={24} color={settings.launcherColor} />
            </View>
            <View>
              <Text className="text-lg font-medium text-white">Calendar</Text>
              <Text className="text-xs text-zinc-400">{calendarEvents.length} events today</Text>
            </View>
          </View>
          {calendarEvents.length > 0 ? (
            calendarEvents.map(event => (
              <View key={event.id} className="flex-row items-center gap-3 py-2 border-t border-white/5">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.launcherColor }} />
                <View className="flex-1">
                  <Text className="text-white">{event.title}</Text>
                  <Text className="text-xs text-zinc-400">{event.time}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="border-t border-white/5 pt-3">
              <Text className="text-zinc-500 text-sm">Tap to connect calendar</Text>
              <Text className="text-xs text-zinc-600 mt-1">Google Calendar integration coming soon</Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Tasks Widget */}
      <Pressable onPress={() => Alert.alert('Tasks', 'Google Tasks or Todoist integration coming soon')} className="mb-4 w-full">
        <View
          className="rounded-3xl border p-5"
          style={{
            borderColor: withAlpha(settings.launcherColor, '44'),
            backgroundColor: withAlpha(settings.launcherColor, '12'),
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black/20">
              <MaterialIcons name="check-circle" size={24} color={settings.launcherColor} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-medium text-white">Tasks</Text>
              <Text className="text-xs text-zinc-400">Connect Google Tasks or Todoist</Text>
            </View>
            <MaterialIcons name="add-task" size={20} color={withAlpha(settings.launcherColor, '88')} />
          </View>
        </View>
      </Pressable>

      {/* Email Widget */}
      <Pressable onPress={openEmailApp} className="mb-4 w-full">
        <View
          className="rounded-3xl border p-5"
          style={{
            borderColor: withAlpha(settings.launcherColor, '44'),
            backgroundColor: withAlpha(settings.launcherColor, '12'),
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black/20">
                <MaterialIcons name="email" size={24} color={settings.launcherColor} />
              </View>
              <View>
                <Text className="text-lg font-medium text-white">Email</Text>
                {emailInfo.unreadCount > 0 && (
                  <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full bg-red-500" />
                    <Text className="text-xs text-zinc-400">{emailInfo.unreadCount} unread</Text>
                  </View>
                )}
              </View>
            </View>
            <MaterialIcons name="open-in-new" size={18} color={withAlpha(settings.launcherColor, '88')} />
          </View>
          {emailInfo.unreadCount > 0 && emailInfo.lastSender && (
            <View className="border-t border-white/5 pt-3">
              <Text className="text-sm text-white" numberOfLines={1}>{emailInfo.lastSender}</Text>
              <Text className="text-xs text-zinc-400" numberOfLines={1}>{emailInfo.subject}</Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Favorite Contacts */}
      <View className="mb-6">
        <Text className="mb-3 text-xs uppercase tracking-[3px] text-zinc-500">Favorite Contacts</Text>
        <View className="flex-row flex-wrap justify-between">
          {favoriteContacts.length > 0 ? (
            favoriteContacts.map((contact, index) => (
              <Pressable
                key={contact.id}
                onPress={() => callContact(contact)}
                className="mb-3 w-[32%]"
              >
                <View
                  className="rounded-2xl border p-4 items-center"
                  style={{
                    borderColor: withAlpha(settings.launcherColor, '33'),
                    backgroundColor: withAlpha(settings.launcherColor, '12'),
                  }}
                >
                  <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-black/20">
                    <MaterialIcons name="person" size={24} color={settings.launcherColor} />
                  </View>
                  <Text className="text-sm font-medium text-white text-center" numberOfLines={1}>{contact.name}</Text>
                  <MaterialIcons name="phone" size={14} color={withAlpha(settings.launcherColor, '88')} className="mt-1" />
                </View>
              </Pressable>
            ))
          ) : (
            <View className="w-full p-4 rounded-2xl border border-white/10 bg-white/5">
              <Text className="text-zinc-500 text-center">Add favorite contacts to see them here</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Launch Apps */}
      <Text className="mb-4 text-xs uppercase tracking-[3px] text-zinc-500">Quick launch</Text>
      <View className="flex-row flex-wrap justify-between">
        {productiveApps.map((app, index) => (
          <Pressable
            key={app.id}
            onPress={() => launchApp(app.scheme, app.name)}
            className={`mb-4 rounded-3xl border p-4 ${index % 3 === 0 ? 'w-full min-h-[100px]' : 'w-[48%] min-h-[100px]'}`}
            style={{
              borderColor: withAlpha(settings.launcherColor, '33'),
              backgroundColor: withAlpha(settings.launcherColor, index % 3 === 0 ? '1f' : '12'),
            }}
          >
            <View className="mb-3 h-10 w-10 items-center justify-center rounded-2xl bg-black/20">
              <MaterialIcons name={app.icon} size={22} color={settings.launcherColor} />
            </View>
            <Text className="text-base font-medium text-white">{app.name}</Text>
            <Text className="mt-1 text-xs uppercase tracking-[2px] text-zinc-400">{app.category}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
