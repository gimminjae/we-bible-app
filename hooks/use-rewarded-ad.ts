import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");
type RewardedAdInstance = ReturnType<GoogleMobileAdsModule["RewardedAd"]["createForAdRequest"]>;

export function useRewardedAd() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const adRef = useRef<RewardedAdInstance | null>(null);
  const apiRef = useRef<{
    AdEventType: GoogleMobileAdsModule["AdEventType"];
    RewardedAdEventType: GoogleMobileAdsModule["RewardedAdEventType"];
  } | null>(null);
  const resolveRef = useRef<((value: void) => void) | null>(null);
  const rejectRef = useRef<((reason?: unknown) => void) | null>(null);

  const load = useCallback(() => {
    if (Platform.OS === "web") return;
    setLoading(true);
    setLoaded(false);
    import("react-native-google-mobile-ads")
      .then((mod) => {
        apiRef.current = { AdEventType: mod.AdEventType, RewardedAdEventType: mod.RewardedAdEventType };
        const unitId = __DEV__
          ? mod.TestIds.REWARDED
          : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID ?? REWARDED_TEST_ID);
        const ad = mod.RewardedAd.createForAdRequest(unitId);
        adRef.current = ad;
        ad.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
          setLoaded(true);
          setLoading(false);
        });
        ad.load();
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return () => {
      adRef.current = null;
      apiRef.current = null;
      resolveRef.current = null;
      rejectRef.current = null;
    };
  }, [load]);

  const show = useCallback((): Promise<void> => {
    if (Platform.OS === "web") return Promise.resolve();
    const ad = adRef.current;
    const api = apiRef.current;
    if (!ad || !api || !loaded) return Promise.reject(new Error("Ad not loaded"));

    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;

      const unsubEarned = ad.addAdEventListener(api.RewardedAdEventType.EARNED_REWARD, () => {
        resolveRef.current?.();
        resolveRef.current = null;
        rejectRef.current = null;
        unsubEarned();
        unsubClosed();
        setLoaded(false);
        load();
      });
      const unsubClosed = ad.addAdEventListener(api.AdEventType.CLOSED, () => {
        if (rejectRef.current) rejectRef.current(new Error("Ad closed without reward"));
        rejectRef.current = null;
        resolveRef.current = null;
        unsubEarned();
        unsubClosed();
        setLoaded(false);
        load();
      });

      ad.show().catch((err: unknown) => {
        reject(err);
        rejectRef.current = null;
        resolveRef.current = null;
      });
    });
  }, [loaded, load]);

  return { show, loaded, loading };
}
