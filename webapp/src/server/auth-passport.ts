import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { db } from '../helpers/db';
import type { NewUser, User } from '../helpers/schema';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Serialize user to session (we might not use sessions if using JWTs, but passport needs it)
passport.serializeUser((user: User, done) => {
    done(null, user);
});

passport.deserializeUser((user: User, done) => {
    done(null, user);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateUser(profile: any, provider: 'google' | 'github'): Promise<User> {
    const email = profile.emails?.[0]?.value;
    const providerId = profile.id;
    const displayName = profile.displayName || profile.username;
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
        throw new Error('Email not found in profile');
    }

    // Check if user exists
    const existingUser = await db
        .selectFrom('users')
        .selectAll()
        .where('provider', '=', provider)
        .where('provider_id', '=', providerId)
        .executeTakeFirst();

    if (existingUser) {
        return existingUser;
    }

    // Create new user
    const newUser: NewUser = {
        email,
        provider,
        provider_id: providerId,
        display_name: displayName,
        avatar_url: avatarUrl,
    };

    const createdUser = await db
        .insertInto('users')
        .values(newUser)
        .returningAll()
        .executeTakeFirstOrThrow();

    return createdUser;
}

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${API_URL}/api/auth/google/callback`,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const user = await findOrCreateUser(profile, 'google');
            done(null, user);
        } catch (error) {
            done(error as Error);
        }
    }));
}

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: `${API_URL}/api/auth/github/callback`,
        scope: ['user:email'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
            const user = await findOrCreateUser(profile, 'github');
            done(null, user);
        } catch (error) {
            done(error as Error);
        }
    }));
}

export default passport;
