/**
 * Database migration runner
 * Runs on container startup to ensure schema is up to date
 */
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    console.log('Running database migrations...');

    try {
        // Create migrations tracking table if it doesn't exist
        await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Get list of migration files
        const migrationsDir = path.join(process.cwd(), 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        // Get already executed migrations
        const result = await pool.query('SELECT filename FROM schema_migrations');
        const executed = new Set(result.rows.map(r => r.filename));

        // Run pending migrations
        for (const file of files) {
            if (executed.has(file)) {
                console.log(`  ✓ ${file} (already executed)`);
                continue;
            }

            console.log(`  → Running ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

            await pool.query('BEGIN');
            try {
                await pool.query(sql);
                await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
                await pool.query('COMMIT');
                console.log(`  ✓ ${file} (success)`);
            } catch (err) {
                await pool.query('ROLLBACK');
                throw err;
            }
        }

        console.log('Migrations complete!');
    } finally {
        await pool.end();
    }
}

runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
