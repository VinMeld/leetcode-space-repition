import React, { createContext, useContext, useState, useMemo } from 'react';

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
    login: (provider: 'google' | 'github', cliPort?: string) => void;
    logout: () => void;
    setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'));
    const loading = false;

    const user = useMemo(() => {
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.id,
                email: payload.email,
                provider: payload.provider
            };
        } catch (e) {
            console.error('Invalid token', e);
            return null;
        }
    }, [token]);

    const logout = () => {
        localStorage.removeItem('token');
        setTokenState(null);
    };

    const setToken = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setTokenState(newToken);
    };

    const login = (provider: 'google' | 'github', cliPort?: string) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const query = cliPort ? `?cli_port=${cliPort}` : '';
        window.location.href = `${apiUrl}/auth/${provider}${query}`;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, setToken }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
