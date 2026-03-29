import {
  WE_BIBLE_APP_AUTH_CALLBACK_URL,
  WE_BIBLE_APP_SCHEME,
  WE_BIBLE_WEB_HOST,
  WE_BIBLE_WEB_URL,
} from '@/components/hybrid/we-bible-web.constants';

let pendingAuthCallbackUrl: string | null = null;

function parseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isWeBibleWebUrl(url: string) {
  const parsedUrl = parseUrl(url);
  return parsedUrl?.host === WE_BIBLE_WEB_HOST;
}

export function isWeBibleAppAuthCallbackUrl(url: string) {
  const parsedUrl = parseUrl(url);

  return (
    parsedUrl?.protocol === `${WE_BIBLE_APP_SCHEME}:` &&
    parsedUrl.host === 'auth' &&
    parsedUrl.pathname === '/callback'
  );
}

export function isWeBibleWebAuthCallbackUrl(url: string) {
  const parsedUrl = parseUrl(url);

  return (
    parsedUrl?.host === WE_BIBLE_WEB_HOST &&
    parsedUrl.pathname === '/auth/callback'
  );
}

export function buildAppAuthCallbackUrl(webUrl: string) {
  if (!isWeBibleWebAuthCallbackUrl(webUrl)) return null;

  const parsedWebUrl = new URL(webUrl);
  const appCallbackUrl = new URL(WE_BIBLE_APP_AUTH_CALLBACK_URL);

  parsedWebUrl.searchParams.forEach((value, key) => {
    appCallbackUrl.searchParams.append(key, value);
  });

  return appCallbackUrl.toString();
}

export function buildWebAuthCallbackUrl(appUrl: string) {
  if (!isWeBibleAppAuthCallbackUrl(appUrl)) return null;

  const parsedAppUrl = new URL(appUrl);
  const webCallbackUrl = new URL('/auth/callback', WE_BIBLE_WEB_URL);

  parsedAppUrl.searchParams.forEach((value, key) => {
    webCallbackUrl.searchParams.append(key, value);
  });

  return webCallbackUrl.toString();
}

export function rewriteOAuthRedirectUrl(url: string) {
  const parsedUrl = parseUrl(url);
  if (!parsedUrl) return null;

  let hasChanges = false;

  for (const paramName of ['redirect_to', 'redirect_uri']) {
    const paramValue = parsedUrl.searchParams.get(paramName);
    if (!paramValue) continue;

    const appCallbackUrl = buildAppAuthCallbackUrl(paramValue);
    if (!appCallbackUrl) continue;

    parsedUrl.searchParams.set(paramName, appCallbackUrl);
    hasChanges = true;
  }

  return hasChanges ? parsedUrl.toString() : null;
}

export function setPendingAuthCallbackUrl(url: string) {
  pendingAuthCallbackUrl = url;
}

export function consumePendingAuthCallbackUrl() {
  const nextUrl = pendingAuthCallbackUrl;
  pendingAuthCallbackUrl = null;
  return nextUrl;
}

export function buildAppAuthCallbackUrlFromSearchParams(
  params: Record<string, string | string[] | undefined>
) {
  const appCallbackUrl = new URL(WE_BIBLE_APP_AUTH_CALLBACK_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      appCallbackUrl.searchParams.append(key, value);
      return;
    }

    value?.forEach((item) => {
      appCallbackUrl.searchParams.append(key, item);
    });
  });

  return appCallbackUrl.toString();
}
