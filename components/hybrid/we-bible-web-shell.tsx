import type { ComponentType } from 'react';
import { Platform } from 'react-native';

export function WeBibleWebShell() {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebShell: ComponentType = require('@/components/hybrid/we-bible-web-shell.web').WeBibleWebShell;
    return <WebShell />;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NativeShell: ComponentType = require('@/components/hybrid/we-bible-web-shell.native').WeBibleWebShell;
  return <NativeShell />;
}
