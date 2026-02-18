/**
 * Database initialization script
 * Usage: npx tsx src/lib/db/init.ts
 */
import { initDb, closeDb } from './database';

console.log('Initializing database...');
initDb();
console.log('Database initialized successfully.');
closeDb();
