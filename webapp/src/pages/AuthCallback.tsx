import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AuthCallback() {
    const [searchParams] = useSearchParams();
    const { setToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            navigate('/');
        } else {
            navigate('/login');
        }
    }, [searchParams, setToken, navigate]);

    return (
        <div className="flex items-center justify-center h-screen">
            <p>Authenticating...</p>
        </div>
    );
}
