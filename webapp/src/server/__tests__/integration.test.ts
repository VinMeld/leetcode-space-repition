import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';

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

let pool: Pool;

// Dynamic import of app to allow mocking DATABASE_URL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

describe('Integration Tests - Full Request/Response Cycle', () => {
    beforeAll(async () => {
        // Set test database URL before importing app
        process.env.DATABASE_URL = TEST_DATABASE_URL;

        // Create database connection
        pool = new Pool({ connectionString: TEST_DATABASE_URL });

        // Run migrations to set up schema
        try {
            // Drop existing tables to ensure schema is up-to-date
            await pool.query(`
                DROP TABLE IF EXISTS reviews CASCADE;
                DROP TABLE IF EXISTS problems CASCADE;
                DROP TABLE IF EXISTS users CASCADE;
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
                
                CREATE TABLE IF NOT EXISTS problems(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_num INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    leetcode_url VARCHAR(500) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    notes TEXT,
    easiness_factor DECIMAL(4, 2) DEFAULT 2.5,
    interval INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review_date DATE DEFAULT CURRENT_DATE,
    last_reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    is_starred BOOLEAN NOT NULL DEFAULT FALSE
);
                
                CREATE TABLE IF NOT EXISTS reviews(
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
                .set('Authorization', `Bearer ${authToken} `)
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
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Two Sum',
                    leetcodeUrl: 'https://leetcode.com/problems/two-sum',
                    difficulty: 'easy',
                });

            const response = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            expect(response.status).toBe(200);
            // Use plain JSON response
            const problems = response.body as unknown[];
            expect(Array.isArray(problems)).toBe(true);
            expect(problems.length).toBe(1);
            expect(problems[0].title).toBe('Two Sum');
        });

        it('should prevent creating duplicate problems', async () => {
            // First creation
            await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Duplicate Test',
                    leetcodeUrl: 'https://leetcode.com/problems/duplicate-test',
                    difficulty: 'medium',
                });

            // Second creation (should fail)
            const response = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Duplicate Test',
                    leetcodeUrl: 'https://leetcode.com/problems/duplicate-test',
                    difficulty: 'medium',
                });

            expect(response.status).toBe(409);
            expect(response.body.error).toContain('already exists');
        });

        it('should review a problem and update spaced repetition values', async () => {
            // Create a problem
            const createResponse = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Two Sum',
                    leetcodeUrl: 'https://leetcode.com/problems/two-sum',
                    difficulty: 'easy',
                });

            // Review the problem
            const reviewResponse = await request(app)
                .post('/api/problems/review')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    problemId: createResponse.body.problem.id,
                    quality: 4,
                });

            expect(reviewResponse.status).toBe(200);
            expect(reviewResponse.body.success).toBe(true);

            // Verify problem was updated
            const listResponse = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const problems = listResponse.body as { repetitions: number }[];
            const updatedProblem = problems[0];
            expect(updatedProblem.repetitions).toBeGreaterThan(0);
        });

        it('should delete a problem', async () => {
            // Create a problem
            const createResponse = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'To Delete',
                    leetcodeUrl: 'https://leetcode.com/problems/to-delete',
                    difficulty: 'medium',
                });

            // Delete the problem
            const deleteResponse = await request(app)
                .post('/api/problems/delete')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    problemId: createResponse.body.problem.id,
                });

            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.success).toBe(true);

            // Verify it's gone
            const listResponse = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const problems = listResponse.body as { repetitions: number }[];
            expect(problems.length).toBe(0);
        });

        it('should get problem details', async () => {
            // Create a problem
            const createResponse = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Details Test',
                    leetcodeUrl: 'https://leetcode.com/problems/details-test',
                    difficulty: 'hard',
                });

            const problemId = createResponse.body.problem.id;
            const orderNum = createResponse.body.problem.order_num;

            // Review the problem to create some history
            await request(app)
                .post('/api/problems/review')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    problemId,
                    quality: 4,
                });

            // Get details by order_num (API now uses order_num for lookup)
            const detailsResponse = await request(app)
                .get(`/api/problems/${orderNum}/details`)
                .set('Authorization', `Bearer ${authToken} `);

            expect(detailsResponse.status).toBe(200);
            expect(detailsResponse.body.problem).toBeDefined();
            expect(detailsResponse.body.problem.title).toBe('Details Test');
            expect(detailsResponse.body.problem.difficulty).toBe('hard');
            expect(detailsResponse.body.reviews).toBeDefined();
            expect(Array.isArray(detailsResponse.body.reviews)).toBe(true);
            expect(detailsResponse.body.reviews.length).toBe(1);
            expect(detailsResponse.body.stats).toBeDefined();
            expect(detailsResponse.body.stats.totalReviews).toBe(1);
        });

        it('should return 404 for non-existent problem details', async () => {
            const response = await request(app)
                .get('/api/problems/999999/details')
                .set('Authorization', `Bearer ${authToken} `);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Problem not found');
        });

        it('should assign sequential order numbers and lookup by order_num', async () => {
            // Create first problem
            const createResponse1 = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'First Problem',
                    leetcodeUrl: 'https://leetcode.com/problems/first',
                    difficulty: 'easy',
                });

            expect(createResponse1.status).toBe(201);
            expect(createResponse1.body.problem.order_num).toBe(1);

            // Create second problem
            const createResponse2 = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Second Problem',
                    leetcodeUrl: 'https://leetcode.com/problems/second',
                    difficulty: 'medium',
                });

            expect(createResponse2.status).toBe(201);
            expect(createResponse2.body.problem.order_num).toBe(2);

            // List problems should include order_num
            const listResponse = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const problems = listResponse.body as { order_num: number; title: string }[];
            expect(problems.some(p => p.order_num === 1 && p.title === 'First Problem')).toBe(true);
            expect(problems.some(p => p.order_num === 2 && p.title === 'Second Problem')).toBe(true);

            // Get details by order_num (not by global id)
            const detailsResponse = await request(app)
                .get('/api/problems/1/details')
                .set('Authorization', `Bearer ${authToken} `);

            expect(detailsResponse.status).toBe(200);
            expect(detailsResponse.body.problem.title).toBe('First Problem');
            expect(detailsResponse.body.problem.order_num).toBe(1);
        });

        it('should reset order numbers after delete-all and re-import', async () => {
            // Create initial problems
            await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Problem A',
                    leetcodeUrl: 'https://leetcode.com/problems/problem-a',
                    difficulty: 'easy',
                });

            await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Problem B',
                    leetcodeUrl: 'https://leetcode.com/problems/problem-b',
                    difficulty: 'medium',
                });

            // Verify initial order numbers
            const firstList = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const firstProblems = firstList.body as { order_num: number }[];
            expect(firstProblems.length).toBe(2);
            expect(firstProblems.some(p => p.order_num === 1)).toBe(true);
            expect(firstProblems.some(p => p.order_num === 2)).toBe(true);

            // Delete all problems
            const deleteResponse = await request(app)
                .post('/api/problems/delete-all')
                .set('Authorization', `Bearer ${authToken} `);

            expect(deleteResponse.status).toBe(200);

            // Verify all problems are deleted
            const emptyList = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            expect(emptyList.body.length).toBe(0);

            // Re-import problems (create new ones)
            const createResponseC = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Problem C',
                    leetcodeUrl: 'https://leetcode.com/problems/problem-c',
                    difficulty: 'hard',
                });

            expect(createResponseC.status).toBe(201);
            // Order number should start from 1 again, not continue from 3
            expect(createResponseC.body.problem.order_num).toBe(1);

            const createResponseD = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Problem D',
                    leetcodeUrl: 'https://leetcode.com/problems/problem-d',
                    difficulty: 'easy',
                });

            expect(createResponseD.body.problem.order_num).toBe(2);

            // Verify details lookup by order_num works correctly
            const detailsResponse = await request(app)
                .get('/api/problems/1/details')
                .set('Authorization', `Bearer ${authToken} `);

            expect(detailsResponse.status).toBe(200);
            expect(detailsResponse.body.problem.title).toBe('Problem C');
            expect(detailsResponse.body.problem.order_num).toBe(1);
        });

        it('should reschedule problems based on settings', async () => {
            // Create a problem with interval > 0
            const createResponse = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Reschedule Test',
                    leetcodeUrl: 'https://leetcode.com/problems/reschedule-test',
                    difficulty: 'easy',
                });

            const problemId = createResponse.body.problem.id;

            // Review the problem to set an interval
            await request(app)
                .post('/api/problems/review')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    problemId,
                    quality: 5,
                });

            // Get current state
            const beforeList = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const beforeProblem = beforeList.body[0];
            const originalInterval = beforeProblem.interval;

            // Reschedule with 0.5x multiplier for easy
            const rescheduleResponse = await request(app)
                .post('/api/problems/reschedule')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    settings: {
                        easyMultiplier: 0.5,
                        mediumMultiplier: 1.0,
                        hardMultiplier: 1.0,
                        sameDayRetry: true,
                        wrongAnswerPenalty: 0.5,
                        minInterval: 1,
                    },
                });

            expect(rescheduleResponse.status).toBe(200);
            expect(rescheduleResponse.body.success).toBe(true);
            expect(rescheduleResponse.body.updatedCount).toBe(1);

            // Check that interval was updated
            const afterList = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const afterProblem = afterList.body[0];
            // New interval should be roughly half of original (0.5x multiplier)
            // but at least minInterval (1)
            expect(afterProblem.interval).toBeLessThanOrEqual(originalInterval);
            expect(afterProblem.interval).toBeGreaterThanOrEqual(1);
        });

        it('should restore intervals after round-trip reschedule (multiply then divide)', async () => {
            // Create problems with different difficulties
            const createEasy = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Easy Round Trip',
                    leetcodeUrl: 'https://leetcode.com/problems/easy-round-trip',
                    difficulty: 'easy',
                });

            const createMedium = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Medium Round Trip',
                    leetcodeUrl: 'https://leetcode.com/problems/medium-round-trip',
                    difficulty: 'medium',
                });

            const createHard = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Hard Round Trip',
                    leetcodeUrl: 'https://leetcode.com/problems/hard-round-trip',
                    difficulty: 'hard',
                });

            const easyId = createEasy.body.problem.id;
            const mediumId = createMedium.body.problem.id;
            const hardId = createHard.body.problem.id;

            // Review all problems TWICE with quality 5 to get larger intervals
            // First review: interval goes from 1 to 6
            // Second review: interval grows further
            for (let i = 0; i < 2; i++) {
                for (const problemId of [easyId, mediumId, hardId]) {
                    await request(app)
                        .post('/api/problems/review')
                        .set('Authorization', `Bearer ${authToken} `)
                        .send({ problemId, quality: 5 });
                }
            }

            // Get original intervals (should be 6+ days now)
            const originalList = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const findProblem = (list: { id: number; interval: number; next_review_date: string }[], id: number) =>
                list.find(p => p.id === id);

            const originalEasy = findProblem(originalList.body, easyId);
            const originalMedium = findProblem(originalList.body, mediumId);
            const originalHard = findProblem(originalList.body, hardId);

            expect(originalEasy).toBeDefined();
            expect(originalMedium).toBeDefined();
            expect(originalHard).toBeDefined();

            // Store original values
            const originalEasyInterval = originalEasy!.interval;
            const originalMediumInterval = originalMedium!.interval;
            const originalHardInterval = originalHard!.interval;

            // Verify intervals are large enough for meaningful test (should be 6+)
            expect(originalEasyInterval).toBeGreaterThanOrEqual(6);

            // STEP 1: Reschedule with 0.5x multipliers (halve intervals)
            const reschedule1 = await request(app)
                .post('/api/problems/reschedule')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    settings: {
                        easyMultiplier: 0.5,
                        mediumMultiplier: 0.5,
                        hardMultiplier: 0.5,
                        sameDayRetry: true,
                        wrongAnswerPenalty: 0.5,
                        minInterval: 1,
                    },
                });

            expect(reschedule1.status).toBe(200);
            expect(reschedule1.body.updatedCount).toBe(3);

            // Check intervals are halved
            const afterHalf = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const halfEasy = findProblem(afterHalf.body, easyId);
            const halfMedium = findProblem(afterHalf.body, mediumId);
            const halfHard = findProblem(afterHalf.body, hardId);

            // Intervals should be roughly half (rounded)
            expect(halfEasy!.interval).toBe(Math.max(1, Math.round(originalEasyInterval * 0.5)));
            expect(halfMedium!.interval).toBe(Math.max(1, Math.round(originalMediumInterval * 0.5)));
            expect(halfHard!.interval).toBe(Math.max(1, Math.round(originalHardInterval * 0.5)));

            // STEP 2: Reschedule with 2.0x multipliers (double intervals back)
            const reschedule2 = await request(app)
                .post('/api/problems/reschedule')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    settings: {
                        easyMultiplier: 2.0,
                        mediumMultiplier: 2.0,
                        hardMultiplier: 2.0,
                        sameDayRetry: true,
                        wrongAnswerPenalty: 0.5,
                        minInterval: 1,
                    },
                });

            expect(reschedule2.status).toBe(200);
            expect(reschedule2.body.updatedCount).toBe(3);

            // Check intervals are restored (doubled from halved = original)
            const afterDouble = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const doubleEasy = findProblem(afterDouble.body, easyId);
            const doubleMedium = findProblem(afterDouble.body, mediumId);
            const doubleHard = findProblem(afterDouble.body, hardId);

            // Intervals should be back to original (0.5 * 2.0 = 1.0)
            // Due to rounding, allow +/- 1 day tolerance for larger intervals
            expect(Math.abs(doubleEasy!.interval - originalEasyInterval)).toBeLessThanOrEqual(1);
            expect(Math.abs(doubleMedium!.interval - originalMediumInterval)).toBeLessThanOrEqual(1);
            expect(Math.abs(doubleHard!.interval - originalHardInterval)).toBeLessThanOrEqual(1);
        });

        it('should apply different multipliers per difficulty', async () => {
            // Create problems with different difficulties
            const createEasy = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Diff Easy',
                    leetcodeUrl: 'https://leetcode.com/problems/diff-easy',
                    difficulty: 'easy',
                });

            const createHard = await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Diff Hard',
                    leetcodeUrl: 'https://leetcode.com/problems/diff-hard',
                    difficulty: 'hard',
                });

            const easyId = createEasy.body.problem.id;
            const hardId = createHard.body.problem.id;

            // Review to get intervals (quality 4 gives interval of 4)
            for (const problemId of [easyId, hardId]) {
                await request(app)
                    .post('/api/problems/review')
                    .set('Authorization', `Bearer ${authToken} `)
                    .send({ problemId, quality: 4 });
            }

            // Get original intervals
            const originalList = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const findProblem = (list: { id: number; interval: number }[], id: number) =>
                list.find(p => p.id === id);

            const originalEasy = findProblem(originalList.body, easyId);
            const originalHard = findProblem(originalList.body, hardId);

            // Reschedule: Easy 0.5x (half), Hard 2.0x (double)
            await request(app)
                .post('/api/problems/reschedule')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    settings: {
                        easyMultiplier: 0.5,
                        mediumMultiplier: 1.0,
                        hardMultiplier: 2.0,
                        sameDayRetry: true,
                        wrongAnswerPenalty: 0.5,
                        minInterval: 1,
                    },
                });

            // Check results
            const afterList = await request(app)
                .get('/api/problems')
                .set('Authorization', `Bearer ${authToken} `);

            const afterEasy = findProblem(afterList.body, easyId);
            const afterHard = findProblem(afterList.body, hardId);

            // Easy should be halved
            expect(afterEasy!.interval).toBe(Math.max(1, Math.round(originalEasy!.interval * 0.5)));
            // Hard should be doubled
            expect(afterHard!.interval).toBe(Math.round(originalHard!.interval * 2.0));
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
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Easy Problem',
                    leetcodeUrl: 'https://leetcode.com/problems/easy',
                    difficulty: 'easy',
                });

            await request(app)
                .post('/api/problems')
                .set('Authorization', `Bearer ${authToken} `)
                .send({
                    title: 'Hard Problem',
                    leetcodeUrl: 'https://leetcode.com/problems/hard',
                    difficulty: 'hard',
                });

            const response = await request(app)
                .get('/api/stats')
                .set('Authorization', `Bearer ${authToken} `);

            expect(response.status).toBe(200);
            // Use plain JSON response
            const stats = response.body as { totalProblems: number; problemsByDifficulty: { easy: number; hard: number } };
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
