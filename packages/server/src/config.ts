import 'dotenv/config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const databasePath = process.env['DATABASE_PATH'] ?? './data/sentinel.db';
mkdirSync(dirname(databasePath), { recursive: true });

export const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  host: process.env['HOST'] ?? 'localhost',
  databasePath,
  agent: {
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
    defaultModel: process.env['AGENT_DEFAULT_MODEL'] ?? 'claude-opus-4-6',
    defaultMaxTurns: parseInt(process.env['AGENT_MAX_TURNS'] ?? '50', 10),
  },
} as const;
