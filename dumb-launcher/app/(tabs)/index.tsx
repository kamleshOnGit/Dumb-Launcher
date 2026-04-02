import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { Linking } from 'react-native';
import { useLauncherMode } from '../../src/hooks/useLauncherMode';

export default function TabOneScreen() {
  const { isFocusWindow } = useLauncherMode();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Real apps that can be launched
  const preferredApps = [
    { name: 'Phone', scheme: 'tel:' },
    { name: 'Messages', scheme: 'sms:' },
    { name: 'Contacts', scheme: 'content://contacts/people' },
    { name: 'Calendar', scheme: 'content://calendar' },
    { name: 'Camera', scheme: 'camera:' }
  ];

  // Filter apps based on search query
  const filteredApps = preferredApps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Mode-based styles
  const bgStyle = isFocusWindow ? "bg-black" : "bg-zinc-900";
  const accentText = isFocusWindow ? "text-white" : "text-blue-400";

  return (
    <View className={`flex-1 ${bgStyle} px-8 pt-20`}>
      {/* Clock Widget */}
      <View className="mb-12">
        <Text className="text-white text-7xl font-extralight tracking-tighter">
          {formatTime(currentTime)}
        </Text>
        <Text className="text-zinc-500 text-lg ml-1">
          {formatDate(currentTime)}
        </Text>
      </View>

      {/* App List */}
      <ScrollView className="flex-1">
        {filteredApps.map((app) => (
          <Pressable
            key={app.name}
            onPress={() => launchApp(app)}
          >
            <Text className={`text-2xl mb-6 font-light ${accentText}`}>
              {app.name}
            </Text>
          </Pressable>
        ))}
        {filteredApps.length === 0 && (
          <Text className="text-zinc-600 text-lg font-light mt-4">No apps found</Text>
        )}
      </ScrollView>

      {/* Global Search Bar */}
      <View className="mb-10 bg-zinc-800/50 rounded-2xl px-5 py-4 border border-white/5">
        <TextInput
          placeholder="Search apps or people..."
          placeholderTextColor="#71717a"
          className="text-zinc-500 font-light"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );
}
