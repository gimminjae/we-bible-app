import { AdBannerPreview } from "@/components/ads/ad-banner-preview";
import { useResponsive } from "@/hooks/use-responsive";
import { canUseGoogleMobileAds, loadGoogleMobileAdsModule } from "@/lib/google-mobile-ads";
import { useEffect, useMemo, useState } from "react";
import { Image, Platform, Text, View } from "react-native";

type AdNativeCardProps = {
  className?: string;
};

const NATIVE_UNIT_IDS = {
  ios: "ca-app-pub-4493633870090510/7025944165",
  android: "ca-app-pub-4493633870090510/2846046065",
} as const;

export function AdNativeCard({ className }: AdNativeCardProps) {
  const { scale } = useResponsive();
  const [nativeAd, setNativeAd] = useState<any>(null);
  const [adApi, setAdApi] = useState<any>(null);
  const hasNativeAdsModule = canUseGoogleMobileAds();

  const productionUnitId = useMemo(() => {
    if (Platform.OS === "ios") {
      return process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS_UNIT_ID || process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID || NATIVE_UNIT_IDS.ios;
    }

    return process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID_UNIT_ID || process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID || NATIVE_UNIT_IDS.android;
  }, []);

  useEffect(() => {
    if (!hasNativeAdsModule) return;

    let mounted = true;
    let loadedAd: any;

    loadGoogleMobileAdsModule()
      .then((mod) => {
        if (!mounted || !mod) return undefined;

        const unitId = __DEV__ ? mod.TestIds.NATIVE : productionUnitId;
        setAdApi(mod);

        return mod.NativeAd.createForAdRequest(unitId, {
          adChoicesPlacement: mod.NativeAdChoicesPlacement.TOP_RIGHT,
          aspectRatio: mod.NativeMediaAspectRatio.LANDSCAPE,
          startVideoMuted: true,
        });
      })
      .then((ad) => {
        if (!ad) return;
        loadedAd = ad;
        if (!mounted) {
          ad.destroy();
          return;
        }
        setNativeAd(ad);
      })
      .catch(() => {
        // Keep the modal usable even when the ad is unavailable.
      });

    return () => {
      mounted = false;
      loadedAd?.destroy();
    };
  }, [hasNativeAdsModule, productionUnitId]);

  if (__DEV__ && (!hasNativeAdsModule || !nativeAd || !adApi)) {
    return (
      <AdBannerPreview
        className={className}
        label={
          hasNativeAdsModule
            ? "\uB124\uC774\uD2F0\uBE0C \uAD11\uACE0 \uBBF8\uB9AC\uBCF4\uAE30 (\uAC1C\uBC1C\uD658\uACBD)"
            : "\uB124\uC774\uD2F0\uBE0C \uAD11\uACE0 \uBBF8\uB9AC\uBCF4\uAE30 (Expo Go)"
        }
        slotText="AdMob Native"
        slotMinHeight={Math.max(scale(180), 180)}
      />
    );
  }

  if (!hasNativeAdsModule || !nativeAd || !adApi) {
    return null;
  }

  const NativeAdView = adApi.NativeAdView;
  const NativeAsset = adApi.NativeAsset;
  const NativeMediaView = adApi.NativeMediaView;
  const NativeAssetType = adApi.NativeAssetType;
  const adAttributionLabel = Platform.OS === "ios" ? "Ad" : "\uAD11\uACE0";
  const adBadgeHeight = Math.max(scale(22), 22);
  const adBadgeMinWidth = Math.max(scale(42), 42);
  const adChoicesReservedWidth = Math.max(scale(40), 40);
  const adContentTopPadding = adBadgeHeight + scale(10);
  const nativeAdClassName = [className, "rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900"]
    .filter(Boolean)
    .join(" ");

  return (
    <NativeAdView
      nativeAd={nativeAd}
      className={nativeAdClassName}
      style={{ marginTop: scale(12), gap: scale(8), position: "relative", paddingTop: adContentTopPadding }}
    >
      <View
        className="flex-row items-start justify-between"
        pointerEvents="none"
        style={{ left: 0, position: "absolute", right: 0, top: 0, zIndex: 1 }}
      >
        <View
          className="rounded-md bg-black px-3"
          style={{
            minHeight: adBadgeHeight,
            minWidth: adBadgeMinWidth,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text className="text-[12px] font-bold text-white" numberOfLines={1}>
            {adAttributionLabel}
          </Text>
        </View>

        <View style={{ width: adChoicesReservedWidth, height: adBadgeHeight }} />
      </View>

      <View className="flex-row items-center" style={{ gap: scale(8) }}>
        {nativeAd.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image
              source={{ uri: nativeAd.icon.url }}
              style={{ width: scale(28), height: scale(28), borderRadius: scale(6) }}
            />
          </NativeAsset>
        ) : null}

        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text className="flex-1 font-semibold text-gray-900 dark:text-white" numberOfLines={2}>
            {nativeAd.headline}
          </Text>
        </NativeAsset>
      </View>

      {nativeAd.advertiser ? (
        <NativeAsset assetType={NativeAssetType.ADVERTISER}>
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400" numberOfLines={1}>
            {nativeAd.advertiser}
          </Text>
        </NativeAsset>
      ) : null}

      <NativeMediaView style={{ width: "100%", aspectRatio: 1.91 }} />

      {nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text className="text-sm text-gray-700 dark:text-gray-200" numberOfLines={2}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      ) : null}

      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text className="rounded-lg bg-primary-500 px-3 py-2 text-center font-semibold text-white">
            {nativeAd.callToAction}
          </Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}
