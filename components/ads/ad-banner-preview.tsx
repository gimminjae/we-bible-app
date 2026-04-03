import { useResponsive } from "@/hooks/use-responsive";
import { Text, View } from "react-native";

type AdBannerPreviewProps = {
  className?: string;
  label?: string;
};

export function AdBannerPreview({
  className,
  label = "배너 광고 미리보기 (개발환경)",
}: AdBannerPreviewProps) {
  const { scale } = useResponsive();
  const containerClassName = [className, "items-center"].filter(Boolean).join(" ");

  return (
    <View className={containerClassName} style={{ marginTop: scale(12) }}>
      <View
        className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-100 px-3 py-3 dark:border-gray-700 dark:bg-gray-900"
        style={{ gap: scale(8), maxWidth: scale(360) }}
      >
        <Text className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {label}
        </Text>

        <View
          className="w-full rounded-lg border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
          style={{ minHeight: Math.max(scale(56), 56), justifyContent: "center" }}
        >
          <Text className="text-center text-xs font-semibold uppercase tracking-[0.4px] text-gray-400 dark:text-gray-500">
            AdMob Banner
          </Text>
        </View>
      </View>
    </View>
  );
}
