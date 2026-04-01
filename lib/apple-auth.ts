import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export type NativeAppleFullName = Pick<
  AppleAuthentication.AppleAuthenticationFullName,
  'givenName' | 'middleName' | 'familyName'
>;

type NativeAppleSignInResult = {
  authorizationCode: string;
  fullName: NativeAppleFullName | null;
  identityToken: string;
  nonce: string | null;
};

function createRawNonce() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export async function isNativeAppleSignInAvailable() {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithNativeApple(): Promise<NativeAppleSignInResult> {
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('APPLE_AUTH_UNAVAILABLE');
  }

  const rawNonce = createRawNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    // Supabase compares the hash of the raw nonce with the nonce claim in the ID token.
    nonce: hashedNonce,
  });

  if (!credential.identityToken || !credential.authorizationCode) {
    throw new Error('APPLE_CREDENTIAL_MISSING');
  }

  if (credential.user) {
    try {
      const credentialState = await AppleAuthentication.getCredentialStateAsync(credential.user);
      if (
        credentialState !== AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED
      ) {
        throw new Error('APPLE_AUTH_UNAUTHORIZED');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'APPLE_AUTH_UNAUTHORIZED') {
        throw error;
      }

      // On the iOS simulator this verification is known to throw, so let Supabase
      // verify the returned token pair instead of blocking the sign-in flow.
      console.warn(
        'Unable to verify Apple credential state. Continuing with returned credentials.',
        error,
      );
    }
  }

  return {
    authorizationCode: credential.authorizationCode,
    fullName: credential.fullName,
    identityToken: credential.identityToken,
    nonce: rawNonce,
  };
}
