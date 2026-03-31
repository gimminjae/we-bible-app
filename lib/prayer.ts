export function buildPrayerLabel(
  requester: string,
  target: string,
  t: (key: string) => string,
) {
  const trimmedRequester = requester.trim();
  const trimmedTarget = target.trim();

  if (trimmedTarget && trimmedRequester && trimmedRequester !== trimmedTarget) {
    return t("mypage.prayerRequestedForFormat")
      .replace("{requester}", trimmedRequester)
      .replace("{target}", trimmedTarget);
  }

  if (trimmedTarget || trimmedRequester) {
    return t("mypage.prayerForTargetFormat").replace(
      "{target}",
      trimmedTarget || trimmedRequester,
    );
  }

  return "-";
}
