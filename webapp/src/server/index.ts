import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from './auth-passport';
import authRoutes from './routes/auth';
import { verifyToken } from './jwt';
import { listProblems } from './problems/list';
import { createProblem } from './problems/create';
import { reviewProblem } from './problems/review';
import { deleteProblem } from './problems/delete';
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
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
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

// API Routes - Stats
app.get('/api/stats', getStats);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
});

export default app;
