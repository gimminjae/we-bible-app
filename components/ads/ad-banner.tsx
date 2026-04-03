import { AdBannerPreview } from "@/components/ads/ad-banner-preview";

type AdBannerProps = {
  className?: string;
};

export function AdBanner(props: AdBannerProps) {
  if (__DEV__) {
    return <AdBannerPreview className={props.className} />;
  }

  return null;
}

