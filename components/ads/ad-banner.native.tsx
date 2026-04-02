import { useResponsive } from "@/hooks/use-responsive";
import { canUseGoogleMobileAds, loadGoogleMobileAdsModule } from "@/lib/google-mobile-ads";
import { useEffect, useMemo, useState } from "react";
import { Image, Text, View } from "react-native";

type AdBannerProps = {
  className?: string;
};

export function AdBanner({ className }: AdBannerProps) {
  const { scale } = useResponsive();
  const [nativeAd, setNativeAd] = useState<any>(null);
  const [adApi, setAdApi] = useState<any>(null);
  const hasNativeAdsModule = canUseGoogleMobileAds();

  const unitId = useMemo(() => {
    const testNativeUnitId = "ca-app-pub-3940256099942544/2247696110";
    if (__DEV__) return testNativeUnitId;
    return process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID || testNativeUnitId;
  }, []);

  useEffect(() => {
    if (!hasNativeAdsModule) return;

    let mounted = true;
    let loadedAd: any;

    loadGoogleMobileAdsModule()
      .then((mod) => {
        if (!mounted || !mod) return undefined;
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
        // Expo Go or no-fill environments skip ad rendering silently.
      });

    return () => {
      mounted = false;
      loadedAd?.destroy();
    };
  }, [hasNativeAdsModule, unitId]);

  if (!hasNativeAdsModule) return null;

  if (!nativeAd || !adApi) return null;

  const NativeAdView = adApi.NativeAdView;
  const NativeAsset = adApi.NativeAsset;
  const NativeMediaView = adApi.NativeMediaView;
  const NativeAssetType = adApi.NativeAssetType;
  const adAttributionLabel = "Sponsored";
  const adBadgeHeight = Math.max(scale(22), 22);
  const adBadgeMinWidth = Math.max(scale(94), 94);
  const adChoicesReservedWidth = Math.max(scale(28), 28);

  const nativeAdClassName = [
    className,
    "rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <NativeAdView nativeAd={nativeAd} className={nativeAdClassName} style={{ marginTop: scale(12), gap: scale(8) }}>
      <View className="flex-row items-start justify-between">
        <View
          className="rounded-md bg-black px-2.5 py-0.5"
          style={{
            minHeight: adBadgeHeight,
            minWidth: adBadgeMinWidth,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Keep attribution text explicit and high-contrast so validator can detect it reliably. */}
          <Text className="text-[11px] font-semibold text-white" numberOfLines={1}>
            {adAttributionLabel}
          </Text>
        </View>

        <View pointerEvents="none" style={{ width: adChoicesReservedWidth, height: adBadgeHeight }} />
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
