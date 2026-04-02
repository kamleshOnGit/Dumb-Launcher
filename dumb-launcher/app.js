import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useLauncherMode } from './src/hooks/useLauncherMode';

export default function App() {
  const { isFocusWindow } = useLauncherMode();

  return (
    <SafeAreaView className="flex-1 bg-black items-center justify-center">
      <View className="p-6 border border-white/20 rounded-2xl">
        <Text className="text-white text-4xl font-light tracking-widest uppercase">
          {isFocusWindow ? 'Focus Active' : 'Evening Relax'}
        </Text>
        <Text className="text-gray-500 text-center mt-4 font-mono">
          9:00 — 19:00 Protocol
        </Text>
      </View>
      
      {/* Search Bar Placeholder */}
      <View className="absolute bottom-10 w-full px-6">
        <View className="bg-zinc-900 h-14 rounded-full justify-center px-6">
          <Text className="text-zinc-500">Search apps, calls, messages...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
