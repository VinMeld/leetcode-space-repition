import { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';
import { db } from '../helpers/db';

// Hash an API key for storage/comparison
export function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

// Generate a new API key
export function generateApiKey(): string {
    return 'lcsr_' + randomBytes(32).toString('hex');
}

// Middleware to validate API key
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
    // Skip auth for browser requests (they use cookies/sessions)
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        // No auth header = browser request, allow (for now)
        return next();
    }

    // Expect: "Bearer lcsr_xxxxx"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid authorization header format' });
    }

    const apiKey = parts[1];
    if (!apiKey.startsWith('lcsr_')) {
        return res.status(401).json({ error: 'Invalid API key format' });
    }

    const keyHash = hashApiKey(apiKey);

    try {
        const result = await db
            .selectFrom('api_keys')
            .select(['id'])
            .where('key_hash', '=', keyHash)
            .executeTakeFirst();

        if (!result) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Update last used timestamp
        await db
            .updateTable('api_keys')
            .set({ last_used_at: new Date() })
            .where('id', '=', result.id)
            .execute();

        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// Generate and store a new API key
export async function createApiKey(name?: string): Promise<string> {
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12); // "lcsr_" + first 7 chars

    await db
        .insertInto('api_keys')
        .values({
            key_hash: keyHash,
            key_prefix: keyPrefix,
            name: name || 'Default Key',
        })
        .execute();

    return apiKey;
}

// List API keys (with masked values)
export async function listApiKeys() {
    return db
        .selectFrom('api_keys')
        .select(['id', 'key_prefix', 'name', 'last_used_at', 'created_at'])
        .orderBy('created_at', 'desc')
        .execute();
}

// Delete an API key
export async function deleteApiKey(id: number): Promise<boolean> {
    const result = await db
        .deleteFrom('api_keys')
        .where('id', '=', id)
        .executeTakeFirst();

    return result.numDeletedRows > 0n;
}
