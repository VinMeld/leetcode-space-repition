import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './schema';

// Create a database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/leetcode_sr',
});

// Create the Kysely instance
export const db = new Kysely<Database>({
    dialect: new PostgresDialect({
        pool,
    }),
});

export default db;
