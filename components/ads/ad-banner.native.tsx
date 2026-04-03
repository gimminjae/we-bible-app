import { AdBannerPreview } from "@/components/ads/ad-banner-preview";
import { useResponsive } from "@/hooks/use-responsive";
import { canUseGoogleMobileAds, loadGoogleMobileAdsModule } from "@/lib/google-mobile-ads";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, View } from "react-native";

type AdBannerProps = {
  className?: string;
};

const IOS_BANNER_UNIT_ID = "ca-app-pub-4493633870090510/3852124487";

export function AdBanner({ className }: AdBannerProps) {
  const { scale } = useResponsive();
  const [adApi, setAdApi] = useState<any>(null);
  const bannerRef = useRef<{ load?: () => void } | null>(null);
  const hasGoogleMobileAds = canUseGoogleMobileAds();

  const productionUnitId = useMemo(() => {
    if (Platform.OS === "ios") {
      return process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS_UNIT_ID || process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID || IOS_BANNER_UNIT_ID;
    }

    return process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID_UNIT_ID || process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID || null;
  }, []);

  useEffect(() => {
    if (!hasGoogleMobileAds) return;

    let mounted = true;

    loadGoogleMobileAdsModule()
      .then((mod) => {
        if (!mounted || !mod) return;
        setAdApi(mod);
      })
      .catch(() => {
        // Ignore ad loading in environments without the native module.
      });

    return () => {
      mounted = false;
    };
  }, [hasGoogleMobileAds]);

  useEffect(() => {
    if (!adApi || Platform.OS !== "ios") return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        bannerRef.current?.load?.();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [adApi]);

  if (__DEV__ && !hasGoogleMobileAds) {
    return <AdBannerPreview className={className} label="배너 광고 미리보기 (Expo Go)" />;
  }

  if (!hasGoogleMobileAds || !adApi) {
    return null;
  }

  const BannerAd = adApi.BannerAd;
  const BannerAdSize = adApi.BannerAdSize;
  const TestIds = adApi.TestIds;
  const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : productionUnitId;

  if (!unitId) {
    return null;
  }

  const containerClassName = [className, "items-center"].filter(Boolean).join(" ");

  return (
    <View className={containerClassName} style={{ marginTop: scale(12) }}>
      <BannerAd ref={bannerRef} unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
