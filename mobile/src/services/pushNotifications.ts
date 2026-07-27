import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export interface DevicePushToken {
  token: string;
  platform: 'ios' | 'android';
}

/**
 * Requests notification permission and returns the raw native FCM/APNs device token
 * (not an Expo push token) — the backend's push service (firebase-admin) expects a
 * raw device token, so this is the one to send to POST /users/me/device-token.
 */
export async function registerForPushNotifications(): Promise<DevicePushToken | null> {
  if (!Device.isDevice) return null; // push tokens aren't available on simulators/emulators
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const { data } = await Notifications.getDevicePushTokenAsync();
  return { token: data, platform: Platform.OS };
}
