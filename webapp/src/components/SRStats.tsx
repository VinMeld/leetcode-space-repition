import React from 'react';
import { Heatmap } from './Heatmap';
import './SRStats.css';

interface SRStatsProps {
    reviewsByDate: Record<string, number>;
    problemsByDifficulty: {
        easy: number;
        medium: number;
        hard: number;
    };
    totalProblems: number;
}

export const SRStats: React.FC<SRStatsProps> = ({
    reviewsByDate,
    problemsByDifficulty,
}) => {
    const { easy, medium, hard } = problemsByDifficulty;
    const total = easy + medium + hard;

    const getPercentage = (count: number) => {
        if (total === 0) return 0;
        return Math.round((count / total) * 100);
    };

    return (
        <div className="sr-stats">
            <div className="sr-stats-section">
                <h3 className="sr-stats-title">Review Activity</h3>
                <p className="sr-stats-subtitle">Your review history over the past year</p>
                <Heatmap data={reviewsByDate} />
            </div>

            <div className="sr-stats-section">
                <h3 className="sr-stats-title">Difficulty Breakdown</h3>
                <p className="sr-stats-subtitle">Distribution of problems by difficulty</p>

                <div className="difficulty-chart">
                    <div className="difficulty-bar">
                        <div
                            className="difficulty-bar-segment difficulty-easy"
                            style={{ width: `${getPercentage(easy)}%` }}
                        />
                        <div
                            className="difficulty-bar-segment difficulty-medium"
                            style={{ width: `${getPercentage(medium)}%` }}
                        />
                        <div
                            className="difficulty-bar-segment difficulty-hard"
                            style={{ width: `${getPercentage(hard)}%` }}
                        />
                    </div>

                    <div className="difficulty-legend">
                        <div className="difficulty-item">
                            <span className="difficulty-dot difficulty-dot-easy" />
                            <span className="difficulty-label">Easy</span>
                            <span className="difficulty-count">{easy}</span>
                            <span className="difficulty-percent">({getPercentage(easy)}%)</span>
                        </div>
                        <div className="difficulty-item">
                            <span className="difficulty-dot difficulty-dot-medium" />
                            <span className="difficulty-label">Medium</span>
                            <span className="difficulty-count">{medium}</span>
                            <span className="difficulty-percent">({getPercentage(medium)}%)</span>
                        </div>
                        <div className="difficulty-item">
                            <span className="difficulty-dot difficulty-dot-hard" />
                            <span className="difficulty-label">Hard</span>
                            <span className="difficulty-count">{hard}</span>
                            <span className="difficulty-percent">({getPercentage(hard)}%)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SRStats;
