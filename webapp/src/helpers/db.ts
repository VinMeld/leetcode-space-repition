import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { Database } from './schema';

const { Pool } = pg;

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
