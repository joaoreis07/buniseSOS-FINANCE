export type StorageUploadInput = {
  fileName: string;
  contentType: string;
  data: Buffer | Uint8Array;
  folder?: string;
};

export type StorageObject = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

export interface StorageProvider {
  upload(input: StorageUploadInput): Promise<StorageObject>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}
