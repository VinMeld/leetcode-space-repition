import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the database module
vi.mock('../../helpers/db', () => ({
    db: {
        selectFrom: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn(),
        insertInto: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn(),
    },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn().mockResolvedValue(true),
    },
}));

// Mock passport
vi.mock('../auth-passport', () => ({
    default: {
        initialize: () => (req: unknown, res: unknown, next: () => void) => next(),
        authenticate: () => (req: unknown, res: unknown, next: () => void) => next(),
    },
}));

// Mock JWT
vi.mock('../jwt', () => ({
    signToken: vi.fn().mockReturnValue('mock_jwt_token'),
    verifyToken: vi.fn().mockReturnValue({ id: 1, email: 'test@example.com' }),
}));

describe('Auth API Endpoints', () => {
    let app: express.Application;

    beforeAll(async () => {
        // Import the actual app AFTER mocks are set up
        const { default: realApp } = await import('../index');
        app = realApp;
    });

    afterAll(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should return 400 if email is missing', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ password: 'password123' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should return 400 if password is missing', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should return 400 if user already exists', async () => {
            const { db } = await import('../../helpers/db');
            // Mock that user exists
            (db.executeTakeFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('already exists');
        });

        it('should successfully register a new user', async () => {
            const { db } = await import('../../helpers/db');
            // Mock that user doesn't exist
            (db.executeTakeFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
            // Mock user creation
            (db.executeTakeFirstOrThrow as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                id: 1,
                email: 'newuser@example.com',
                display_name: 'newuser',
                provider: 'local',
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'newuser@example.com', password: 'password123' });

            expect(response.status).toBe(200);
            expect(response.body.token).toBe('mock_jwt_token');
            expect(response.body.user).toBeDefined();
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should return 400 if email is missing', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ password: 'password123' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should return 401 if user not found', async () => {
            const { db } = await import('../../helpers/db');
            (db.executeTakeFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'notfound@example.com', password: 'password123' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Invalid credentials');
        });

        it('should return 401 if password is wrong', async () => {
            const { db } = await import('../../helpers/db');
            const bcrypt = await import('bcryptjs');

            (db.executeTakeFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                id: 1,
                email: 'test@example.com',
                password_hash: 'hashed_password',
            });
            (bcrypt.default.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });

            expect(response.status).toBe(401);
        });

        it('should successfully login with valid credentials', async () => {
            const { db } = await import('../../helpers/db');
            const bcrypt = await import('bcryptjs');

            (db.executeTakeFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                id: 1,
                email: 'test@example.com',
                password_hash: 'hashed_password',
            });
            (bcrypt.default.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(response.status).toBe(200);
            expect(response.body.token).toBe('mock_jwt_token');
        });
    });

    describe('GET /api/health', () => {
        it('should return ok status without auth', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
        });
    });

    describe('Protected Routes', () => {
        it('should return 401 for /api/problems without token', async () => {
            const response = await request(app).get('/api/problems');

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('authorization');
        });

        it('should allow access with valid token', async () => {
            const response = await request(app)
                .get('/api/problems')
                .set('Authorization', 'Bearer valid_token');

            // Should not be 401 (may be 200 or error from DB mock)
            expect(response.status).not.toBe(401);
        });
    });
});
