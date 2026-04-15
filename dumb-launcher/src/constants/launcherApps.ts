import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type LauncherApp = {
  id: string;
  name: string;
  category: string;
  scheme: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
};

export const ALL_LAUNCHER_APPS: LauncherApp[] = [
  { id: '1', name: 'Amazon', category: 'Shopping', scheme: 'https://www.amazon.com', icon: 'shopping-bag' },
  { id: '2', name: 'Calculator', category: 'Utility', scheme: 'calculator:', icon: 'calculate' },
  { id: '3', name: 'Instagram', category: 'Communication', scheme: 'instagram://', icon: 'photo-camera' },
  { id: '4', name: 'Maps', category: 'Navigation', scheme: 'geo:', icon: 'map' },
  { id: '5', name: 'Netflix', category: 'Entertainment', scheme: 'nflx://', icon: 'movie' },
  { id: '6', name: 'Settings', category: 'System', scheme: 'app-settings:', icon: 'settings' },
  { id: '7', name: 'Slack', category: 'Work', scheme: 'slack://', icon: 'work' },
  { id: '8', name: 'YouTube', category: 'Entertainment', scheme: 'youtube://', icon: 'play-circle-filled' },
  { id: '9', name: 'Phone', category: 'Communication', scheme: 'tel:', icon: 'phone' },
  { id: '10', name: 'Messages', category: 'Communication', scheme: 'sms:', icon: 'chat' },
  { id: '11', name: 'Contacts', category: 'Utility', scheme: 'content://contacts/people', icon: 'contacts' },
  { id: '12', name: 'Calendar', category: 'Productivity', scheme: 'content://calendar', icon: 'calendar-month' },
  { id: '13', name: 'Camera', category: 'Utility', scheme: 'camera:', icon: 'camera-alt' }
];

export const HOME_LAUNCHER_APP_NAMES = ['Phone', 'Messages', 'Contacts', 'Calendar', 'Camera'];
export const PRODUCTIVE_LAUNCHER_APP_NAMES = ['Slack', 'Messages', 'Contacts', 'Calculator', 'Settings'];
