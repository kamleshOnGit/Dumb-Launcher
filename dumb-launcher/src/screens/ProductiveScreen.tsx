import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useMode } from '@/src/hooks/useMode';

export default function ProductiveScreen() {
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

  const tasks = [
    'Review project documentation',
    'Update dependencies',
    'Code review PR #123',
    'Write unit tests',
    'Optimize performance'
  ];

  return (
    <View className="flex-1 bg-canvas">
      <View className="bg-accent p-6 mb-6">
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
              : 'bg-accent'
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
          Today's Tasks
        </Text>
        
        {tasks.map((task, index) => (
          <View key={index} className="bg-gray-800 p-4 rounded-lg mb-3">
            <Text className="text-paper">{task}</Text>
          </View>
        ))}
      </ScrollView>
      
      <View className="flex-row gap-2 p-6">
        {(['Focus', 'Productive', 'Relax'] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => switchMode(mode)}
            className={`flex-1 py-2 rounded-lg ${
              currentMode === mode
                ? 'bg-accent'
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
