// Keep Metro's web dependency graph free of the native-only advertising package.
export function canUseGoogleMobileAds() {
  return false;
}

export async function loadGoogleMobileAdsModule(): Promise<
  typeof import('react-native-google-mobile-ads') | null
> {
  return null;
}
