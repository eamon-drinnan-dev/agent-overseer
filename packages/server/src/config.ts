import 'dotenv/config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const databasePath = process.env['DATABASE_PATH'] ?? './data/sentinel.db';
mkdirSync(dirname(databasePath), { recursive: true });

export const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  host: process.env['HOST'] ?? 'localhost',
  databasePath,
} as const;
