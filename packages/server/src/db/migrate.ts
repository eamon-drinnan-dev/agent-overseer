import 'dotenv/config';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env['DATABASE_PATH'] ?? './data/sentinel.db';
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log('Running migrations...');
migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations complete.');

sqlite.close();
