import { useState, useEffect } from 'react';
import { useLauncherMode } from './useLauncherMode';

export type Mode = 'Focus' | 'Productive' | 'Relax';

export interface ModeConfig {
  name: string;
  duration: number; // in minutes
  color: string;
  description: string;
}

export const modeConfigs: Record<Mode, ModeConfig> = {
  Focus: {
    name: 'Focus Mode',
    duration: 25,
    color: '#3B82F6',
    description: 'Deep work session with minimal distractions'
  },
  Productive: {
    name: 'Productive Mode', 
    duration: 45,
    color: '#10B981',
    description: 'Balanced work session for general tasks'
  },
  Relax: {
    name: 'Relax Mode',
    duration: 15,
    color: '#8B5CF6',
    description: 'Break time to recharge and refocus'
  }
};

export function useMode() {
  const { mode: launcherMode, setMode: setLauncherMode, isFocusWindow } = useLauncherMode();
  const [timeRemaining, setTimeRemaining] = useState(modeConfigs.Focus.duration * 60);
  const [isActive, setIsActive] = useState(false);

  // Enforce 30-min Relax rule outside 9-7 window
  useEffect(() => {
    if (!isFocusWindow && launcherMode !== 'Relax') {
      setLauncherMode('Relax');
      setTimeRemaining(modeConfigs.Relax.duration * 60);
      setIsActive(false);
    }
  }, [isFocusWindow, launcherMode, setLauncherMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  const switchMode = (mode: Mode) => {
    // Prevent switching away from Relax outside 9-7 window
    if (!isFocusWindow && mode !== 'Relax') {
      return;
    }
    
    setLauncherMode(mode);
    setTimeRemaining(modeConfigs[mode].duration * 60);
    setIsActive(false);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setTimeRemaining(modeConfigs[launcherMode].duration * 60);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    currentMode: launcherMode,
    timeRemaining,
    isActive,
    formattedTime: formatTime(timeRemaining),
    currentConfig: modeConfigs[launcherMode],
    isFocusWindow,
    switchMode,
    toggleTimer,
    resetTimer
  };
}
