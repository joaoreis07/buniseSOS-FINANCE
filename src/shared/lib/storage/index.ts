import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./storage-provider";

let provider: StorageProvider | null = null;

/**
 * Storage abstraction for future receipt/attachment uploads.
 * MVP: local filesystem under public/uploads.
 */
export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider = new LocalStorageProvider();
  }
  return provider;
}

export type { StorageProvider, StorageObject, StorageUploadInput } from "./storage-provider";
export { LocalStorageProvider } from "./local-storage-provider";
