import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're using Turso (remote database) or local SQLite
const isRemoteDb = process.env.DATABASE_URL?.startsWith('libsql://') || process.env.DATABASE_URL?.startsWith('https://');

let sqlite;

if (isRemoteDb) {
  // Turso/Remote database connection
  sqlite = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
} else {
  // Local SQLite file database
  const dbPath = process.env.DATABASE_URL || './data/pastebin.db';
  const dbDir = path.dirname(path.resolve(dbPath));

  // Ensure directory exists for local database
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqlite = createClient({
    url: `file:${path.resolve(dbPath)}`
  });
}

export const db = drizzle(sqlite, { schema });
