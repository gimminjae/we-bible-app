import * as ExpoCrypto from 'expo-crypto';

type CryptoGlobal = {
  crypto?: {
    getRandomValues?: typeof ExpoCrypto.getRandomValues;
    randomUUID?: typeof ExpoCrypto.randomUUID;
  };
};

const cryptoGlobal = globalThis as unknown as CryptoGlobal;

cryptoGlobal.crypto ??= {};
cryptoGlobal.crypto.getRandomValues ??= ExpoCrypto.getRandomValues;
cryptoGlobal.crypto.randomUUID ??= ExpoCrypto.randomUUID;
