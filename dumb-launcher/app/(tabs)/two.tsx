import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Linking } from 'react-native';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';
import { Search, Settings2 } from 'lucide-react-native';

// Mock data with schemes for launching
const MOCK_APPS = [
  { id: '1', name: 'Amazon', category: 'Shopping', scheme: 'https://www.amazon.com' },
  { id: '2', name: 'Calculator', category: 'Utility', scheme: 'calculator:' },
  { id: '3', name: 'Instagram', category: 'Social', scheme: 'instagram://' },
  { id: '4', name: 'Maps', category: 'Navigation', scheme: 'geo:' },
  { id: '5', name: 'Netflix', category: 'Entertainment', scheme: 'nflx://' },
  { id: '6', name: 'Settings', category: 'System', scheme: 'app-settings:' },
  { id: '7', name: 'Slack', category: 'Work', scheme: 'slack://' },
  { id: '8', name: 'YouTube', category: 'Entertainment', scheme: 'youtube://' },
];

export default function TabTwoScreen() {
  const { isFocusWindow } = useLauncherMode();
  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const filteredApps = MOCK_APPS.filter(app => 
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  const isAppLocked = (category: string) => {
    return isFocusWindow && (category === 'Social' || category === 'Entertainment');
  };

  const launchApp = async (app: { name: string; scheme: string }) => {
    try {
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

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      {/* Header with Real-time Status */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-white text-3xl font-light tracking-tight">Library</Text>
          <Text className={`text-xs mt-1 font-mono ${
            isFocusWindow ? 'text-green-400' : 'text-purple-400'
          }`}>
            {formatTime(currentTime)} • {isFocusWindow ? 'Focus' : 'Relax'}
          </Text>
        </View>
        <Settings2 color="white" size={24} strokeWidth={1.5} />
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-zinc-900 rounded-xl px-4 mb-8 border border-white/5">
        <Search color="#71717a" size={20} />
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
        renderItem={({ item }) => (
          <TouchableOpacity 
            className="py-4 border-b border-white/5 flex-row justify-between items-center"
            disabled={isAppLocked(item.category)}
            onPress={() => launchApp(item)}
          >
            <View>
              <Text className={`text-xl font-light ${isFocusWindow && (item.category === 'Social' || item.category === 'Entertainment') ? 'text-zinc-700' : 'text-zinc-300'}`}>
                {item.name}
              </Text>
              {isFocusWindow && (item.category === 'Social' || item.category === 'Entertainment') && (
                <Text className="text-xs text-zinc-800 uppercase tracking-widest mt-1">Locked until 19:00</Text>
              )}
            </View>
            <View className="w-2 h-2 rounded-full bg-zinc-800" />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Mode Status Footer with Real-time Info */}
      <View className="py-6 border-t border-white/10">
        <Text className="text-zinc-600 text-center text-xs uppercase tracking-[4px] mb-2">
          {isFocusWindow ? 'Focus Protocol Active' : 'Relax Mode Available'}
        </Text>
        <Text className="text-zinc-700 text-center text-xs font-mono">
          {isFocusWindow ? 'Social & Entertainment Locked' : 'All Apps Available'}
        </Text>
      </View>
    </View>
  );
}
