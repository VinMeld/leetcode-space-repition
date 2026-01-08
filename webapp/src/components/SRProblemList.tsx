import React, { useState } from 'react';
import { ExternalLink, Trash2, Calendar, StickyNote, Star } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import './SRProblemList.css';

interface Problem {
    id: number;
    order_num: number;
    title: string;
    leetcode_url: string;
    difficulty: 'easy' | 'medium' | 'hard';
    notes: string | null;
    next_review_date: Date;
    interval: number;
    // FSRS fields
    stability: number;
    fsrs_difficulty: number;
    fsrs_state: number;
    reps: number;
    lapses: number;
    isDueToday: boolean;
    created_at: string;
    is_starred: boolean;
    // Deprecated (optional)
    repetitions?: number;
    easiness_factor?: number;
}

interface SRProblemListProps {
    problems: Problem[];
    showDueOnly?: boolean;
    onReview: (problemId: number, rating: number) => void;
    onDelete: (problemId: number) => void;
    onInfo: (problem: Problem) => void;
    onStar: (problemId: number) => void;
    isReviewing?: number | null;
}

// FSRS ratings (1-4)
const RATING_LABELS = [
    { value: 1, label: 'Again', description: 'Forgot', color: 'danger' },
    { value: 2, label: 'Hard', description: 'Difficult recall', color: 'warning' },
    { value: 3, label: 'Good', description: 'Correct response', color: 'success' },
    { value: 4, label: 'Easy', description: 'Perfect recall', color: 'success' },
];

export const SRProblemList: React.FC<SRProblemListProps> = ({
    problems,
    showDueOnly = false,
    onReview,
    onDelete,
    onInfo,
    onStar,
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
                                Rep: {problem.reps}
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
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onInfo(problem)}
                                    className="info-btn mr-2"
                                    title="Details"
                                >
                                    <span className="text-blue-400">ℹ️</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onStar(problem.id)}
                                    className={`star-btn mr-2 ${problem.is_starred ? 'starred' : ''}`}
                                    title={problem.is_starred ? 'Unstar' : 'Star'}
                                >
                                    <Star size={16} fill={problem.is_starred ? 'currentColor' : 'none'} className={problem.is_starred ? 'text-yellow-400' : 'text-gray-400'} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(problem.id)}
                                    className="delete-btn"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SRProblemList;
