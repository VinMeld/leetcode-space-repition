import React from 'react';
import { Clock, BookOpen, Flame, Target, LogOut } from 'lucide-react';
import './SRHeader.css';

interface SRHeaderProps {
    dueToday: number;
    totalProblems: number;
    streak: number;
    totalReviews: number;
    onLogout?: () => void;
}

export const SRHeader: React.FC<SRHeaderProps> = ({
    dueToday,
    totalProblems,
    streak,
    totalReviews,
    onLogout,
}) => {
    return (
        <div className="sr-header">
            <div className="sr-stats-grid">
                <div className="sr-stat-card sr-stat-due">
                    <div className="sr-stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="sr-stat-content">
                        <span className="sr-stat-value">{dueToday}</span>
                        <span className="sr-stat-label">Due Today</span>
                    </div>
                </div>

                <div className="sr-stat-card">
                    <div className="sr-stat-icon">
                        <BookOpen size={24} />
                    </div>
                    <div className="sr-stat-content">
                        <span className="sr-stat-value">{totalProblems}</span>
                        <span className="sr-stat-label">Total Problems</span>
                    </div>
                </div>

                <div className="sr-stat-card sr-stat-streak">
                    <div className="sr-stat-icon">
                        <Flame size={24} />
                    </div>
                    <div className="sr-stat-content">
                        <span className="sr-stat-value">{streak}</span>
                        <span className="sr-stat-label">Day Streak</span>
                    </div>
                </div>

                <div className="sr-stat-card">
                    <div className="sr-stat-icon">
                        <Target size={24} />
                    </div>
                    <div className="sr-stat-content">
                        <span className="sr-stat-value">{totalReviews}</span>
                        <span className="sr-stat-label">Total Reviews</span>
                    </div>
                </div>
            </div>

            {onLogout && (
                <button className="sr-logout-btn" onClick={onLogout} title="Logout">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            )}
        </div>
    );
};

export default SRHeader;
