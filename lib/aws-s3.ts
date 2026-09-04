import { S3Client } from '@aws-sdk/client-s3';
import Constants from 'expo-constants';

type AwsS3Extra = {
  awsS3?: {
    region?: string;
    bucketName?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
  };
} & Record<string, unknown>;

export type AwsS3Config = {
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

let s3Client: S3Client | null = null;

function readStringValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getExpoExtra(): AwsS3Extra | null {
  return (Constants.expoConfig?.extra ?? null) as AwsS3Extra | null;
}

function readAwsConfigValue(options: {
  nextPublicName: string;
  expoPublicName: string;
  nestedKey: keyof NonNullable<AwsS3Extra['awsS3']>;
}) {
  const extra = getExpoExtra();

  return (
    readStringValue(process.env[options.nextPublicName]) ??
    readStringValue(process.env[options.expoPublicName]) ??
    readStringValue(extra?.[options.nextPublicName]) ??
    readStringValue(extra?.[options.expoPublicName]) ??
    readStringValue(extra?.awsS3?.[options.nestedKey]) ??
    null
  );
}

function normalizePublicBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function isAwsS3Configured() {
  return Boolean(
    readAwsConfigValue({
      nextPublicName: 'NEXT_PUBLIC_AWS_REGION',
      expoPublicName: 'EXPO_PUBLIC_AWS_REGION',
      nestedKey: 'region',
    }) &&
      readAwsConfigValue({
        nextPublicName: 'NEXT_PUBLIC_AWS_S3_BUCKET_NAME',
        expoPublicName: 'EXPO_PUBLIC_AWS_S3_BUCKET_NAME',
        nestedKey: 'bucketName',
      }) &&
      readAwsConfigValue({
        nextPublicName: 'NEXT_PUBLIC_AWS_ACCESS_KEY_ID',
        expoPublicName: 'EXPO_PUBLIC_AWS_ACCESS_KEY_ID',
        nestedKey: 'accessKeyId',
      }) &&
      readAwsConfigValue({
        nextPublicName: 'NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY',
        expoPublicName: 'EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY',
        nestedKey: 'secretAccessKey',
      }) &&
      readAwsConfigValue({
        nextPublicName: 'NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL',
        expoPublicName: 'EXPO_PUBLIC_AWS_S3_PUBLIC_BASE_URL',
        nestedKey: 'publicBaseUrl',
      }),
  );
}

export function requireAwsS3Config(): AwsS3Config {
  const region = readAwsConfigValue({
    nextPublicName: 'NEXT_PUBLIC_AWS_REGION',
    expoPublicName: 'EXPO_PUBLIC_AWS_REGION',
    nestedKey: 'region',
  });
  const bucketName = readAwsConfigValue({
    nextPublicName: 'NEXT_PUBLIC_AWS_S3_BUCKET_NAME',
    expoPublicName: 'EXPO_PUBLIC_AWS_S3_BUCKET_NAME',
    nestedKey: 'bucketName',
  });
  const accessKeyId = readAwsConfigValue({
    nextPublicName: 'NEXT_PUBLIC_AWS_ACCESS_KEY_ID',
    expoPublicName: 'EXPO_PUBLIC_AWS_ACCESS_KEY_ID',
    nestedKey: 'accessKeyId',
  });
  const secretAccessKey = readAwsConfigValue({
    nextPublicName: 'NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY',
    expoPublicName: 'EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY',
    nestedKey: 'secretAccessKey',
  });
  const publicBaseUrl = readAwsConfigValue({
    nextPublicName: 'NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL',
    expoPublicName: 'EXPO_PUBLIC_AWS_S3_PUBLIC_BASE_URL',
    nestedKey: 'publicBaseUrl',
  });

  if (!region || !bucketName || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error('AWS_S3_NOT_CONFIGURED');
  }

  return {
    region,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: normalizePublicBaseUrl(publicBaseUrl),
  };
}

export function createS3Client() {
  if (!s3Client) {
    const config = requireAwsS3Config();
    s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return s3Client;
}

export function getPublicS3ObjectUrl(objectKey: string) {
  const { publicBaseUrl } = requireAwsS3Config();
  const normalizedObjectKey = objectKey
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${publicBaseUrl}/${normalizedObjectKey}`;
}
