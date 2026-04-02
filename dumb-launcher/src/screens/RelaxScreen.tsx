import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useMode } from '@/src/hooks/useMode';

export default function RelaxScreen() {
  const { 
    currentMode, 
    timeRemaining, 
    isActive, 
    formattedTime, 
    currentConfig,
    toggleTimer,
    resetTimer,
    switchMode
  } = useMode();

  const relaxActivities = [
    'Deep breathing exercises',
    'Stretch your body',
    'Look away from screen',
    'Drink water',
    'Walk around',
    'Listen to calm music'
  ];

  return (
    <View className="flex-1 bg-canvas">
      <View className="bg-purple-600 p-6 mb-6">
        <Text className="text-3xl font-bold text-paper text-center mb-2">
          {formattedTime}
        </Text>
        <Text className="text-paper text-center">
          {currentConfig.name}
        </Text>
      </View>
      
      <View className="flex-row justify-center gap-4 mb-6 px-6">
        <Pressable
          onPress={toggleTimer}
          className={`flex-1 py-3 rounded-lg ${
            isActive 
              ? 'bg-red-500' 
              : 'bg-purple-600'
          }`}
        >
          <Text className="text-paper font-semibold text-center">
            {isActive ? 'Pause' : 'Start'}
          </Text>
        </Pressable>
        
        <Pressable
          onPress={resetTimer}
          className="flex-1 bg-gray-600 py-3 rounded-lg"
        >
          <Text className="text-paper font-semibold text-center">Reset</Text>
        </Pressable>
      </View>
      
      <ScrollView className="flex-1 px-6">
        <Text className="text-xl font-semibold text-paper mb-4">
          Relax Activities
        </Text>
        
        {relaxActivities.map((activity, index) => (
          <View key={index} className="bg-purple-900 bg-opacity-30 p-4 rounded-lg mb-3">
            <Text className="text-paper">{activity}</Text>
          </View>
        ))}
        
        <View className="bg-purple-900 bg-opacity-20 p-6 rounded-lg mb-6">
          <Text className="text-purple-300 text-sm text-center italic">
            "Take care of your body. It's the only place you have to live."
          </Text>
        </View>
      </ScrollView>
      
      <View className="flex-row gap-2 p-6">
        {(['Focus', 'Productive', 'Relax'] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => switchMode(mode)}
            className={`flex-1 py-2 rounded-lg ${
              currentMode === mode
                ? mode === 'Relax' ? 'bg-purple-600' : 'bg-accent'
                : 'bg-gray-700'
            }`}
          >
            <Text className="text-paper text-xs text-center capitalize">
              {mode.toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
