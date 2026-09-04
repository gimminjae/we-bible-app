import type { ExpoConfig } from 'expo/config';

const appJson = require('./app.json') as { expo: ExpoConfig };

function readEnvValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

export default function createExpoConfig(): ExpoConfig {
  const baseConfig = appJson.expo;

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra ?? {}),
      awsS3: {
        region: readEnvValue('NEXT_PUBLIC_AWS_REGION', 'EXPO_PUBLIC_AWS_REGION'),
        bucketName: readEnvValue(
          'NEXT_PUBLIC_AWS_S3_BUCKET_NAME',
          'EXPO_PUBLIC_AWS_S3_BUCKET_NAME',
        ),
        accessKeyId: readEnvValue(
          'NEXT_PUBLIC_AWS_ACCESS_KEY_ID',
          'EXPO_PUBLIC_AWS_ACCESS_KEY_ID',
        ),
        secretAccessKey: readEnvValue(
          'NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY',
          'EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY',
        ),
        publicBaseUrl: readEnvValue(
          'NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL',
          'EXPO_PUBLIC_AWS_S3_PUBLIC_BASE_URL',
        ),
      },
    },
  };
}
