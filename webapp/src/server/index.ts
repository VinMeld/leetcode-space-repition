import express from 'express';
import cors from 'cors';
import { listProblems } from './problems/list';
import { createProblem } from './problems/create';
import { reviewProblem } from './problems/review';
import { deleteProblem } from './problems/delete';
import { getStats } from './stats';
import { validateApiKey, createApiKey, listApiKeys, deleteApiKey } from './auth';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow browser extension
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost for development
        if (origin.startsWith('http://localhost')) return callback(null, true);

        // Allow Chrome extensions
        if (origin.startsWith('chrome-extension://')) return callback(null, true);

        // Allow Firefox extensions
        if (origin.startsWith('moz-extension://')) return callback(null, true);

        callback(null, true);
    },
    credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Apply API key validation to all /api routes
app.use('/api', validateApiKey);

// API Routes - Problems
app.get('/api/problems', listProblems);
app.post('/api/problems', createProblem);
app.post('/api/problems/review', reviewProblem);
app.post('/api/problems/delete', deleteProblem);

// API Routes - Stats
app.get('/api/stats', getStats);

// API Routes - Auth (API Keys)
app.post('/api/keys/generate', async (req, res) => {
    try {
        const { name } = req.body;
        const apiKey = await createApiKey(name);
        res.json({
            success: true,
            apiKey,
            message: 'Save this key securely - it cannot be retrieved again!'
        });
    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});

app.get('/api/keys', async (_req, res) => {
    try {
        const keys = await listApiKeys();
        res.json({ keys });
    } catch (error) {
        console.error('Error listing API keys:', error);
        res.status(500).json({ error: 'Failed to list API keys' });
    }
});

app.post('/api/keys/delete', async (req, res) => {
    try {
        const { id } = req.body;
        const deleted = await deleteApiKey(id);
        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'API key not found' });
        }
    } catch (error) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// Health check
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
});

export default app;
