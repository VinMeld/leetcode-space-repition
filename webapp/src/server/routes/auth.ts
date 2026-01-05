import express from 'express';
import bcrypt from 'bcryptjs';
import passport from '../auth-passport';
import { signToken, verifyToken } from '../jwt';
import { db } from '../../helpers/db';
import type { User, NewUser } from '../../helpers/schema';

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'; // Default Vite port

// Helper to handle successful login
const handleLoginSuccess = (req: express.Request, res: express.Response) => {
    const user = req.user as User;
    const token = signToken(user);

    // Check if this is a CLI login
    const state = req.query.state as string;
    if (state && state.startsWith('cli:')) {
        const cliPort = state.split(':')[1];
        // Redirect to local CLI server with token
        return res.redirect(`http://localhost:${cliPort}?token=${token}`);
    }

    // Web login - redirect to frontend with token
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
};

// Register (Local)
router.post('/register', async (req, res) => {
    console.log('[AuthRoutes] Register request received');
    try {
        const { email, password, displayName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user exists
        const existingUser = await db
            .selectFrom('users')
            .selectAll()
            .where('email', '=', email)
            .executeTakeFirst();

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser: NewUser = {
            email,
            provider: 'local',
            provider_id: 'local_' + Date.now(), // Unique ID for local users
            password_hash: hashedPassword,
            display_name: displayName || email.split('@')[0],
        };

        const createdUser = await db
            .insertInto('users')
            .values(newUser)
            .returningAll()
            .executeTakeFirstOrThrow();

        const token = signToken(createdUser);
        res.json({ token, user: createdUser });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login (Local)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await db
            .selectFrom('users')
            .selectAll()
            .where('email', '=', email)
            .executeTakeFirst();

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(user);

        // Handle CLI login via JSON response (frontend will handle redirect)
        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Change Password (Protected)
router.post('/change-password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.split(' ')[1];
        const userPayload = verifyToken(token);
        if (!userPayload) return res.status(401).json({ error: 'Invalid token' });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const user = await db
            .selectFrom('users')
            .selectAll()
            .where('id', '=', userPayload.id)
            .executeTakeFirst();

        if (!user || !user.password_hash) {
            return res.status(400).json({ error: 'User not found or uses external auth' });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await db
            .updateTable('users')
            .set({ password_hash: newHash })
            .where('id', '=', user.id)
            .execute();

        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Google Auth
router.get('/google', (req, res, next) => {
    const state = req.query.cli_port ? `cli:${req.query.cli_port}` : undefined;
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state
    })(req, res, next);
});

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    handleLoginSuccess
);

// GitHub Auth
router.get('/github', (req, res, next) => {
    const state = req.query.cli_port ? `cli:${req.query.cli_port}` : undefined;
    passport.authenticate('github', {
        scope: ['user:email'],
        state
    })(req, res, next);
});

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    handleLoginSuccess
);

// CLI Login Start - Redirect to Frontend Login
router.get('/cli/login', (req, res) => {
    const port = req.query.port;
    if (!port) {
        return res.status(400).send('Port required');
    }
    // Redirect to frontend login page with cli_port param
    res.redirect(`${CLIENT_URL}/login?cli_port=${port}`);
});

export default router;
