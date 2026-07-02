import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView, PanResponder, Platform, PermissionsAndroid, ImageBackground, TextInput } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';
import {
  isDashboardAvailable,
  isNotificationAccessGranted,
  openNotificationAccessSettings,
  getMediaInfo,
  sendMediaCommand,
  getLatestEmail,
  type EmailAppSummary,
} from '../../modules/launcher-dashboard';

const TASKS_STORAGE_KEY = 'productive_tasks_v1';

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;
const toAlphaHex = (percent: number) => Math.max(0, Math.min(255, Math.round((percent / 100) * 255))).toString(16).padStart(2, '0');
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
const LocationModule = (() => {
  try {
    return require('expo-location');
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

interface WeatherInfo {
  temperature: number | null;
  condition: string;
  locationLabel: string;
  high: number | null;
  low: number | null;
}

interface EmailInfo {
  unreadCount: number;
  lastSender: string;
  subject: string;
  appName: string;
  apps: EmailAppSummary[];
}

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function ProductiveScreen() {
  const { currentTime, settings } = useLauncherMode();
  const launcherFontStyle = settings.followSystemFont || settings.launcherFontFamily === 'System'
    ? undefined
    : { fontFamily: settings.launcherFontFamily };
  const surfaceAlpha = toAlphaHex(settings.surfaceOpacity);
  const subtleSurfaceAlpha = toAlphaHex(Math.min(100, settings.surfaceOpacity * 1.3));

  // Separate color helpers for better contrast control
  const iconBgColor = settings.useSeparateColors ? settings.iconBackgroundColor : settings.launcherColor;
  const iconFgColor = settings.useSeparateColors ? settings.iconForegroundColor : settings.launcherColor;
  const textColor = settings.useSeparateColors ? settings.textColor : '#FFFFFF';
  const cardBgColor = settings.useSeparateColors ? settings.cardBackgroundColor : '#111827';
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [favoriteContacts, setFavoriteContacts] = useState<FavoriteContact[]>([]);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo>({
    temperature: null,
    condition: 'Weather unavailable',
    locationLabel: 'Location needed',
    high: null,
    low: null,
  });
  const [musicInfo, setMusicInfo] = useState<MusicInfo>({
    isPlaying: false,
    track: 'Music ready',
    artist: 'Open your player',
    appName: 'Music'
  });
  const [emailInfo, setEmailInfo] = useState<EmailInfo>({
    unreadCount: 0,
    lastSender: '',
    subject: 'Open your mail app',
    appName: 'Email',
    apps: []
  });
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [installedApps, setInstalledApps] = useState<{packageName: string; label: string}[]>([]);
  const [hasNotificationAccess, setHasNotificationAccess] = useState(true);

  // Persist tasks
  useEffect(() => {
    AsyncStorage.getItem(TASKS_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setTasks(JSON.parse(stored));
        }
      })
      .catch(() => {})
      .finally(() => setTasksLoaded(true));
  }, []);

  useEffect(() => {
    if (tasksLoaded) {
      AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
    }
  }, [tasks, tasksLoaded]);

  // Poll native dashboard (media session + latest email notification)
  useEffect(() => {
    if (!isDashboardAvailable) {
      return;
    }

    const refreshDashboard = () => {
      const granted = isNotificationAccessGranted();
      setHasNotificationAccess(granted);

      const media = getMediaInfo();
      if (media && (media.track || media.artist)) {
        setMusicInfo({
          isPlaying: media.isPlaying,
          track: media.track || 'Unknown track',
          artist: media.artist || media.appName,
          appName: media.appName,
        });
      } else if (granted) {
        setMusicInfo((prev) => ({ ...prev, isPlaying: false, track: 'Nothing playing', artist: 'Start music in any app' }));
      }

      const email = getLatestEmail();
      if (email) {
        setEmailInfo({
          unreadCount: email.count,
          lastSender: email.sender,
          subject: email.subject || email.sender || 'New email',
          appName: email.appName,
          apps: email.apps ?? [],
        });
      } else if (granted) {
        setEmailInfo((prev) => ({ ...prev, lastSender: '', subject: 'No unread mail notifications', unreadCount: 0, apps: [] }));
      }
    };

    refreshDashboard();
    const interval = setInterval(refreshDashboard, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleMediaCommand = (action: 'playPause' | 'next' | 'previous') => {
    if (!isNotificationAccessGranted()) {
      promptNotificationAccess();
      return;
    }
    sendMediaCommand(action);
    setTimeout(() => {
      const media = getMediaInfo();
      if (media) {
        setMusicInfo({
          isPlaying: media.isPlaying,
          track: media.track || 'Unknown track',
          artist: media.artist || media.appName,
          appName: media.appName,
        });
      }
    }, 400);
  };

  const promptNotificationAccess = () => {
    Alert.alert(
      'Notification access needed',
      'To show now playing music and latest emails, allow Dumb Launcher to read notifications.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => openNotificationAccessSettings() },
      ]
    );
  };

  const getInstalledApps = async () => {
    if (installedApps.length > 0) {
      return installedApps;
    }

    if (Platform.OS !== 'android') {
      return [];
    }

    const apps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
    const normalizedApps = apps.map((app) => ({ packageName: app.packageName, label: app.label }));
    setInstalledApps(normalizedApps);
    return normalizedApps;
  };

  const launchInstalledApp = async (candidates: string[], matcher?: (app: { packageName: string; label: string }) => boolean) => {
    if (Platform.OS !== 'android') {
      return false;
    }

    for (const packageName of candidates) {
      try {
        await RNLauncherKitHelper.launchApplication(packageName);
        return true;
      } catch (error) {
        continue;
      }
    }

    const apps = await getInstalledApps();
    const matchedApp = matcher ? apps.find(matcher) : undefined;

    if (matchedApp?.packageName) {
      await RNLauncherKitHelper.launchApplication(matchedApp.packageName);
      return true;
    }

    return false;
  };

  const loadWeather = async () => {
    if (!LocationModule) {
      setWeatherInfo({
        temperature: null,
        condition: 'Location module missing',
        locationLabel: 'Weather unavailable',
        high: null,
        low: null,
      });
      return;
    }

    try {
      const currentPermission = await LocationModule.getForegroundPermissionsAsync();
      const permission = currentPermission.status === 'granted'
        ? currentPermission
        : await LocationModule.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setWeatherInfo({
          temperature: null,
          condition: 'Location permission off',
          locationLabel: 'Tap Grant app permissions',
          high: null,
          low: null,
        });
        return;
      }

      const position = await LocationModule.getCurrentPositionAsync({ accuracy: LocationModule.Accuracy.Balanced, mayShowUserSettingsDialog: true });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      let locationLabel = 'Current location';

      try {
        const reverseGeocode = await LocationModule.reverseGeocodeAsync({ latitude, longitude });
        const place = reverseGeocode?.[0];
        if (place) {
          locationLabel = place.city || place.subregion || place.region || locationLabel;
        }
      } catch (error) {
        locationLabel = 'Current location';
      }

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`);
      const data = await response.json();

      if (!response.ok || !data?.current) {
        throw new Error('Weather response invalid');
      }

      const weatherCodeMap: Record<number, string> = {
        0: 'Clear sky',
        1: 'Mostly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Light drizzle',
        53: 'Drizzle',
        55: 'Heavy drizzle',
        61: 'Light rain',
        63: 'Rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Heavy showers',
        82: 'Storm showers',
        95: 'Thunderstorm',
        96: 'Storm and hail',
        99: 'Severe storm',
      };

      setWeatherInfo({
        temperature: typeof data.current.temperature_2m === 'number' ? Math.round(data.current.temperature_2m) : null,
        condition: weatherCodeMap[data.current.weather_code] || 'Weather update',
        locationLabel,
        high: typeof data?.daily?.temperature_2m_max?.[0] === 'number' ? Math.round(data.daily.temperature_2m_max[0]) : null,
        low: typeof data?.daily?.temperature_2m_min?.[0] === 'number' ? Math.round(data.daily.temperature_2m_min[0]) : null,
      });
    } catch (error) {
      setWeatherInfo({
        temperature: null,
        condition: 'Weather unavailable',
        locationLabel: 'Check internet/location',
        high: null,
        low: null,
      });
    }
  };

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
        const calendarIds = calendars.map((calendar: { id: string }) => calendar.id);

        if (!calendarIds.length) {
          setCalendarEvents([]);
          return;
        }

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() + 14);
        end.setHours(23, 59, 59, 999);

        const events = await CalendarModule.getEventsAsync(calendarIds, start, end);
        const sortedEvents = events
          .filter((event: { startDate?: string }) => event.startDate)
          .sort((a: { startDate: string }, b: { startDate: string }) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 4)
          .map((event: { id: string; title?: string; startDate: string; allDay?: boolean }) => {
            const startDate = new Date(event.startDate);
            const isToday = startDate.toDateString() === new Date().toDateString();
            const eventDate = isToday
              ? 'Today'
              : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
              id: event.id,
              title: event.title || 'Untitled event',
              time: event.allDay ? 'All day' : startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
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
        const apps = await getInstalledApps();

        // Find music app
        const musicApp = apps.find(a =>
          a.label.toLowerCase().includes('music') ||
          a.label.toLowerCase().includes('spotify') ||
          a.label.toLowerCase().includes('youtube music') ||
          a.label.toLowerCase().includes('gaana') ||
          a.label.toLowerCase().includes('wynk')
        );
        if (musicApp) {
          setMusicInfo(prev => ({
            ...prev,
            appName: musicApp.label,
            track: musicApp.label,
            artist: 'Tap to open now playing',
          }));
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
    loadWeather();

    // Request contacts permission and load favorites on Android
    const loadContacts = async () => {
      try {
        if (Platform.OS === 'android') {
          const androidPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
            {
              title: 'Contacts Permission',
              message: 'App needs access to contacts to show favorites',
              buttonPositive: 'OK',
            }
          );

          if (androidPermission !== PermissionsAndroid.RESULTS.GRANTED) {
            setFavoriteContacts([]);
            return;
          }
        }

        if (!ContactsModule) {
          setFavoriteContacts([]);
          return;
        }

        const existingPermission = await ContactsModule.getPermissionsAsync();
        const permission = existingPermission.status === 'granted'
          ? existingPermission
          : await ContactsModule.requestPermissionsAsync();

        if (permission.status !== 'granted') {
          setFavoriteContacts([]);
          return;
        }

        const response = await ContactsModule.getContactsAsync({
          fields: [ContactsModule.Fields.PhoneNumbers],
          sort: ContactsModule.SortTypes.FirstName,
        });

        const normalizedContacts = response.data
          .filter((contact: { name?: string }) => !!contact.name)
          .map((contact: { id: string; lookupKey?: string; name?: string; phoneNumbers?: Array<{ number?: string }>; isFavorite?: boolean }) => ({
            id: contact.lookupKey || contact.id,
            name: contact.name || 'Unknown',
            phone: contact.phoneNumbers?.[0]?.number,
            isFavorite: Boolean(contact.isFavorite),
          }));

        const selectedContacts = settings.favoriteContactIds.length
          ? settings.favoriteContactIds
              .map((contactId) => normalizedContacts.find((contact: FavoriteContact) => contact.id === contactId || contact.id === contactId.split('::')[0]))
              .filter(Boolean) as FavoriteContact[]
          : [];

        if (selectedContacts.length > 0) {
          const remainingContacts = normalizedContacts.filter((contact: FavoriteContact) => !selectedContacts.some((selected) => selected.id === contact.id));
          setFavoriteContacts([...selectedContacts, ...remainingContacts].slice(0, 3));
          return;
        }

        const favoriteFirst = normalizedContacts
          .sort((a: FavoriteContact, b: FavoriteContact) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)))
          .slice(0, 3);

        if (favoriteFirst.length > 0) {
          setFavoriteContacts(favoriteFirst);
          return;
        }

        setFavoriteContacts(normalizedContacts.slice(0, 3));
      } catch (e) {
        setFavoriteContacts([]);
      }
    };

    loadContacts();
  }, [settings.favoriteContactIds]);

  const launchApp = async (scheme: string, name: string) => {
    try {
      // For Camera on Android, use package name if available
      if (name === 'Camera' && Platform.OS === 'android') {
        const opened = await launchInstalledApp(
          ['com.android.camera', 'com.google.android.GoogleCamera', 'com.samsung.android.camera', 'com.sec.android.app.camera', 'com.oplus.camera', 'com.oneplus.camera', 'com.motorola.camera3', 'org.lineageos.snap'],
          (app) =>
            app.label.toLowerCase().includes('camera') ||
            app.packageName.toLowerCase().includes('camera') ||
            app.packageName.toLowerCase().includes('gcam') ||
            app.packageName.toLowerCase().includes('snap')
        );

        if (opened) {
          return;
        }
      }

      // For Calendar on Android, try specific calendar packages first
      if (name === 'Calendar' && Platform.OS === 'android') {
        const opened = await launchInstalledApp(
          ['com.google.android.calendar', 'com.samsung.android.calendar', 'com.android.calendar'],
          (app) => app.label.toLowerCase() === 'calendar' || app.label.toLowerCase().includes('calendar') || app.packageName.toLowerCase().includes('calendar')
        );

        if (opened) {
          return;
        }
      }

      if (name === 'Contacts' && Platform.OS === 'android') {
        const opened = await launchInstalledApp(
          ['com.google.android.contacts', 'com.android.contacts', 'com.samsung.android.contacts', 'com.android.dialer'],
          (app) =>
            app.label.toLowerCase() === 'contacts' ||
            app.label.toLowerCase() === 'phone' ||
            app.label.toLowerCase().includes('contacts') ||
            app.packageName.toLowerCase().includes('contacts') ||
            app.packageName.toLowerCase().includes('dialer')
        );

        if (opened) {
          return;
        }
      }

      // For other apps - exact name match first
      if (Platform.OS === 'android') {
        const apps = await getInstalledApps();
        const exactMatch = apps.find(a => a.label.toLowerCase() === name.toLowerCase());
        if (exactMatch?.packageName) {
          await RNLauncherKitHelper.launchApplication(exactMatch.packageName);
          return;
        }
        // Partial match as fallback
        const partialMatch = apps.find(a => a.label.toLowerCase().includes(name.toLowerCase()));
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

  const addTask = () => {
    if (newTaskTitle.trim()) {
      setTasks(current => [...current, { id: Date.now().toString(), title: newTaskTitle.trim(), completed: false }]);
      setNewTaskTitle('');
    }
  };

  const clearCompletedTasks = () => {
    setTasks(current => current.filter(t => !t.completed));
  };

  const openMusicApp = async () => {
    const opened = await launchInstalledApp(
      ['com.spotify.music', 'com.google.android.apps.youtube.music', 'com.android.music', 'com.samsung.android.app.music', 'com.gaana', 'com.bsbportal.music', 'com.apple.android.music'],
      (app) =>
        app.label.toLowerCase().includes('music') ||
        app.label.toLowerCase().includes('spotify') ||
        app.label.toLowerCase().includes('youtube music') ||
        app.label.toLowerCase().includes('gaana') ||
        app.label.toLowerCase().includes('wynk') ||
        app.label.toLowerCase().includes('jiosaavn') ||
        app.packageName.toLowerCase().includes('music')
    );

    if (opened) {
      return;
    }

    Alert.alert('Music unavailable', 'No music app could be opened on this device.');
  };

  const openEmailApp = async (packageName?: string) => {
    if (packageName) {
      try {
        await RNLauncherKitHelper.launchApplication(packageName);
        return;
      } catch (e) {
        // fall through to trying all email apps
      }
    }

    // If no specific package, try all known email apps
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
    if (!contact.phone) {
      Alert.alert('No phone number', `${contact.name} doesn't have a phone number saved.`);
      return;
    }

    const cleanedNumber = contact.phone.replace(/[^0-9+*#]/g, '');
    try {
      await Linking.openURL(`tel:${cleanedNumber}`);
    } catch (e) {
      Alert.alert('Call failed', `Could not place a call to ${contact.name}.`);
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
  const weatherIconName = useMemo(() => {
    const condition = weatherInfo.condition.toLowerCase();

    if (condition.includes('storm')) return 'thunderstorm';
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) return 'grain';
    if (condition.includes('snow')) return 'ac-unit';
    if (condition.includes('fog')) return 'blur-on';
    if (condition.includes('cloud') || condition.includes('overcast')) return 'cloud';
    return 'wb-sunny';
  }, [weatherInfo.condition]);

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
          <Text className="text-3xl font-light" style={[{ color: textColor }, launcherFontStyle]}>Productive</Text>
          <View className="mt-2 flex-row items-center gap-6">
            <Pressable onPress={() => router.push('/(tabs)/productive')} className="p-2">
              <MaterialIcons name="fiber-manual-record" size={20} color={iconFgColor} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)')} className="p-2">
              <MaterialIcons name="fiber-manual-record" size={20} color={withAlpha(iconFgColor, '44')} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/two')} className="p-2">
              <MaterialIcons name="fiber-manual-record" size={20} color={withAlpha(iconFgColor, '44')} />
            </Pressable>
          </View>
        </View>
        <Text className="text-sm text-zinc-400" style={launcherFontStyle}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <Text className="mb-3 text-xs uppercase tracking-[3px] text-zinc-500" style={launcherFontStyle}>Daily dashboard</Text>
      <Text className="mb-6 text-sm text-zinc-400" style={launcherFontStyle}>Shortcuts for your day.</Text>

      {isDashboardAvailable && !hasNotificationAccess && (
        <Pressable
          onPress={promptNotificationAccess}
          className="mb-5 flex-row items-center gap-3 rounded-[28px] px-5 py-4"
          style={{
            backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
            borderWidth: 1,
            borderColor: withAlpha(iconBgColor, '55'),
          }}
        >
          <MaterialIcons name="notifications-active" size={22} color={iconFgColor} />
          <View className="flex-1">
            <Text className="text-sm font-medium" style={[{ color: textColor }, launcherFontStyle]}>Enable notification access</Text>
            <Text className="mt-1 text-xs text-zinc-400" style={launcherFontStyle}>Needed for live music controls and mail preview</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={withAlpha(iconFgColor, 'aa')} />
        </Pressable>
      )}

      <View
        className="mb-5 rounded-[28px] px-5 py-5"
        style={{
          backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
          borderWidth: 1,
          borderColor: withAlpha(iconBgColor, '22'),
        }}
      >
        <View className="mb-4 flex-row items-start justify-between">
          <View>
            <Text className="text-xl font-medium" style={[{ color: textColor }, launcherFontStyle]}>{productiveSummary}</Text>
            <Text className="mt-1 text-sm" style={[{ color: settings.useSeparateColors ? textColor : '#d4d4d8', opacity: settings.useSeparateColors ? 0.7 : 1 }, launcherFontStyle]}>Focused launcher dashboard</Text>
          </View>
          <View className="rounded-full px-3 py-2" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
            <Text className="text-xs uppercase tracking-[2px]" style={[{ color: iconFgColor }, launcherFontStyle]}>
              {nextFocusWindowLabel}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={loadWeather}
        className="mb-5 rounded-[28px] px-5 py-5"
        style={{
          backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
          borderWidth: 1,
          borderColor: withAlpha(iconBgColor, '22'),
        }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
              <MaterialIcons name={weatherIconName as any} size={24} color={iconFgColor} />
            </View>
            <View>
              <Text className="text-lg font-medium" style={[{ color: textColor }, launcherFontStyle]}>Weather</Text>
              <Text className="text-xs uppercase tracking-[2px] text-zinc-400" style={launcherFontStyle}>{weatherInfo.locationLabel}</Text>
            </View>
          </View>
          <Text className="text-xs uppercase tracking-[2px]" style={[{ color: iconFgColor }, launcherFontStyle]}>
            {weatherInfo.temperature !== null ? `${weatherInfo.temperature}°` : 'Refresh'}
          </Text>
        </View>

        <View className="rounded-2xl px-4 py-4" style={{ backgroundColor: withAlpha(settings.useSeparateColors ? cardBgColor : '#020617', subtleSurfaceAlpha) }}>
          <Text className="text-sm font-medium" style={[{ color: textColor }, launcherFontStyle]}>{weatherInfo.condition}</Text>
          <Text className="mt-1 text-xs text-zinc-400" style={launcherFontStyle}>
            {weatherInfo.high !== null && weatherInfo.low !== null ? `High ${weatherInfo.high}° • Low ${weatherInfo.low}°` : 'Weather details unavailable'}
          </Text>
        </View>
      </Pressable>

      <View className="mb-5 flex-row flex-wrap justify-between gap-y-4">
        <Pressable
          onPress={openCalendarApp}
          className="w-full rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
            borderWidth: 1,
            borderColor: withAlpha(iconBgColor, '22'),
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
                <MaterialIcons name="event" size={24} color={iconFgColor} />
              </View>
              <View>
                <Text className="text-lg font-medium" style={{ color: textColor }}>Agenda</Text>
                <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Calendar module</Text>
              </View>
            </View>
            <MaterialIcons name="open-in-new" size={18} color={withAlpha(iconFgColor, 'aa')} />
          </View>

          {calendarEvents.length > 0 ? (
            calendarEvents.slice(0, 4).map((event) => (
              <View key={event.id} className="mb-3 flex-row items-center gap-3 rounded-2xl px-3 py-3" style={{ backgroundColor: withAlpha(settings.useSeparateColors ? cardBgColor : '#020617', subtleSurfaceAlpha) }}>
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: iconFgColor }} />
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: textColor }}>{event.title}</Text>
                  <Text className="mt-1 text-xs text-zinc-400">{event.time} • {event.date}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="rounded-2xl px-4 py-4" style={{ backgroundColor: withAlpha(settings.useSeparateColors ? cardBgColor : '#020617', subtleSurfaceAlpha) }}>
              <Text className="text-sm" style={{ color: textColor }}>No upcoming events</Text>
              <Text className="mt-1 text-xs text-zinc-500">Tap to open Calendar</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={openMusicApp}
          className="w-[48%] rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
            borderWidth: 1,
            borderColor: withAlpha(iconBgColor, '22'),
          }}
        >
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
            <MaterialIcons name="music-note" size={24} color={iconFgColor} />
          </View>
          <Text className="text-lg font-medium" style={{ color: textColor }}>{musicInfo.appName}</Text>
          <Text className="mt-2 text-sm text-zinc-300" numberOfLines={1}>{musicInfo.track}</Text>
          <Text className="mt-1 text-xs uppercase tracking-[2px] text-zinc-500" numberOfLines={1}>{musicInfo.artist}</Text>

          <View className="mt-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => handleMediaCommand('previous')}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}
            >
              <MaterialIcons name="skip-previous" size={22} color={iconFgColor} />
            </Pressable>
            <Pressable
              onPress={() => handleMediaCommand('playPause')}
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: iconBgColor }}
            >
              <MaterialIcons name={musicInfo.isPlaying ? 'pause' : 'play-arrow'} size={26} color={iconFgColor} />
            </Pressable>
            <Pressable
              onPress={() => handleMediaCommand('next')}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}
            >
              <MaterialIcons name="skip-next" size={22} color={iconFgColor} />
            </Pressable>
          </View>
        </Pressable>

        <Pressable
          onPress={() => openEmailApp(emailInfo.apps.length > 0 ? emailInfo.apps[0].packageName : undefined)}
          className="w-[48%] rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
            borderWidth: 1,
            borderColor: withAlpha(iconBgColor, '22'),
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
              <MaterialIcons name="email" size={22} color={iconFgColor} />
            </View>
            {emailInfo.unreadCount > 0 && (
              <View className="rounded-full px-2 py-1" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
                <Text className="text-[10px] font-bold" style={{ color: iconFgColor }}>{emailInfo.unreadCount}</Text>
              </View>
            )}
          </View>

          {emailInfo.apps.length > 0 ? (
            emailInfo.apps.map((app) => (
              <Pressable
                key={app.packageName}
                onPress={() => openEmailApp(app.packageName)}
                style={{ marginBottom: 8 }}
              >
                <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: iconFgColor }} numberOfLines={1}>
                  {app.appName} ({app.count})
                </Text>
                {app.sender ? (
                  <Text className="mt-1 text-sm font-medium text-zinc-200" numberOfLines={1}>{app.sender}</Text>
                ) : null}
                <Text className="mt-0.5 text-xs text-zinc-400" numberOfLines={1}>{app.subject}</Text>
              </Pressable>
            ))
          ) : (
            <>
              <Text className="text-lg font-medium" style={{ color: textColor }}>{emailInfo.appName}</Text>
              <Text className="mt-2 text-sm text-zinc-300" numberOfLines={2}>{emailInfo.subject}</Text>
            </>
          )}

          <Text className="mt-2 text-xs uppercase tracking-[2px] text-zinc-500" numberOfLines={1}>
            {emailInfo.unreadCount > 0
              ? `${emailInfo.unreadCount} unread`
              : hasNotificationAccess
                ? 'Tap to open mail'
                : 'Enable notification access'}
          </Text>
        </Pressable>

        <View
          className="w-full rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
            borderWidth: 1,
            borderColor: withAlpha(iconBgColor, '22'),
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
                <MaterialIcons name="check-circle" size={24} color={iconFgColor} />
              </View>
              <View>
                <Text className="text-lg font-medium" style={{ color: textColor }}>Tasks</Text>
                <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Local focus list</Text>
              </View>
            </View>
            <Text className="text-xs text-zinc-500">{tasks.filter((task) => !task.completed).length} open</Text>
          </View>

          <View className="mb-4 flex-row items-center gap-3">
            <View className="flex-1 rounded-2xl bg-black/20 border border-white/10 px-4 py-2">
              <TextInput
                placeholder="Add a focus task..."
                placeholderTextColor="#9ca3af"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                onSubmitEditing={addTask}
                className="text-sm"
                style={[{ color: textColor }, launcherFontStyle]}
              />
            </View>
            <Pressable
              onPress={addTask}
              className="h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: iconBgColor }}
            >
              <MaterialIcons name="add" size={20} color={iconFgColor} />
            </Pressable>
          </View>

          <View className="gap-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => toggleTask(task.id)}
                  className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ backgroundColor: withAlpha(settings.useSeparateColors ? cardBgColor : '#020617', subtleSurfaceAlpha) }}
                >
                  <MaterialIcons
                    name={task.completed ? 'check-circle' : 'radio-button-unchecked'}
                    size={20}
                    color={task.completed ? iconFgColor : '#9ca3af'}
                  />
                  <Text className="flex-1 text-sm" style={{ color: task.completed ? '#71717a' : textColor }}>
                    {task.title}
                  </Text>
                </Pressable>
              ))
            ) : (
                <Text className="text-zinc-500 text-sm italic px-2 py-4">No tasks yet. Add one above.</Text>
            )}
            
            {tasks.some(t => t.completed) && (
              <Pressable onPress={clearCompletedTasks} className="mt-2 self-end px-2 py-1">
                <Text className="text-xs text-zinc-600 uppercase tracking-widest">Clear completed</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View
          className="w-full rounded-[28px] px-5 py-5"
          style={{
            backgroundColor: withAlpha(cardBgColor, surfaceAlpha),
            borderWidth: 1,
            borderColor: withAlpha(iconBgColor, '22'),
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
                <MaterialIcons name="contacts" size={24} color={iconFgColor} />
              </View>
              <View>
                <Text className="text-lg font-medium" style={{ color: textColor }}>Favorite contacts</Text>
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
                style={{ backgroundColor: withAlpha(settings.useSeparateColors ? cardBgColor : '#020617', subtleSurfaceAlpha) }}
              >
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}>
                  <MaterialIcons name="person" size={22} color={iconFgColor} />
                </View>
                <Text className="text-sm font-medium text-center" style={{ color: textColor }} numberOfLines={1}>{contact.name}</Text>
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
