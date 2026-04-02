import { useState, useEffect } from 'react';

export type Mode = 'Focus' | 'Productive' | 'Relax';

export const useLauncherMode = () => {
  const [mode, setMode] = useState<Mode>('Focus');
  const [isFocusWindow, setIsFocusWindow] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      // Focus window: 9 AM (9) to 7 PM (19)
      const inWindow = hours >= 9 && hours < 19;
      setIsFocusWindow(inWindow);
    };

    checkTime();
    const timer = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);

  return {
    mode,
    setMode,
    isFocusWindow, // Use this to enforce the 30-min Relax rule
  };
};