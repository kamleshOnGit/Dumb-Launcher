import React, { useMemo } from 'react';
import { View, Text, Pressable, Alert, ScrollView, PanResponder } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { ALL_LAUNCHER_APPS, PRODUCTIVE_LAUNCHER_APP_NAMES } from '../../src/constants/launcherApps';

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

export default function ProductiveScreen() {
  const { currentTime, settings } = useLauncherMode();

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

  const launchApp = async (scheme: string, name: string) => {
    try {
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

  const productiveCards = [
    {
      key: 'schedule',
      title: 'Today',
      subtitle: '3 events • 5 tasks',
      detail: 'Standup 10:00 • Review 14:00',
      span: 'large',
      icon: 'event-note' as const,
    },
    {
      key: 'focus',
      title: 'Focus block',
      subtitle: `${settings.focusStartHour}:00 - ${settings.focusEndHour}:00`,
      detail: 'Deep work protected',
      span: 'small',
      icon: 'timer' as const,
    },
    {
      key: 'todo',
      title: 'Top priority',
      subtitle: 'Ship launcher polish',
      detail: '2 tasks due today',
      span: 'small',
      icon: 'checklist' as const,
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-black px-6 pt-16"
      style={{ backgroundColor: withAlpha(settings.launcherColor, '10') }}
      contentContainerStyle={{ paddingBottom: 40 }}
      {...swipeResponder.panHandlers}
    >
      <View className="mb-8 flex-row items-start justify-between">
        <View>
          <Text className="text-3xl font-light text-white">Productive</Text>
          <Text className="mt-2 text-xs uppercase tracking-[3px]" style={{ color: settings.launcherColor }}>
            Swipe left for home
          </Text>
        </View>
        <Text className="text-sm text-zinc-400">
          {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <View className="mb-8 flex-row flex-wrap justify-between">
        {productiveCards.map((card) => (
          <View
            key={card.key}
            className={`mb-4 rounded-3xl border p-5 ${card.span === 'large' ? 'w-full min-h-[160px]' : 'w-[48%] min-h-[160px]'}`}
            style={{
              borderColor: withAlpha(settings.launcherColor, '44'),
              backgroundColor: withAlpha(settings.launcherColor, card.span === 'large' ? '18' : '12'),
            }}
          >
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-black/20">
              <MaterialIcons name={card.icon} size={24} color={settings.launcherColor} />
            </View>
            <Text className="text-xl font-medium text-white">{card.title}</Text>
            <Text className="mt-2 text-sm text-zinc-200">{card.subtitle}</Text>
            <Text className="mt-2 text-xs uppercase tracking-[2px] text-zinc-400">{card.detail}</Text>
          </View>
        ))}
      </View>

      <Text className="mb-4 text-xs uppercase tracking-[3px] text-zinc-500">Quick productive launch</Text>
      <View className="flex-row flex-wrap justify-between">
        {productiveApps.map((app, index) => (
          <Pressable
            key={app.id}
            onPress={() => launchApp(app.scheme, app.name)}
            className={`mb-4 rounded-3xl border p-4 ${index % 3 === 0 ? 'w-full min-h-[120px]' : 'w-[48%] min-h-[120px]'}`}
            style={{
              borderColor: withAlpha(settings.launcherColor, '33'),
              backgroundColor: withAlpha(settings.launcherColor, index % 3 === 0 ? '1f' : '12'),
            }}
          >
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-black/20">
              <MaterialIcons name={app.icon} size={24} color={settings.launcherColor} />
            </View>
            <Text className="text-lg font-medium text-white">{app.name}</Text>
            <Text className="mt-1 text-xs uppercase tracking-[2px] text-zinc-400">{app.category}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
