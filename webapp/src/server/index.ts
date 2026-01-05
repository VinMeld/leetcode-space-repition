import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from './auth-passport';
import authRoutes from './routes/auth';
import { verifyToken } from './jwt';
import { db } from '../helpers/db';
import { listProblems } from './problems/list';
import { createProblem } from './problems/create';
import { reviewProblem } from './problems/review';
import { deleteProblem, deleteAllProblems } from './problems/delete';
import { rescheduleProblems } from './problems/reschedule';
import { getProblemDetails } from './problems/details';
import { getStats } from './stats';
// import { validateApiKey } from './auth'; // Deprecated in favor of JWT

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin.startsWith('http://localhost')) return callback(null, true);
        if (origin.startsWith('chrome-extension://')) return callback(null, true);
        if (origin.startsWith('moz-extension://')) return callback(null, true);
        callback(null, true);
    },
    credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(passport.initialize());

// Auth Middleware
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log(`[AuthMiddleware] Checking auth for: ${req.method} ${req.path}`);

    // Skip auth check for auth routes (they handle their own security)
    if (req.path.startsWith('/auth')) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const payload = verifyToken(token);
    if (!payload || typeof payload === 'string') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const user = await db
            .selectFrom('users')
            .selectAll()
            .where('id', '=', (payload as { id: number }).id)
            .executeTakeFirst();

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Public Routes
app.use('/api/auth', authRoutes);
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected Routes
app.use('/api', requireAuth);

// API Routes - Problems
app.get('/api/problems', listProblems);
app.post('/api/problems', createProblem);
app.post('/api/problems/review', reviewProblem);
app.post('/api/problems/delete', deleteProblem);
app.post('/api/problems/delete-all', deleteAllProblems);
app.post('/api/problems/reschedule', rescheduleProblems);
app.get('/api/problems/:id/details', getProblemDetails);

// API Routes - Stats
app.get('/api/stats', getStats);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
});

export default app;
