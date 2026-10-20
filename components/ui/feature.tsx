import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";
import { featureColors, type FeatureTone } from "@/constants/app-design";
import { useAppSettings } from "@/contexts/app-settings";

export type AppIconName = ComponentProps<typeof Ionicons>["name"];

export function AppIcon({
  name,
  tone = "bible",
  size = 20,
  color,
  onPrimary = false,
}: {
  name: AppIconName;
  tone?: FeatureTone;
  size?: number;
  color?: string;
  onPrimary?: boolean;
}) {
  const { theme } = useAppSettings();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? (onPrimary
        ? (theme === "dark" ? "#101917" : "#FFFFFF")
        : featureColors[tone][theme].ink)}
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function FeatureLabel({ label, icon, tone = "bible" }: {
  label: string;
  icon: AppIconName;
  tone?: FeatureTone;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <AppIcon name={icon} tone={tone} size={18} />
      <Text className="shrink font-semibold text-gray-700 dark:text-gray-200">
        {label}
      </Text>
    </View>
  );
}

export function FeatureIcon({
  name,
  tone = "bible",
  size = 46,
}: {
  name: AppIconName;
  tone?: FeatureTone;
  size?: number;
}) {
  const { theme } = useAppSettings();
  const colors = featureColors[tone][theme];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        backgroundColor: colors.soft,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <AppIcon name={name} tone={tone} size={size * 0.48} />
    </View>
  );
}

export function FeatureHeading({
  title,
  subtitle,
  icon,
  tone = "bible",
  right,
}: {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  tone?: FeatureTone;
  right?: ReactNode;
}) {
  return (
    <View className="mb-5 flex-row items-center gap-3">
      <FeatureIcon name={icon} tone={tone} size={48} />
      <View className="min-w-0 flex-1">
        <Text
          accessibilityRole="header"
          className="text-2xl font-bold text-gray-900 dark:text-white"
        >
          {title}
        </Text>
        {subtitle
          ? (
            <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              {subtitle}
            </Text>
          )
          : null}
      </View>
      {right}
    </View>
  );
}

export function EmptyState({
  message,
  icon,
  tone = "bible",
  children,
}: {
  message: string;
  icon: AppIconName;
  tone?: FeatureTone;
  children?: ReactNode;
}) {
  const { theme } = useAppSettings();
  return (
    <View
      className="items-center rounded-3xl border bg-white px-6 py-10 dark:bg-gray-900"
      style={{ borderColor: featureColors[tone][theme].border }}
    >
      <FeatureIcon name={icon} tone={tone} size={60} />
      <Text className="mt-4 text-center text-base leading-7 text-gray-600 dark:text-gray-300">
        {message}
      </Text>
      {children}
    </View>
  );
}
