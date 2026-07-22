import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type {
  StorageObject,
  StorageProvider,
  StorageUploadInput,
} from "./storage-provider";

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly baseDir = path.join(process.cwd(), "public", "uploads")) {}

  async upload(input: StorageUploadInput): Promise<StorageObject> {
    const folder = input.folder ?? "files";
    const dir = path.join(this.baseDir, folder);
    await mkdir(dir, { recursive: true });

    const key = path.posix.join(folder, `${Date.now()}-${input.fileName}`);
    const absolutePath = path.join(this.baseDir, key);
    await writeFile(absolutePath, input.data);

    return {
      key,
      url: `/uploads/${key}`,
      size: input.data.byteLength,
      contentType: input.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    const absolutePath = path.join(this.baseDir, key);
    await unlink(absolutePath).catch(() => undefined);
  }

  async getUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }
}
