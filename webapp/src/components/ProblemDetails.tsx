import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { Problem } from '../hooks/useProblems';
import { X } from 'lucide-react';
import './ProblemDetails.css';

interface Review {
    id: number;
    quality: number;
    reviewed_at: string;
}

interface ProblemDetailsData {
    problem: Problem;
    reviews: Review[];
    stats: {
        lapses: number;
        averageQuality: number;
        firstReview: string | null;
        latestReview: string | null;
        totalReviews: number;
    };
}

interface ProblemDetailsProps {
    orderNum: number;
    onClose: () => void;
}

export function ProblemDetails({ orderNum, onClose }: ProblemDetailsProps) {
    const { token } = useAuth();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const { data, isLoading, error } = useQuery({
        queryKey: ['problemDetails', orderNum],
        queryFn: async () => {
            const res = await fetch(`${apiUrl}/problems/${orderNum}/details`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch details');
            return res.json() as Promise<ProblemDetailsData>;
        },
        enabled: !!token && !!orderNum,
    });

    // Handle escape key to close modal
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (isLoading) {
        return (
            <div className="problem-details-modal" onClick={onClose} onKeyDown={handleKeyDown}>
                <div className="problem-details-content" onClick={e => e.stopPropagation()}>
                    <div className="problem-details-loading">Loading details...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="problem-details-modal" onClick={onClose}>
                <div className="problem-details-content" onClick={e => e.stopPropagation()}>
                    <div className="problem-details-header">
                        <h2>Error</h2>
                        <button className="problem-details-close" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                    <div className="problem-details-body">
                        <div className="problem-details-empty">Error loading details</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { problem, reviews, stats } = data;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const getQualityClass = (quality: number) => {
        if (quality >= 4) return 'quality-high';
        if (quality >= 3) return 'quality-medium';
        return 'quality-low';
    };

    const getRatingLabel = (rating: number) => {
        switch (rating) {
            case 1: return 'Again';
            case 2: return 'Hard';
            case 3: return 'Good';
            case 4: return 'Easy';
            default: return String(rating);
        }
    };

    return (
        <div className="problem-details-modal" onClick={onClose}>
            <div className="problem-details-content" onClick={e => e.stopPropagation()}>
                <div className="problem-details-header">
                    <h2>{problem.title}</h2>
                    <button className="problem-details-close" onClick={onClose} title="Close">
                        <X size={24} />
                    </button>
                </div>

                <div className="problem-details-body">
                    {/* Stats Grid */}
                    <div className="problem-details-stats">
                        <StatBox label="Added" value={formatDate(problem.created_at)} />
                        <StatBox label="First Review" value={formatDate(stats.firstReview)} />
                        <StatBox label="Latest Review" value={formatDate(stats.latestReview)} />
                        <StatBox label="Due" value={formatDate(problem.next_review_date)} />

                        <StatBox label="Interval" value={`${problem.interval} days`} />
                        <StatBox label="Difficulty" value={problem.difficulty} />
                        <StatBox label="Reviews" value={stats.totalReviews} />
                        <StatBox label="Lapses" value={stats.lapses} />

                        <StatBox label="Stability" value={`${(problem.stability ?? 0).toFixed(1)} days`} />
                        <StatBox label="FSRS Difficulty" value={(problem.fsrs_difficulty ?? 5).toFixed(1)} />
                    </div>

                    {/* Review History */}
                    <div className="problem-details-history">
                        <h3>Review History</h3>
                        {reviews.length === 0 ? (
                            <div className="problem-details-empty">No reviews yet</div>
                        ) : (
                            <table className="problem-details-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Rating</th>
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reviews.map((review) => (
                                        <tr key={review.id}>
                                            <td>{formatDate(review.reviewed_at)}</td>
                                            <td>
                                                <span className={`quality-badge ${getQualityClass(review.quality)}`}>
                                                    {getRatingLabel(review.quality)}
                                                </span>
                                            </td>
                                            <td>{review.quality < 2 ? 'Lapse' : 'Review'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="stat-box">
            <div className="stat-box-label">{label}</div>
            <div className="stat-box-value" title={String(value)}>{value}</div>
        </div>
    );
}
