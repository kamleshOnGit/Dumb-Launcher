import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, PanResponder, Platform, ImageBackground } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { ALL_LAUNCHER_APPS, HOME_LAUNCHER_APP_NAMES } from '../../src/constants/launcherApps';

export default function TabOneScreen() {
  const { mode, setMode, canUseRelax, canUseProductivePeek, isWeekend, productivePeekEndsAt, currentTime, settings } = useLauncherMode();

  const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;
  const surfaceAlpha = settings.surfaceOpacity.toString(16).padStart(2, '0');
  const subtleSurfaceAlpha = Math.max(4, Math.round(settings.surfaceOpacity * 0.7)).toString(16).padStart(2, '0');
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

  // Real apps that can be launched
  const preferredApps = useMemo(
    () => ALL_LAUNCHER_APPS.filter((app) => HOME_LAUNCHER_APP_NAMES.includes(app.name)),
    []
  );

  const swipeResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20,
      onPanResponderRelease: (_, gestureState) => {
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

  const launchApp = async (app: { name: string; scheme: string }) => {
    try {
      if (Platform.OS === 'android' && app.name === 'Camera') {
        const cameraPackages = ['com.android.camera', 'com.google.android.GoogleCamera', 'com.samsung.android.camera', 'org.lineageos.snap'];

        for (const packageName of cameraPackages) {
          try {
            await RNLauncherKitHelper.launchApplication(packageName);
            return;
          } catch (error) {
            continue;
          }
        }

        const androidApps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
        const exactMatch = androidApps.find((installedApp) => installedApp.label.toLowerCase() === 'camera');
        if (exactMatch?.packageName) {
          await RNLauncherKitHelper.launchApplication(exactMatch.packageName);
          return;
        }

        const cameraApp = androidApps.find((installedApp) =>
          installedApp.label.toLowerCase().includes('camera') ||
          installedApp.packageName.toLowerCase().includes('camera') ||
          installedApp.packageName.toLowerCase().includes('gcam') ||
          installedApp.packageName.toLowerCase().includes('snap')
        );

        if (cameraApp?.packageName) {
          await RNLauncherKitHelper.launchApplication(cameraApp.packageName);
          return;
        }

        if (typeof Linking.sendIntent === 'function') {
          try {
            await Linking.sendIntent('android.media.action.IMAGE_CAPTURE');
            return;
          } catch (error) {
            // continue to URL fallback
          }
        }

        const cameraSchemes = ['camera://', 'camera:', 'android.media.action.IMAGE_CAPTURE'];
        for (const scheme of cameraSchemes) {
          try {
            const canOpenCamera = await Linking.canOpenURL(scheme);
            if (canOpenCamera) {
              await Linking.openURL(scheme);
              return;
            }
          } catch (error) {
            continue;
          }
        }
      }

      if (Platform.OS === 'android' && app.name === 'Calendar') {
        const calendarPackages = ['com.google.android.calendar', 'com.samsung.android.calendar', 'com.android.calendar'];

        for (const packageName of calendarPackages) {
          try {
            await RNLauncherKitHelper.launchApplication(packageName);
            return;
          } catch (error) {
            continue;
          }
        }

        const androidApps = await InstalledApps.getSortedApps({ includeVersion: false, includeAccentColor: false });
        const calendarApp = androidApps.find((installedApp) =>
          installedApp.label.toLowerCase() === 'calendar' || installedApp.packageName.toLowerCase().includes('calendar')
        );

        if (calendarApp?.packageName) {
          await RNLauncherKitHelper.launchApplication(calendarApp.packageName);
          return;
        }
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

  const handleModeSwitch = (nextMode: 'Focus' | 'Productive' | 'Relax') => {
    const changed = setMode(nextMode);

    if (!changed) {
      if (nextMode === 'Relax') {
        Alert.alert('Relax locked', `Relax mode is available after ${settings.focusEndHour}:00 on weekdays.`);
        return;
      }

      if (nextMode === 'Productive') {
        Alert.alert('Productive peek used', 'Productive mode is available for 5 minutes once per hour on weekdays.');
      }
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
          style={{ borderColor: withAlpha(settings.launcherColor, subtleSurfaceAlpha), backgroundColor: withAlpha(settings.launcherColor, Math.max(2, Math.round(settings.surfaceOpacity * 0.55)).toString(16).padStart(2, '0')) }}
        >
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((rotation) => (
            <View
              key={rotation}
              className="absolute h-3 w-[2px] rounded-full"
              style={{
                backgroundColor: settings.launcherColor,
                transform: [{ rotate: `${rotation}deg` }, { translateY: -96 }],
              }}
            />
          ))}
          <View
            className="absolute h-16 w-1 rounded-full"
            style={{
              backgroundColor: '#ffffff',
              transform: [{ rotate: `${hourRotation}deg` }, { translateY: -28 }],
            }}
          />
          <View
            className="absolute h-24 w-[2px] rounded-full"
            style={{
              backgroundColor: settings.launcherColor,
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
          <View className="h-4 w-4 rounded-full" style={{ backgroundColor: settings.launcherColor }} />
        </View>
        <Text className="text-zinc-500 text-lg text-center">
          {formatDate(currentTime)}
        </Text>
        <View className={`mt-4 rounded-full border px-4 py-2 ${modeConfig.pill}`} style={{ borderColor: withAlpha(settings.launcherColor, subtleSurfaceAlpha), backgroundColor: withAlpha(settings.launcherColor, Math.max(4, Math.round(settings.surfaceOpacity * 0.75)).toString(16).padStart(2, '0')) }}>
          <Text className="text-xs uppercase tracking-[3px]" style={{ color: settings.launcherColor }}>
            {modeConfig.label}
          </Text>
        </View>
      </View>

      {/* App List */}
      <ScrollView className="flex-1">
        {preferredApps.map((app) => (
          <Pressable
            key={app.name}
            onPress={() => launchApp(app)}
            className="mb-4 flex-row items-center gap-4"
          >
            <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(settings.launcherColor, surfaceAlpha) }}>
              <MaterialIcons name={app.icon} size={26} color={settings.launcherColor} />
            </View>
            <Text className="text-2xl font-light" style={{ color: settings.launcherColor }}>
              {app.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View className="mb-8 flex-row gap-3">
        {(['Focus', 'Productive', 'Relax'] as const).map((modeOption) => {
          const isActive = mode === modeOption;
          const isDisabled = (modeOption === 'Relax' && !canUseRelax) || (modeOption === 'Productive' && !canUseProductivePeek);

          return (
            <Pressable
              key={modeOption}
              onPress={() => handleModeSwitch(modeOption)}
              className={`flex-1 rounded-2xl border px-4 py-3 ${
                isActive ? 'border-white bg-white/15' : 'border-white/10 bg-white/5'
              } ${isDisabled ? 'opacity-40' : 'opacity-100'}`}
              style={isActive ? { borderColor: settings.launcherColor, backgroundColor: withAlpha(settings.launcherColor, surfaceAlpha) } : undefined}
            >
              <Text className="text-center text-sm font-medium text-white">
                {modeOption}
              </Text>
              <Text className="mt-1 text-center text-[10px] uppercase tracking-[2px] text-zinc-400">
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

      <View className="mb-8 flex-row items-center justify-center gap-3">
        <Pressable onPress={() => router.push('/(tabs)/productive')}>
          <MaterialIcons name="fiber-manual-record" size={10} color={withAlpha(settings.launcherColor, '44')} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)')}>
          <MaterialIcons name="fiber-manual-record" size={10} color={settings.launcherColor} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/two')}>
          <MaterialIcons name="fiber-manual-record" size={10} color={withAlpha(settings.launcherColor, '44')} />
        </Pressable>
      </View>
    </View>
    </ImageBackground>
  );
}
