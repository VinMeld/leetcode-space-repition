import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { Problem } from '../hooks/useProblems';

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

    if (isLoading) return <div className="p-4">Loading details...</div>;
    if (error) return <div className="p-4 text-red-500">Error loading details</div>;
    if (!data) return null;

    const { problem, reviews, stats } = data;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">{problem.title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox label="Added" value={formatDate(problem.created_at)} />
                        <StatBox label="First Review" value={formatDate(stats.firstReview)} />
                        <StatBox label="Latest Review" value={formatDate(stats.latestReview)} />
                        <StatBox label="Due" value={formatDate(problem.next_review_date)} />

                        <StatBox label="Interval" value={`${problem.interval} days`} />
                        <StatBox label="Difficulty" value={problem.difficulty} />
                        <StatBox label="Reviews" value={stats.totalReviews} />
                        <StatBox label="Lapses" value={stats.lapses} />

                        <StatBox label="Avg Quality" value={stats.averageQuality.toFixed(2)} />
                        <StatBox label="Easiness" value={problem.easiness_factor.toFixed(2)} />
                    </div>

                    {/* History Table */}
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Review History</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-300">
                                <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Rating</th>
                                        <th className="px-4 py-3">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {reviews.map((review) => (
                                        <tr key={review.id} className="hover:bg-gray-700/50">
                                            <td className="px-4 py-3">{formatDate(review.reviewed_at)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getQualityColor(review.quality)}`}>
                                                    {review.quality}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {review.quality < 3 ? 'Lapse' : 'Review'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-gray-700/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-lg font-semibold text-white truncate" title={String(value)}>{value}</div>
        </div>
    );
}

function getQualityColor(quality: number) {
    if (quality >= 4) return 'bg-green-900 text-green-300';
    if (quality === 3) return 'bg-blue-900 text-blue-300';
    return 'bg-red-900 text-red-300';
}
