import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, PanResponder, Platform, ImageBackground, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { ALL_LAUNCHER_APPS, HOME_LAUNCHER_APP_NAMES } from '../../src/constants/launcherApps';

export default function TabOneScreen() {
  const { mode, setMode, canUseRelax, canUseProductivePeek, isWeekend, productivePeekEndsAt, currentTime, settings } = useLauncherMode();

  const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;
  const toAlphaHex = (percent: number) => Math.max(0, Math.min(255, Math.round((percent / 100) * 255))).toString(16).padStart(2, '0');
  const launcherFontStyle = settings.followSystemFont || settings.launcherFontFamily === 'System'
    ? undefined
    : { fontFamily: settings.launcherFontFamily };
  const surfaceAlpha = toAlphaHex(settings.surfaceOpacity);
  const subtleSurfaceAlpha = toAlphaHex(Math.max(0, settings.surfaceOpacity * 0.7));

  // Separate color helpers for better contrast control
  const iconBgColor = settings.useSeparateColors ? settings.iconBackgroundColor : settings.launcherColor;
  const iconFgColor = settings.useSeparateColors ? settings.iconForegroundColor : settings.launcherColor;
  const textColor = settings.useSeparateColors ? settings.textColor : settings.launcherColor;
  const cardBgColor = settings.useSeparateColors ? settings.cardBackgroundColor : '#18181b';
  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const hourRotation = hours * 30 + minutes * 0.5;
  const minuteRotation = minutes * 6;
  const secondRotation = seconds * 6;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const [installedApps, setInstalledApps] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadApps = async () => {
      if (Platform.OS === 'android') {
        try {
          const apps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: true });
          setInstalledApps(apps);
        } catch (error) {
          setInstalledApps(ALL_LAUNCHER_APPS.map(app => ({ label: app.name, packageName: app.id, icon: app.icon })));
        }
      } else {
        setInstalledApps(ALL_LAUNCHER_APPS.map(app => ({ label: app.name, scheme: app.scheme, icon: app.icon })));
      }
      setIsLoading(false);
    };
    loadApps();
  }, []);

  const preferredApps = useMemo(() => {
    const result = settings.homeShortcutPackages.map(pkg => {
      // 1. Exact package name or label match from installed apps
      const app = installedApps.find(a => (a.packageName === pkg) || (a.label === pkg));
      if (app) return app;

      // 2. Static app match by name or id
      const staticApp = ALL_LAUNCHER_APPS.find(a => a.name === pkg || a.id === pkg);
      if (staticApp) {
        // Try to find the real installed app for this static app name
        const lowerName = staticApp.name.toLowerCase();
        let realApp: any = null;

        if (lowerName === 'phone') {
          // For Phone, prefer actual dialer packages over contacts apps that might be labeled "Phone"
          realApp = installedApps.find(a =>
            a.packageName?.toLowerCase().includes('dialer')
          ) || installedApps.find(a =>
            a.label?.toLowerCase() === 'phone' && !a.packageName?.toLowerCase().includes('contacts')
          ) || installedApps.find(a =>
            a.label?.toLowerCase().includes('phone')
          );
        } else if (lowerName === 'messages') {
          realApp = installedApps.find(a =>
            a.packageName?.toLowerCase().includes('messaging') ||
            a.packageName?.toLowerCase().includes('message') ||
            a.label?.toLowerCase().includes('message')
          );
        } else if (lowerName === 'contacts') {
          realApp = installedApps.find(a =>
            a.label?.toLowerCase() === 'contacts' ||
            a.packageName?.toLowerCase().includes('contacts')
          );
        } else if (lowerName === 'calendar') {
          realApp = installedApps.find(a =>
            a.label?.toLowerCase() === 'calendar' ||
            a.packageName?.toLowerCase().includes('calendar')
          );
        } else if (lowerName === 'camera') {
          realApp = installedApps.find(a =>
            a.packageName?.toLowerCase().includes('camera') ||
            a.packageName?.toLowerCase().includes('gcam') ||
            a.label?.toLowerCase().includes('camera')
          );
        } else {
          realApp = installedApps.find(a =>
            a.label?.toLowerCase() === lowerName ||
            a.packageName?.toLowerCase().includes(lowerName)
          );
        }

        if (realApp) return realApp;
        return { label: staticApp.name, packageName: staticApp.id, icon: staticApp.icon, isStatic: true, scheme: staticApp.scheme };
      }

      // 3. Fuzzy match: try matching pkg as a keyword against installed app labels/packages
      const lowerPkg = pkg.toLowerCase();
      const fuzzyApp = installedApps.find(a =>
        a.label?.toLowerCase().includes(lowerPkg) ||
        a.packageName?.toLowerCase().includes(lowerPkg)
      );
      if (fuzzyApp) return fuzzyApp;

      return null;
    }).filter(Boolean);

    return result;
  }, [settings.homeShortcutPackages, installedApps]);

  const swipeResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        (Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20) ||
        (gestureState.dy < -40 && Math.abs(gestureState.dx) < 30),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -80 && Math.abs(gestureState.dx) < 60) {
          router.push('/(tabs)/two');
          return;
        }

        if (gestureState.dx < -60) {
          router.push('/(tabs)/two');
        }

        if (gestureState.dx > 60) {
          router.push('/(tabs)/productive');
        }
      },
    }),
    []
  );

  const launchApp = async (app: any) => {
    try {
      const appName = (app.label || app.name || '').toLowerCase();
      const pkgName = app.packageName || '';

      // ---- Universal system apps: use Android intent schemes ----
      // These work on ALL Android devices regardless of manufacturer

      if (Platform.OS === 'android') {
        // Phone / Dialer — tel: opens the dialer keypad universally
        if (appName === 'phone' || appName === 'dialer' || pkgName.includes('dialer')) {
          try {
            await Linking.openURL('tel:');
            return;
          } catch (e) { /* fall through */ }
        }

        // Messages / SMS — sms: opens the default messaging app universally
        if (appName === 'messages' || appName === 'message' || appName === 'messaging' || appName === 'sms' || pkgName.includes('messaging') || pkgName.includes('message')) {
          try {
            await Linking.openURL('sms:');
            return;
          } catch (e) { /* fall through */ }
        }

        // Contacts — content:// URI opens the contacts app universally
        if (appName === 'contacts' || appName === 'people' || pkgName.includes('contacts')) {
          try {
            await Linking.openURL('content://com.android.contacts/contacts');
            return;
          } catch (e) { /* fall through */ }
        }

        // Calendar — content:// URI opens the calendar app universally
        if (appName === 'calendar' || pkgName.includes('calendar')) {
          try {
            await Linking.openURL('content://com.android.calendar/time');
            return;
          } catch (e) { /* fall through */ }
        }

        // Camera — intent action opens the default camera universally
        if (appName === 'camera' || pkgName.includes('camera') || pkgName.includes('gcam')) {
          if (typeof Linking.sendIntent === 'function') {
            try {
              await Linking.sendIntent('android.media.action.STILL_IMAGE_CAMERA');
              return;
            } catch (e) { /* fall through */ }
          }
        }

        // Settings — intent action opens system settings universally
        if (appName === 'settings' || pkgName.includes('settings')) {
          if (typeof Linking.sendIntent === 'function') {
            try {
              await Linking.sendIntent('android.settings.SETTINGS');
              return;
            } catch (e) { /* fall through */ }
          }
        }

        // Calculator — intent action opens the default calculator universally
        if (appName === 'calculator' || pkgName.includes('calculator')) {
          if (typeof Linking.sendIntent === 'function') {
            try {
              await Linking.sendIntent('android.intent.action.CALCULATOR');
              return;
            } catch (e) { /* fall through */ }
          }
        }

        // ---- Generic apps: launch by package name ----
        // For non-system apps, the packageName from InstalledApps is the real package
        if (pkgName && !app.isStatic) {
          try {
            await RNLauncherKitHelper.launchApplication(pkgName);
            return;
          } catch (e) { /* fall through */ }
        }

        // Static apps with a scheme — try the scheme
        if (app.scheme) {
          try {
            const canOpen = await Linking.canOpenURL(app.scheme);
            if (canOpen) {
              await Linking.openURL(app.scheme);
              return;
            }
          } catch (e) { /* fall through */ }
        }

        // Last resort: search installed apps by name and launch
        if (appName) {
          const androidApps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
          const match = androidApps.find(a =>
            a.label?.toLowerCase() === appName ||
            a.label?.toLowerCase().includes(appName)
          );
          if (match?.packageName) {
            await RNLauncherKitHelper.launchApplication(match.packageName);
            return;
          }
        }
      }

      // Non-Android: try scheme
      if (app.scheme) {
        const canOpen = await Linking.canOpenURL(app.scheme);
        if (canOpen) {
          await Linking.openURL(app.scheme);
          return;
        }
      }

      Alert.alert(`${app.label || app.name} not available`, `Cannot open ${app.label || app.name} on this device.`);
    } catch (error) {
      Alert.alert('Error', `Failed to open ${app.label || app.name}`);
    }
  };

  const modeConfig = {
    Focus: {
      bgStyle: 'bg-black',
      accentText: 'text-white',
      pill: 'bg-blue-500/20 border-blue-400/40',
      label: 'Deep focus mode',
    },
    Productive: {
      bgStyle: 'bg-zinc-950',
      accentText: 'text-emerald-300',
      pill: 'bg-emerald-500/20 border-emerald-400/40',
      label: 'Flexible productive mode',
    },
    Relax: {
      bgStyle: 'bg-zinc-900',
      accentText: 'text-purple-300',
      pill: 'bg-purple-500/20 border-purple-400/40',
      label: 'Relax mode unlocked',
    },
  }[mode];

  // App drawer state — removed, now redirects to library page which already has search

  const handleModeSwitch = (nextMode: 'Focus' | 'Productive' | 'Relax') => {
    const changed = setMode(nextMode);

    if (!changed && nextMode === 'Relax') {
      Alert.alert('Relax locked', `Relax mode is available after ${settings.focusEndHour}:00 on weekdays.`);
    }
  };

  return (
    <ImageBackground
      source={settings.wallpaperUri ? { uri: settings.wallpaperUri } : undefined}
      resizeMode="cover"
      className="flex-1"
      imageStyle={{ opacity: settings.wallpaperUri ? 0.85 : 1 }}
    >
    <View
      className={`flex-1 ${modeConfig.bgStyle} px-8 pt-20`}
      style={{ backgroundColor: settings.wallpaperUri ? 'rgba(0,0,0,0.14)' : 'transparent' }}
      {...swipeResponder.panHandlers}
    >
      <View className="mb-12 items-center justify-center">
        <View
          className="mb-6 h-56 w-56 items-center justify-center rounded-full border"
          style={{ borderColor: withAlpha(iconBgColor, subtleSurfaceAlpha), backgroundColor: withAlpha(iconBgColor, toAlphaHex(Math.max(0, settings.surfaceOpacity * 0.55))) }}
        >
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((rotation) => (
            <View
              key={rotation}
              className="absolute h-3 w-[2px] rounded-full"
              style={{
                backgroundColor: iconFgColor,
                transform: [{ rotate: `${rotation}deg` }, { translateY: -96 }],
              }}
            />
          ))}
          <View
            className="absolute h-16 w-1 rounded-full"
            style={{
              backgroundColor: textColor,
              transform: [{ rotate: `${hourRotation}deg` }, { translateY: -28 }],
            }}
          />
          <View
            className="absolute h-24 w-[2px] rounded-full"
            style={{
              backgroundColor: iconFgColor,
              transform: [{ rotate: `${minuteRotation}deg` }, { translateY: -40 }],
            }}
          />
          <View
            className="absolute h-28 w-[1px] rounded-full"
            style={{
              backgroundColor: '#f87171',
              transform: [{ rotate: `${secondRotation}deg` }, { translateY: -46 }],
            }}
          />
          <View className="h-4 w-4 rounded-full" style={{ backgroundColor: iconFgColor }} />
        </View>
        <Text className="text-zinc-500 text-lg text-center" style={launcherFontStyle}>
          {formatDate(currentTime)}
        </Text>
        <View className={`mt-4 rounded-full border px-4 py-2 ${modeConfig.pill}`} style={{ borderColor: withAlpha(iconBgColor, subtleSurfaceAlpha), backgroundColor: withAlpha(iconBgColor, toAlphaHex(Math.max(0, settings.surfaceOpacity * 0.75))) }}>
          <Text className="text-xs uppercase tracking-[3px]" style={[{ color: textColor }, launcherFontStyle]}>
            {modeConfig.label}
          </Text>
        </View>
      </View>

      {/* App List */}
      <ScrollView className="flex-1">
        {preferredApps.map((app, index) => (
          <Pressable
            key={`${app.packageName || app.label || app.name}-${index}`}
            onPress={() => launchApp(app)}
            className="mb-4 flex-row items-center gap-4"
          >
            <View className="h-14 w-14 items-center justify-center rounded-2xl">
              {typeof app.icon === 'string' && (app.icon.startsWith('file://') || app.icon.startsWith('data:') || app.icon.startsWith('content://')) ? (
                <Image source={{ uri: app.icon }} style={{ width: 40, height: 40 }} />
              ) : typeof app.icon === 'string' && app.icon.length > 50 ? (
                <Image source={{ uri: app.icon.startsWith('data:') ? app.icon : `data:image/png;base64,${app.icon}` }} style={{ width: 40, height: 40 }} />
              ) : (
                <MaterialIcons name={(app.icon || 'apps') as any} size={28} color={iconFgColor} />
              )}
            </View>
            <Text className="text-2xl font-light" style={[{ color: textColor }, launcherFontStyle]}>
              {app.label || app.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* App search button — navigates to library page */}
      <Pressable
        onPress={() => router.push('/(tabs)/two')}
        className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 py-3"
        style={{ backgroundColor: withAlpha(iconBgColor, subtleSurfaceAlpha) }}
      >
        <MaterialIcons name="search" size={18} color={iconFgColor} />
        <Text className="text-sm text-zinc-400" style={launcherFontStyle}>Search apps</Text>
        <Text className="text-xs text-zinc-600">({installedApps.length})</Text>
      </Pressable>

      <View className="mb-8 flex-row gap-3">
        {(['Focus', 'Productive', 'Relax'] as const).map((modeOption) => {
          const isActive = mode === modeOption;
          const isDisabled = modeOption === 'Relax' && !canUseRelax;

          return (
            <Pressable
              key={modeOption}
              onPress={() => handleModeSwitch(modeOption)}
              className={`flex-1 rounded-2xl border px-4 py-3 ${
                isActive ? 'border-white bg-white/15' : 'border-white/10 bg-white/5'
              } ${isDisabled ? 'opacity-40' : 'opacity-100'}`}
              style={isActive ? { borderColor: iconBgColor, backgroundColor: withAlpha(iconBgColor, surfaceAlpha) } : undefined}
            >
              <Text className="text-center text-sm font-medium text-white" style={launcherFontStyle}>
                {modeOption}
              </Text>
              <Text className="mt-1 text-center text-[10px] uppercase tracking-[2px] text-zinc-400" style={launcherFontStyle}>
                {modeOption === 'Relax'
                  ? (canUseRelax ? (isWeekend ? 'Weekend anytime' : 'Available') : `After ${settings.focusEndHour}:00`)
                  : modeOption === 'Productive'
                    ? (canUseProductivePeek
                        ? (productivePeekEndsAt ? `Until ${productivePeekEndsAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}` : (isWeekend ? 'Weekend anytime' : '5 min / hour'))
                        : 'Used this hour')
                    : 'Available'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mb-8 flex-row items-center justify-center gap-6">
        <Pressable onPress={() => router.push('/(tabs)/productive')} className="p-2">
          <MaterialIcons name="fiber-manual-record" size={20} color={withAlpha(iconFgColor, '44')} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)')} className="p-2">
          <MaterialIcons name="fiber-manual-record" size={20} color={iconFgColor} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/two')} className="p-2">
          <MaterialIcons name="fiber-manual-record" size={20} color={withAlpha(iconFgColor, '44')} />
        </Pressable>
      </View>
    </View>
    </ImageBackground>
  );
}
