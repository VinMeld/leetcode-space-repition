import React from 'react';
import { Brain } from 'lucide-react';
import './AppLayout.css';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="app-header-content">
                    <div className="app-logo">
                        <div className="app-logo-icon">
                            <Brain size={28} />
                        </div>
                        <div className="app-logo-text">
                            <h1>LeetCode SR</h1>
                            <span>Spaced Repetition Tracker</span>
                        </div>
                    </div>
                </div>
            </header>
            <main className="app-main">
                <div className="app-container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
