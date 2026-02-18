import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/novels.db';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export function initDb(): void {
  const database = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');

  // When running from compiled Next.js, schema.sql may not be at __dirname
  // Fallback to src path
  let schema: string;
  if (fs.existsSync(schemaPath)) {
    schema = fs.readFileSync(schemaPath, 'utf-8');
  } else {
    const srcSchemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
    schema = fs.readFileSync(srcSchemaPath, 'utf-8');
  }

  const schemaWithoutComments = schema
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  const statements = schemaWithoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    database.exec(statement);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
