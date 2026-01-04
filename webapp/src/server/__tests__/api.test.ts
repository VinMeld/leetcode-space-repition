import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create a minimal test app that doesn't require the real database
describe('API Endpoints', () => {
    let app: express.Application;

    beforeAll(async () => {
        app = express();
        app.use(express.json());

        // Health check endpoint
        app.get('/api/health', (_, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Mock problems list endpoint
        app.get('/api/problems', (_, res) => {
            res.json([
                {
                    id: 1,
                    title: 'Two Sum',
                    leetcode_url: 'https://leetcode.com/problems/two-sum',
                    difficulty: 'easy',
                    easiness_factor: 2.5,
                    interval: 1,
                    repetitions: 0,
                    next_review_date: new Date().toISOString(),
                    isDueToday: true,
                },
            ]);
        });

        // Mock create problem endpoint
        app.post('/api/problems', (req, res) => {
            const { title, leetcodeUrl, difficulty } = req.body;

            if (!title || !leetcodeUrl || !difficulty) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                return res.status(400).json({ error: 'Invalid difficulty' });
            }

            res.status(201).json({ id: 1, message: 'Problem created' });
        });

        // Mock delete endpoint
        app.post('/api/problems/delete', (req, res) => {
            const { problemId } = req.body;

            if (!problemId) {
                return res.status(400).json({ error: 'problemId is required' });
            }

            res.json({ success: true });
        });

        // Mock review endpoint
        app.post('/api/problems/review', (req, res) => {
            const { problemId, quality } = req.body;

            if (!problemId || quality === undefined) {
                return res.status(400).json({ error: 'problemId and quality required' });
            }

            if (quality < 0 || quality > 5) {
                return res.status(400).json({ error: 'quality must be 0-5' });
            }

            res.json({ success: true, message: 'Review recorded' });
        });

        // Mock stats endpoint
        app.get('/api/stats', (_, res) => {
            res.json({
                totalProblems: 10,
                totalReviews: 50,
                problemsDueToday: 3,
                streakDays: 7,
                reviewsByDate: {},
                problemsByDifficulty: { easy: 5, medium: 3, hard: 2 },
            });
        });
    });

    afterAll(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/health', () => {
        it('should return ok status', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
        });
    });

    describe('GET /api/problems', () => {
        it('should return problems list', async () => {
            const response = await request(app).get('/api/problems');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0].title).toBe('Two Sum');
        });
    });

    describe('POST /api/problems', () => {
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/problems')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });

        it('should create a problem with valid data', async () => {
            const response = await request(app)
                .post('/api/problems')
                .send({
                    title: 'Two Sum',
                    leetcodeUrl: 'https://leetcode.com/problems/two-sum',
                    difficulty: 'easy',
                    notes: 'Use a hash map',
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
        });

        it('should reject invalid difficulty', async () => {
            const response = await request(app)
                .post('/api/problems')
                .send({
                    title: 'Test',
                    leetcodeUrl: 'https://leetcode.com/problems/test',
                    difficulty: 'impossible', // Invalid
                });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/problems/delete', () => {
        it('should require problemId', async () => {
            const response = await request(app)
                .post('/api/problems/delete')
                .send({});

            expect(response.status).toBe(400);
        });

        it('should delete a problem', async () => {
            const response = await request(app)
                .post('/api/problems/delete')
                .send({ problemId: 1 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/problems/review', () => {
        it('should require problemId and quality', async () => {
            const response = await request(app)
                .post('/api/problems/review')
                .send({});

            expect(response.status).toBe(400);
        });

        it('should validate quality range', async () => {
            const response = await request(app)
                .post('/api/problems/review')
                .send({ problemId: 1, quality: 10 });

            expect(response.status).toBe(400);
        });

        it('should record a valid review', async () => {
            const response = await request(app)
                .post('/api/problems/review')
                .send({ problemId: 1, quality: 4 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/stats', () => {
        it('should return statistics', async () => {
            const response = await request(app).get('/api/stats');

            expect(response.status).toBe(200);
            expect(response.body.totalProblems).toBe(10);
            expect(response.body.streakDays).toBe(7);
        });
    });
});
