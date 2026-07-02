import { Platform } from 'react-native';

export interface NativeMediaInfo {
  isPlaying: boolean;
  track: string;
  artist: string;
  packageName: string;
  appName: string;
}

export interface NativeEmailInfo {
  sender: string;
  subject: string;
  count: number;
  packageName: string;
  appName: string;
  postTime: number;
  apps?: EmailAppSummary[];
}

export interface EmailAppSummary {
  packageName: string;
  appName: string;
  sender: string;
  subject: string;
  count: number;
  postTime: number;
}

export type MediaCommand = 'play' | 'pause' | 'playPause' | 'next' | 'previous';

interface LauncherDashboardModule {
  isNotificationAccessGranted(): boolean;
  openNotificationAccessSettings(): void;
  getMediaInfo(): NativeMediaInfo | null;
  sendMediaCommand(action: MediaCommand): void;
  getLatestEmail(): NativeEmailInfo | null;
}

const nativeModule: LauncherDashboardModule | null = (() => {
  if (Platform.OS !== 'android') {
    return null;
  }
  try {
    const { requireNativeModule } = require('expo-modules-core');
    return requireNativeModule('LauncherDashboard');
  } catch {
    return null;
  }
})();

export const isDashboardAvailable = nativeModule !== null;

export function isNotificationAccessGranted(): boolean {
  try {
    return nativeModule?.isNotificationAccessGranted() ?? false;
  } catch {
    return false;
  }
}

export function openNotificationAccessSettings(): void {
  try {
    nativeModule?.openNotificationAccessSettings();
  } catch {
    // ignore
  }
}

export function getMediaInfo(): NativeMediaInfo | null {
  try {
    return nativeModule?.getMediaInfo() ?? null;
  } catch {
    return null;
  }
}

export function sendMediaCommand(action: MediaCommand): void {
  try {
    nativeModule?.sendMediaCommand(action);
  } catch {
    // ignore
  }
}

export function getLatestEmail(): NativeEmailInfo | null {
  try {
    return nativeModule?.getLatestEmail() ?? null;
  } catch {
    return null;
  }
}
