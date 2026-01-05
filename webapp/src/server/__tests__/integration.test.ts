import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import superjson from 'superjson';
import type { Database } from '../../helpers/schema';

/**
 * Integration Tests - Full Request/Response Cycle
 * 
 * These tests run against a real PostgreSQL database (docker-compose.test.yml)
 * to verify the complete API flow including database operations.
 * 
 * Setup:
 *   npm run db:test:start   # Start test database
 *   npm run test:integration # Run these tests
 *   npm run db:test:stop    # Stop test database
 */

// Test database connection
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ||
    'postgresql://leetcode_test:test_password@localhost:5433/leetcode_sr_test';

let testDb: Kysely<Database>;
let pool: Pool;

// Dynamic import of app to allow mocking DATABASE_URL
let app: any;

describe('Integration Tests - Full Request/Response Cycle', () => {
    beforeAll(async () => {
        // Set test database URL before importing app
        process.env.DATABASE_URL = TEST_DATABASE_URL;

        // Create database connection
        pool = new Pool({ connectionString: TEST_DATABASE_URL });
        testDb = new Kysely<Database>({
            dialect: new PostgresDialect({ pool }),
        });

        // Run migrations to set up schema
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    provider VARCHAR(50) NOT NULL,
                    provider_id VARCHAR(255) NOT NULL,
                    display_name VARCHAR(255),
                    password_hash VARCHAR(255),
                    created_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE TABLE IF NOT EXISTS problems (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    title VARCHAR(255) NOT NULL,
                    leetcode_url VARCHAR(500) NOT NULL,
                    difficulty VARCHAR(20) NOT NULL,
                    notes TEXT,
                    easiness_factor DECIMAL(4,2) DEFAULT 2.5,
                    interval INTEGER DEFAULT 1,
                    repetitions INTEGER DEFAULT 0,
                    next_review_date DATE DEFAULT CURRENT_DATE,
                    last_reviewed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE TABLE IF NOT EXISTS reviews (
                    id SERIAL PRIMARY KEY,
                    problem_id INTEGER REFERENCES problems(id),
                    quality INTEGER NOT NULL,
                    reviewed_at TIMESTAMP DEFAULT NOW()
                );
            `);
        } catch (error) {
            console.error('Migration error (might already exist):', error);
        }

        // Import app after setting DATABASE_URL
        const module = await import('../index');
        app = module.default;
    });

    afterAll(async () => {
        // Clean up
        await pool.end();
    });

    beforeEach(async () => {
        // Clean tables before each test
        await pool.query('DELETE FROM reviews');
        await pool.query('DELETE FROM problems');
        await pool.query('DELETE FROM users');
    });

    describe('Auth Flow - Registration & Login', () => {
        it('should register a new user and return a token', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'newuser@test.com',
                    password: 'SecurePassword123!',
                    displayName: 'Test User',
                });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.email).toBe('newuser@test.com');
            expect(response.body.user.display_name).toBe('Test User');
        });

        it('should reject duplicate email registration', async () => {
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@test.com',
                    password: 'Password123!',
                });

            // Second registration with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@test.com',
                    password: 'DifferentPassword123!',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('already exists');
        });

        it('should login with valid credentials', async () => {
            // Register first
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'login@test.com',
                    password: 'Password123!',
                });

            // Login
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@test.com',
                    password: 'Password123!',
                });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
        });

        it('should reject login with wrong password', async () => {
            // Register first
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'wrongpass@test.com',
                    password: 'CorrectPassword123!',
                });

            // Login with wrong password
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'wrongpass@test.com',
                    password: 'WrongPassword123!',
                });

            expect(response.status).toBe(401);
        });
    });

    describe('Problems CRUD - Full Cycle', () => {
        let authToken: string;

        beforeEach(async () => {
            // Register and get token
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'problems@test.com',
                    password: 'Password123!',
                });
            authToken = registerResponse.body.token;
        });

        it('should create a problem', async () => {
            const response = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Two Sum',
                    leetcodeUrl: 'https://leetcode.com/problems/two-sum',
                    difficulty: 'easy',
                    notes: 'Use a hash map',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.problem).toBeDefined();
            expect(response.body.problem.id).toBeDefined();
        });

        it('should list problems', async () => {
            // Create a problem first
            await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Two Sum',
                    leetcodeUrl: 'https://leetcode.com/problems/two-sum',
                    difficulty: 'easy',
                });

            const response = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            // Use plain JSON response
            const problems = response.body as any[];
            expect(Array.isArray(problems)).toBe(true);
            expect(problems.length).toBe(1);
            expect(problems[0].title).toBe('Two Sum');
        });

        it('should review a problem and update spaced repetition values', async () => {
            // Create a problem
            const createResponse = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Two Sum',
                    leetcodeUrl: 'https://leetcode.com/problems/two-sum',
                    difficulty: 'easy',
                });

            // Review the problem
            const reviewResponse = await request(app)
                .post('/api/problems/review')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    problemId: createResponse.body.problem.id,
                    quality: 4,
                });

            expect(reviewResponse.status).toBe(200);
            expect(reviewResponse.body.success).toBe(true);

            // Verify problem was updated
            const listResponse = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken}`);

            const problems = listResponse.body as any[];
            const updatedProblem = problems[0];
            expect(updatedProblem.repetitions).toBeGreaterThan(0);
        });

        it('should delete a problem', async () => {
            // Create a problem
            const createResponse = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'To Delete',
                    leetcodeUrl: 'https://leetcode.com/problems/to-delete',
                    difficulty: 'medium',
                });

            // Delete the problem
            const deleteResponse = await request(app)
                .post('/api/problems/delete')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    problemId: createResponse.body.problem.id,
                });

            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.success).toBe(true);

            // Verify it's gone
            const listResponse = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken}`);

            const problems = listResponse.body as any[];
            expect(problems.length).toBe(0);
        });
    });

    describe('Stats Endpoint', () => {
        let authToken: string;

        beforeEach(async () => {
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'stats@test.com',
                    password: 'Password123!',
                });
            authToken = registerResponse.body.token;
        });

        it('should return user statistics', async () => {
            // Create some problems
            await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Easy Problem',
                    leetcodeUrl: 'https://leetcode.com/problems/easy',
                    difficulty: 'easy',
                });

            await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Hard Problem',
                    leetcodeUrl: 'https://leetcode.com/problems/hard',
                    difficulty: 'hard',
                });

            const response = await request(app)
                .get('/api/stats')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            // Use plain JSON response
            const stats = response.body as any;
            expect(stats.totalProblems).toBe(2);
            expect(stats.problemsByDifficulty.easy).toBe(1);
            expect(stats.problemsByDifficulty.hard).toBe(1);
        });
    });

    describe('Authorization', () => {
        it('should reject requests without token', async () => {
            const response = await request(app).get('/api/problems');

            expect(response.status).toBe(401);
        });

        it('should reject requests with invalid token', async () => {
            const response = await request(app)
                .get('/api/problems')
                .set('Authorization', 'Bearer invalid_token_here');

            expect(response.status).toBe(401);
        });
    });
});
