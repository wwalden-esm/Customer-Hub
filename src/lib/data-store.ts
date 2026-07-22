import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface DataStore {
  read<T>(key: string, fallback: T): T;
  write<T>(key: string, data: T): void;
}

class LocalFileStore implements DataStore {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  read<T>(key: string, fallback: T): T {
    const filePath = join(this.basePath, `${key}.json`);
    if (!existsSync(filePath)) return fallback;
    try {
      return JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      return fallback;
    }
  }

  write<T>(key: string, data: T): void {
    const filePath = join(this.basePath, `${key}.json`);
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  }
}

let store: DataStore | null = null;

export function getDataStore(): DataStore {
  if (store) return store;

  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.log("Azure Blob storage configured but adapter not yet implemented — using local files");
  }

  store = new LocalFileStore(join(process.cwd(), "config"));
  return store;
}

export function createJsonStore<T>(key: string, fallback: T) {
  return {
    load(): T {
      return getDataStore().read(key, fallback);
    },
    save(data: T): void {
      getDataStore().write(key, data);
    },
  };
}
