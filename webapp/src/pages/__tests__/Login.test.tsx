import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Login } from '../Login';
import { BrowserRouter } from 'react-router-dom';

// Mock AuthContext
const mockLogin = vi.fn();
const mockSetToken = vi.fn();

vi.mock('../../context/AuthContext', async () => {
    return {
        useAuth: () => ({
            user: null,
            login: mockLogin,
            setToken: mockSetToken,
            loading: false,
        }),
    };
});

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useLocation: () => ({ state: { from: { pathname: '/' } } }),
        useSearchParams: () => [new URLSearchParams()],
    };
});

describe('Login Page', () => {
    it('renders login form', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('renders OAuth buttons', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        expect(screen.getByText('Continue with Google')).toBeInTheDocument();
        expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    });

    it('calls login with google when google button clicked', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        fireEvent.click(screen.getByText('Continue with Google'));
        expect(mockLogin).toHaveBeenCalledWith('google', undefined);
    });

    it('calls login with github when github button clicked', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        fireEvent.click(screen.getByText('Continue with GitHub'));
        expect(mockLogin).toHaveBeenCalledWith('github', undefined);
    });
});
