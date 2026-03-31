import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

export function canUseGoogleMobileAds() {
  if (Platform.OS === 'web') {
    return false;
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }

  return Boolean(NativeModules.RNGoogleMobileAdsModule);
}

export async function loadGoogleMobileAdsModule() {
  if (!canUseGoogleMobileAds()) {
    return null;
  }

  try {
    return await import('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}
