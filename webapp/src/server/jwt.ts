import jwt from 'jsonwebtoken';
import type { User } from '../helpers/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

export function signToken(user: User): string {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            provider: user.provider
        },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

export function verifyToken(token: string): any {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}
