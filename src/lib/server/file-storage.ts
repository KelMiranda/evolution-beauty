import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { randomUUID } from 'node:crypto';

export type FileStorageKind = 'photo' | 'document' | 'certificate';

export type StoredFile = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type FileStorage = {
  save(input: { bytes: Uint8Array; originalName: string; mimeType: string; kind: FileStorageKind }): Promise<StoredFile>;
  read(storageKey: string): Promise<Uint8Array>;
  remove(storageKey: string): Promise<void>;
};

const storageRoot = process.env.FILE_STORAGE_ROOT?.trim() || path.join(process.cwd(), 'storage');

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

function safeName(name: string) {
  return name.replaceAll(/[^a-zA-Z0-9._-]+/g, '_');
}

export function createLocalFileStorage(root = storageRoot): FileStorage {
  return {
    async save(input) {
      const folder = path.join(root, input.kind);
      await ensureDir(folder);

      const storageKey = `${input.kind}/${randomUUID()}-${safeName(input.originalName)}`;
      const filePath = path.join(root, storageKey);
      await writeFile(filePath, input.bytes);

      return {
        storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.bytes.byteLength,
      };
    },
    async read(storageKey) {
      const filePath = path.join(root, storageKey);
      return readFile(filePath);
    },
    async remove(storageKey) {
      const filePath = path.join(root, storageKey);
      await unlink(filePath).catch(() => {});
    },
  };
}

export const fileStorage = createLocalFileStorage();
