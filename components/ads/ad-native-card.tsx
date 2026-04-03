import { AdBannerPreview } from "@/components/ads/ad-banner-preview";

type AdNativeCardProps = {
  className?: string;
};

export function AdNativeCard({ className }: AdNativeCardProps) {
  if (__DEV__) {
    return (
      <AdBannerPreview
        className={className}
        label="\uB124\uC774\uD2F0\uBE0C \uAD11\uACE0 \uBBF8\uB9AC\uBCF4\uAE30 (\uAC1C\uBC1C\uD658\uACBD)"
        slotText="AdMob Native"
        slotMinHeight={180}
      />
    );
  }

  return null;
}
