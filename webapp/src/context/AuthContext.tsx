import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: number;
    email: string;
    provider: string;
    display_name?: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (provider: 'google' | 'github') => void;
    logout: () => void;
    setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Decode token to get user info (simple decode, verification happens on backend)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({
                    id: payload.id,
                    email: payload.email,
                    provider: payload.provider
                });
            } catch (e) {
                console.error('Invalid token', e);
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    const login = (provider: 'google' | 'github') => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        window.location.href = `${apiUrl}/api/auth/${provider}`;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setTokenState(null);
        setUser(null);
    };

    const setToken = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setTokenState(newToken);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, setToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
