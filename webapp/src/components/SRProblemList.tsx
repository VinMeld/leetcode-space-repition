import React, { useState } from 'react';
import { ExternalLink, Trash2, Calendar, StickyNote } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import './SRProblemList.css';

interface Problem {
    id: number;
    title: string;
    leetcode_url: string;
    difficulty: 'easy' | 'medium' | 'hard';
    notes: string | null;
    next_review_date: Date;
    interval: number;
    repetitions: number;
    easiness_factor: number;
    isDueToday: boolean;
}

interface SRProblemListProps {
    problems: Problem[];
    showDueOnly?: boolean;
    onReview: (problemId: number, quality: number) => void;
    onDelete: (problemId: number) => void;
    isReviewing?: number | null;
}

const RATING_LABELS = [
    { value: 0, label: '0', description: 'Blackout', color: 'danger' },
    { value: 1, label: '1', description: 'Wrong', color: 'danger' },
    { value: 2, label: '2', description: 'Hard', color: 'warning' },
    { value: 3, label: '3', description: 'Good', color: 'warning' },
    { value: 4, label: '4', description: 'Easy', color: 'success' },
    { value: 5, label: '5', description: 'Perfect', color: 'success' },
];

export const SRProblemList: React.FC<SRProblemListProps> = ({
    problems,
    showDueOnly = false,
    onReview,
    onDelete,
    isReviewing,
}) => {
    const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

    const filteredProblems = showDueOnly
        ? problems.filter(p => p.isDueToday)
        : problems;

    const toggleNotes = (id: number) => {
        setExpandedNotes(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    if (filteredProblems.length === 0) {
        return (
            <div className="problem-list-empty">
                <div className="problem-list-empty-icon">🎉</div>
                <h3>
                    {showDueOnly ? 'No problems due today!' : 'No problems yet'}
                </h3>
                <p>
                    {showDueOnly
                        ? 'Great job! Come back later or add new problems to track.'
                        : 'Add your first LeetCode problem to start tracking.'}
                </p>
            </div>
        );
    }

    return (
        <div className="problem-list">
            {filteredProblems.map((problem) => (
                <div
                    key={problem.id}
                    className={`problem-card ${problem.isDueToday ? 'problem-card-due' : ''}`}
                >
                    <div className="problem-card-header">
                        <div className="problem-card-title-row">
                            <a
                                href={problem.leetcode_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="problem-title"
                            >
                                {problem.title}
                                <ExternalLink size={14} />
                            </a>
                            <Badge variant={problem.difficulty}>{problem.difficulty}</Badge>
                        </div>

                        <div className="problem-meta">
                            <span className="problem-meta-item">
                                <Calendar size={14} />
                                {problem.isDueToday ? 'Due today' : `Next: ${formatDate(problem.next_review_date)}`}
                            </span>
                            {problem.interval > 0 && (
                                <span className="problem-meta-item">
                                    Interval: {problem.interval}d
                                </span>
                            )}
                            <span className="problem-meta-item">
                                Rep: {problem.repetitions}
                            </span>
                        </div>
                    </div>

                    {problem.notes && (
                        <div className="problem-notes-section">
                            <button
                                className="problem-notes-toggle"
                                onClick={() => toggleNotes(problem.id)}
                            >
                                <StickyNote size={14} />
                                {expandedNotes.has(problem.id) ? 'Hide notes' : 'Show notes'}
                            </button>
                            {expandedNotes.has(problem.id) && (
                                <div className="problem-notes animate-fade-in">
                                    {problem.notes}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="problem-card-actions">
                        {problem.isDueToday && (
                            <div className="rating-buttons">
                                <span className="rating-label">Rate recall:</span>
                                {RATING_LABELS.map(rating => (
                                    <button
                                        key={rating.value}
                                        className={`rating-btn rating-btn-${rating.color}`}
                                        onClick={() => onReview(problem.id, rating.value)}
                                        disabled={isReviewing === problem.id}
                                        title={rating.description}
                                    >
                                        {rating.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!showDueOnly && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(problem.id)}
                                className="delete-btn"
                            >
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SRProblemList;
