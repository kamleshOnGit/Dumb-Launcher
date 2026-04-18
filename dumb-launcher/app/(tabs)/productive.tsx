import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView, PanResponder, Platform, PermissionsAndroid, ImageBackground } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;
const CalendarModule = (() => {
  try {
    return require('expo-calendar');
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
  isFavorite?: boolean;
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
  appName: string;
}

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function ProductiveScreen() {
  const { currentTime, settings } = useLauncherMode();
  const surfaceAlpha = settings.surfaceOpacity.toString(16).padStart(2, '0');
  const subtleSurfaceAlpha = Math.max(4, Math.round(settings.surfaceOpacity * 1.3)).toString(16).padStart(2, '0');
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
    subject: 'Open your mail app',
    appName: 'Email'
  });
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Check upcoming meetings', completed: false },
    { id: '2', title: 'Reply to priority messages', completed: false },
    { id: '3', title: 'Review today plan', completed: true },
  ]);
  const [installedApps, setInstalledApps] = useState<{packageName: string; label: string}[]>([]);

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
    const loadCalendarEvents = async () => {
      try {
        if (!CalendarModule) {
          setCalendarEvents([]);
          return;
        }

        const permission = await CalendarModule.requestCalendarPermissionsAsync();

        if (permission.status !== 'granted') {
          setCalendarEvents([]);
          return;
        }

        const calendars = await CalendarModule.getCalendarsAsync(CalendarModule.EntityTypes.EVENT);
        const calendarIds = calendars
          .filter((calendar: { allowsModifications?: boolean; isPrimary?: boolean }) => calendar.allowsModifications || calendar.isPrimary)
          .map((calendar: { id: string }) => calendar.id);

        if (!calendarIds.length) {
          setCalendarEvents([]);
          return;
        }

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);

        const events = await CalendarModule.getEventsAsync(calendarIds, start, end);
        const sortedEvents = events
          .filter((event: { startDate?: string }) => event.startDate)
          .sort((a: { startDate: string }, b: { startDate: string }) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 3)
          .map((event: { id: string; title?: string; startDate: string }) => {
            const startDate = new Date(event.startDate);
            const eventDate = startDate.toDateString() === new Date().toDateString()
              ? 'Today'
              : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
              id: event.id,
              title: event.title || 'Untitled event',
              time: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              date: eventDate,
            };
          });

        setCalendarEvents(sortedEvents);
      } catch (error) {
        setCalendarEvents([]);
      }
    };

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
    loadCalendarEvents();

    // Request contacts permission and load favorites on Android
    const loadContacts = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
            {
              title: 'Contacts Permission',
              message: 'App needs access to contacts to show favorites',
              buttonPositive: 'OK',
            }
          );
        }

        if (!ContactsModule) {
          setFavoriteContacts([
            { id: '1', name: 'Mom', phone: '' },
            { id: '2', name: 'Dad', phone: '' },
            { id: '3', name: 'Work', phone: '' },
          ]);
          return;
        }

        const permission = await ContactsModule.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          setFavoriteContacts([
            { id: '1', name: 'Mom', phone: '' },
            { id: '2', name: 'Dad', phone: '' },
            { id: '3', name: 'Work', phone: '' },
          ]);
          return;
        }

        const response = await ContactsModule.getContactsAsync({
          fields: [ContactsModule.Fields.PhoneNumbers],
          sort: ContactsModule.SortTypes.FirstName,
        });

        const normalizedContacts = response.data
          .filter((contact: { name?: string }) => !!contact.name)
          .map((contact: { id: string; name?: string; phoneNumbers?: Array<{ number?: string }>; isFavorite?: boolean }) => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            phone: contact.phoneNumbers?.[0]?.number,
            isFavorite: Boolean(contact.isFavorite),
          }));

        const selectedContacts = settings.favoriteContactIds.length
          ? settings.favoriteContactIds
              .map((contactId) => normalizedContacts.find((contact: FavoriteContact) => contact.id === contactId))
              .filter(Boolean) as FavoriteContact[]
          : [];

        if (selectedContacts.length > 0) {
          setFavoriteContacts(selectedContacts.slice(0, 3));
          return;
        }

        const favoriteFirst = normalizedContacts
          .sort((a: FavoriteContact, b: FavoriteContact) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)))
          .slice(0, 3);

        if (favoriteFirst.length > 0) {
          setFavoriteContacts(favoriteFirst);
          return;
        }

        setFavoriteContacts([
          { id: '1', name: 'Mom', phone: '' },
          { id: '2', name: 'Dad', phone: '' },
          { id: '3', name: 'Work', phone: '' },
        ]);
      } catch (e) {
        setFavoriteContacts([
          { id: '1', name: 'Mom', phone: '' },
          { id: '2', name: 'Dad', phone: '' },
          { id: '3', name: 'Work', phone: '' },
        ]);
      }
    };

    loadContacts();
  }, [settings.favoriteContactIds]);

  const launchApp = async (scheme: string, name: string) => {
    try {
      // For Camera on Android, use package name if available
      if (name === 'Camera' && Platform.OS === 'android') {
        const cameraPackages = ['com.android.camera', 'com.google.android.GoogleCamera', 'com.samsung.android.camera', 'org.lineageos.snap'];
        for (const pkg of cameraPackages) {
          try {
            await RNLauncherKitHelper.launchApplication(pkg);
            return;
          } catch (e) {
            continue;
          }
        }

        const cameraApp = installedApps.find(a =>
          a.label.toLowerCase().includes('camera') ||
          a.packageName?.includes('camera') ||
          a.packageName?.includes('gcam') ||
          a.packageName?.includes('snap')
        );

        if (cameraApp?.packageName) {
          await RNLauncherKitHelper.launchApplication(cameraApp.packageName);
          return;
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

  const toggleTask = (taskId: string) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task));
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
    Alert.alert('Music unavailable', 'No music app could be opened on this device.');
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

  const productiveSummary = useMemo(() => {
    const hours = currentTime.getHours();

    if (hours < 12) {
      return 'Morning reset';
    }

    if (hours < 18) {
      return 'Afternoon execution';
    }

    return 'Evening wrap-up';
  }, [currentTime]);

  const nextFocusWindowLabel = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')} now`;

  return (
    <ImageBackground
      source={settings.wallpaperUri ? { uri: settings.wallpaperUri } : undefined}
      resizeMode="cover"
      className="flex-1"
      imageStyle={{ opacity: settings.wallpaperUri ? 0.85 : 1 }}
    >
    <ScrollView
      className="flex-1 px-6 pt-16"
      style={{ backgroundColor: settings.wallpaperUri ? 'rgba(0,0,0,0.12)' : 'transparent' }}
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

      <Text className="mb-3 text-xs uppercase tracking-[3px] text-zinc-500">Daily dashboard</Text>
      <Text className="mb-6 text-sm text-zinc-400">Shortcuts for your day.</Text>

      <View
        className="mb-5 rounded-[28px] px-5 py-5"
        style={{
          backgroundColor: withAlpha('#0f172a', surfaceAlpha),
          borderWidth: 1,
          borderColor: withAlpha(settings.launcherColor, '22'),
        }}
      >
        <View className="mb-4 flex-row items-start justify-between">
          <View>
            <Text className="text-xl font-medium text-white">{productiveSummary}</Text>
            <Text className="mt-1 text-sm text-zinc-300">Focused launcher dashboard</Text>
          </View>
          <View className="rounded-full px-3 py-2" style={{ backgroundColor: withAlpha(settings.launcherColor, subtleSurfaceAlpha) }}>
            <Text className="text-xs uppercase tracking-[2px]" style={{ color: settings.launcherColor }}>
              {nextFocusWindowLabel}
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-5 flex-row flex-wrap justify-between gap-y-4">
        <Pressable
          onPress={openCalendarApp}
          className="w-full rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha('#111827', surfaceAlpha),
            borderWidth: 1,
            borderColor: withAlpha(settings.launcherColor, '22'),
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(settings.launcherColor, '18') }}>
                <MaterialIcons name="event" size={24} color={settings.launcherColor} />
              </View>
              <View>
                <Text className="text-lg font-medium text-white">Agenda</Text>
                <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Calendar module</Text>
              </View>
            </View>
            <MaterialIcons name="open-in-new" size={18} color={withAlpha(settings.launcherColor, 'aa')} />
          </View>

          {calendarEvents.length > 0 ? (
            calendarEvents.slice(0, 3).map((event) => (
              <View key={event.id} className="mb-3 flex-row items-center gap-3 rounded-2xl px-3 py-3" style={{ backgroundColor: withAlpha('#020617', subtleSurfaceAlpha) }}>
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: settings.launcherColor }} />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-white">{event.title}</Text>
                  <Text className="mt-1 text-xs text-zinc-400">{event.time} • {event.date}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="rounded-2xl px-4 py-4" style={{ backgroundColor: withAlpha('#020617', '18') }}>
              <Text className="text-sm text-white">Open Calendar</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={openMusicApp}
          className="w-[48%] rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha('#111827', '14'),
            borderWidth: 1,
            borderColor: withAlpha(settings.launcherColor, '22'),
          }}
        >
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(settings.launcherColor, '18') }}>
            <MaterialIcons name="music-note" size={24} color={settings.launcherColor} />
          </View>
          <Text className="text-lg font-medium text-white">Music</Text>
          <Text className="mt-2 text-sm text-zinc-300">Open music app</Text>
        </Pressable>

        <Pressable
          onPress={openEmailApp}
          className="w-[48%] rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha('#111827', '14'),
            borderWidth: 1,
            borderColor: withAlpha(settings.launcherColor, '22'),
          }}
        >
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(settings.launcherColor, '18') }}>
            <MaterialIcons name="email" size={24} color={settings.launcherColor} />
          </View>
          <Text className="text-lg font-medium text-white">Email</Text>
          <Text className="mt-2 text-sm text-zinc-300">Open email app</Text>
        </Pressable>

        <View
          className="w-full rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha('#111827', '14'),
            borderWidth: 1,
            borderColor: withAlpha(settings.launcherColor, '22'),
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(settings.launcherColor, '18') }}>
                <MaterialIcons name="check-circle" size={24} color={settings.launcherColor} />
              </View>
              <View>
                <Text className="text-lg font-medium text-white">Tasks</Text>
                <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Local focus list</Text>
              </View>
            </View>
            <Text className="text-xs text-zinc-500">{tasks.filter((task) => !task.completed).length} open</Text>
          </View>

          <View className="gap-3">
            {tasks.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => toggleTask(task.id)}
                className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: withAlpha('#020617', subtleSurfaceAlpha) }}
              >
                <MaterialIcons
                  name={task.completed ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={task.completed ? settings.launcherColor : '#9ca3af'}
                />
                <Text className={`flex-1 text-sm ${task.completed ? 'text-zinc-500' : 'text-white'}`}>
                  {task.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          className="w-full rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha('#111827', '14'),
            borderWidth: 1,
            borderColor: withAlpha(settings.launcherColor, '22'),
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(settings.launcherColor, '18') }}>
                <MaterialIcons name="contacts" size={24} color={settings.launcherColor} />
              </View>
              <View>
                <Text className="text-lg font-medium text-white">Favorite contacts</Text>
                <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Quick reach</Text>
              </View>
            </View>
            <Text className="text-xs text-zinc-500">3 slots</Text>
          </View>

          <View className="flex-row justify-between">
            {favoriteContacts.slice(0, 3).map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => callContact(contact)}
                className="w-[31.5%] rounded-2xl px-3 py-4 items-center"
                style={{ backgroundColor: withAlpha('#020617', '18') }}
              >
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: withAlpha(settings.launcherColor, '18') }}>
                  <MaterialIcons name="person" size={22} color={settings.launcherColor} />
                </View>
                <Text className="text-sm font-medium text-white text-center" numberOfLines={1}>{contact.name}</Text>
                <Text className="mt-1 text-[10px] uppercase tracking-[2px] text-zinc-500">Call</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
    </ImageBackground>
  );
}
