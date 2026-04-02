import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useMode } from '@/src/hooks/useMode';

export default function FocusScreen() {
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

  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <View className="bg-accent rounded-2xl p-8 mb-8">
        <Text className="text-4xl font-bold text-paper text-center">
          {formattedTime}
        </Text>
      </View>
      
      <Text className="text-2xl font-semibold text-paper mb-8">
        {currentConfig.name}
      </Text>
      
      <Text className="text-paper text-center mb-8 px-8">
        {currentConfig.description}
      </Text>
      
      <View className="flex-row gap-4 mb-8">
        <Pressable
          onPress={toggleTimer}
          className={`px-8 py-3 rounded-lg ${
            isActive 
              ? 'bg-red-500' 
              : 'bg-accent'
          }`}
        >
          <Text className="text-paper font-semibold">
            {isActive ? 'Pause' : 'Start'}
          </Text>
        </Pressable>
        
        <Pressable
          onPress={resetTimer}
          className="bg-gray-600 px-8 py-3 rounded-lg"
        >
          <Text className="text-paper font-semibold">Reset</Text>
        </Pressable>
      </View>
      
      <View className="flex-row gap-2">
        {(['Focus', 'Productive', 'Relax'] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => switchMode(mode)}
            className={`px-4 py-2 rounded-lg ${
              currentMode === mode
                ? 'bg-accent'
                : 'bg-gray-700'
            }`}
          >
            <Text className="text-paper text-sm capitalize">
              {mode.toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
