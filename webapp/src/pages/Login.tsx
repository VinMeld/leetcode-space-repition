import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Github, Mail } from 'lucide-react';
import { toast } from 'sonner';
import './Login.css';

export function Login() {
    const { login, user, setToken } = useAuth();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const from = location.state?.from?.pathname || '/';
    const cliPort = searchParams.get('cli_port');
    const extension = searchParams.get('extension');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (user) {
        const token = localStorage.getItem('token');

        // If CLI port is present, redirect to CLI local server
        if (cliPort && token) {
            window.location.href = `http://localhost:${cliPort}?token=${token}`;
            return null;
        }

        // If extension login, post message
        if (extension && token) {
            window.postMessage({ type: 'EXTENSION_LOGIN_SUCCESS', token }, '*');
        }

        return <Navigate to={from} replace />;
    }

    const handleLocalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const res = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            setToken(data.token);
            toast.success('Logged in successfully');

            // Handle CLI redirect if needed
            if (cliPort) {
                window.location.href = `http://localhost:${cliPort}?token=${data.token}`;
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthLogin = (provider: 'google' | 'github') => {
        login(provider, cliPort || undefined);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Welcome Back</h1>
                <p>Sign in to track your LeetCode progress</p>

                <form onSubmit={handleLocalLogin} className="login-form">
                    <div className="form-group">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="form-input"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="login-btn primary"
                        isLoading={isLoading}
                    >
                        Log In
                    </Button>
                </form>

                <div className="login-divider">
                    <span>OR</span>
                </div>

                <div className="login-buttons">
                    <Button
                        onClick={() => handleOAuthLogin('google')}
                        className="login-btn google"
                        leftIcon={<Mail size={20} />}
                    >
                        Continue with Google
                    </Button>

                    <Button
                        onClick={() => handleOAuthLogin('github')}
                        className="login-btn github"
                        leftIcon={<Github size={20} />}
                    >
                        Continue with GitHub
                    </Button>
                </div>

                <p className="login-footer">
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
            </div>
        </div>
    );
}
