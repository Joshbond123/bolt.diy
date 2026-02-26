export type LocalDbShape = {
  apiKeys: Record<string, string>;
  updatedAt: string;
};

const DEFAULT_DB: LocalDbShape = {
  apiKeys: {},
  updatedAt: new Date(0).toISOString(),
};

const LOCAL_DB_PATH = 'data/local-db.json';

async function readDbFile(): Promise<LocalDbShape> {
  try {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(LOCAL_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LocalDbShape>;

    return {
      apiKeys: parsed.apiKeys || {},
      updatedAt: parsed.updatedAt || DEFAULT_DB.updatedAt,
    };
  } catch {
    return { ...DEFAULT_DB };
  }
}

async function writeDbFile(db: LocalDbShape) {
  const fs = await import('node:fs/promises');
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export async function getLocalDb() {
  return readDbFile();
}

export async function setProviderApiKey(provider: string, key: string) {
  const db = await readDbFile();

  db.apiKeys[provider] = key;
  db.updatedAt = new Date().toISOString();

  await writeDbFile(db);

  return db;
}
