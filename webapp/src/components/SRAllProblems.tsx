import { useState, useMemo } from 'react';
import { Badge } from './ui/Badge';
import { Search, ExternalLink, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import './SRAllProblems.css';

interface Problem {
    id: number;
    title: string;
    leetcode_url: string;
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string | null;
    next_review_date: Date;
    interval: number;
    repetitions: number;
    isDueToday?: boolean;
}

interface SRAllProblemsProps {
    problems: Problem[];
    onReview: (problemId: number, quality: number) => void;
    onDelete: (problemId: number) => void;
    onInfo: (problem: Problem) => void;
}

type SortField = 'title' | 'difficulty' | 'next_review_date' | 'interval';
type SortDirection = 'asc' | 'desc';
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

const SortIcon = ({ field, currentSortField, sortDirection }: { field: SortField, currentSortField: SortField, sortDirection: SortDirection }) => {
    if (currentSortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
};

export function SRAllProblems({ problems, onReview, onDelete, onInfo }: SRAllProblemsProps) {
    const [filter, setFilter] = useState<DifficultyFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('next_review_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const filteredProblems = useMemo(() => {
        let result = [...problems];

        // Apply difficulty filter
        if (filter !== 'all') {
            result = result.filter(p => p.difficulty === filter);
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(query) ||
                p.notes?.toLowerCase().includes(query)
            );
        }

        // Apply sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'difficulty': {
                    const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
                    comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                    break;
                }
                case 'next_review_date':
                    comparison = new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime();
                    break;
                case 'interval':
                    comparison = a.interval - b.interval;
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [problems, filter, searchQuery, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // SortIcon moved outside or defined here as a render function if needed, but better as a separate component
    // However, since it uses closure variables sortField and sortDirection, we can pass them as props
    // to a component defined outside.


    const formatDate = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        return `In ${diffDays} days`;
    };

    const counts = {
        all: problems.length,
        easy: problems.filter(p => p.difficulty === 'easy').length,
        medium: problems.filter(p => p.difficulty === 'medium').length,
        hard: problems.filter(p => p.difficulty === 'hard').length,
    };

    return (
        <div className="sr-all-problems">
            {/* Filter tabs */}
            <div className="sr-all-problems-filters">
                {(['all', 'easy', 'medium', 'hard'] as const).map(f => (
                    <button
                        key={f}
                        className={`sr-filter-tab ${filter === f ? 'active' : ''} ${f !== 'all' ? `sr-filter-${f}` : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="sr-filter-count">{counts[f]}</span>
                    </button>
                ))}
            </div>

            {/* Search bar */}
            <div className="sr-all-problems-search">
                <Search size={18} className="sr-search-icon" />
                <input
                    type="text"
                    placeholder="Search problems..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Problems table */}
            <div className="sr-all-problems-table-wrapper">
                <table className="sr-all-problems-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('title')} className="sortable">
                                Title <SortIcon field="title" currentSortField={sortField} sortDirection={sortDirection} />
                            </th>
                            <th onClick={() => handleSort('difficulty')} className="sortable">
                                Difficulty <SortIcon field="difficulty" currentSortField={sortField} sortDirection={sortDirection} />
                            </th>
                            <th onClick={() => handleSort('next_review_date')} className="sortable">
                                Next Review <SortIcon field="next_review_date" currentSortField={sortField} sortDirection={sortDirection} />
                            </th>
                            <th onClick={() => handleSort('interval')} className="sortable">
                                Interval <SortIcon field="interval" currentSortField={sortField} sortDirection={sortDirection} />
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProblems.map(problem => (
                            <tr key={problem.id} className={problem.isDueToday ? 'due-today' : ''}>
                                <td className="title-cell">
                                    <a href={problem.leetcode_url} target="_blank" rel="noopener noreferrer">
                                        {problem.title}
                                        <ExternalLink size={14} />
                                    </a>
                                </td>
                                <td>
                                    <Badge variant={problem.difficulty}>{problem.difficulty}</Badge>
                                </td>
                                <td className={problem.isDueToday ? 'due-today-text' : ''}>
                                    <Calendar size={14} />
                                    {formatDate(problem.next_review_date)}
                                </td>
                                <td>{problem.interval} days</td>
                                <td className="actions-cell">
                                    <div className="sr-action-buttons">
                                        <button
                                            className="sr-action-btn sr-action-easy"
                                            onClick={() => onReview(problem.id, 5)}
                                            title="Easy - knew it perfectly"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            className="sr-action-btn sr-action-medium"
                                            onClick={() => onReview(problem.id, 3)}
                                            title="Medium - got it with effort"
                                        >
                                            ~
                                        </button>
                                        <button
                                            className="sr-action-btn sr-action-hard"
                                            onClick={() => onReview(problem.id, 1)}
                                            title="Hard - struggled"
                                        >
                                            ✗
                                        </button>
                                        <button
                                            className="sr-action-btn sr-action-info"
                                            onClick={() => onInfo(problem)}
                                            title="Details"
                                        >
                                            ℹ️
                                        </button>
                                        <button
                                            className="sr-action-btn sr-action-delete"
                                            onClick={() => onDelete(problem.id)}
                                            title="Delete"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredProblems.length === 0 && (
                    <div className="sr-all-problems-empty">
                        {searchQuery ? 'No problems match your search.' : 'No problems found.'}
                    </div>
                )}
            </div>

            <div className="sr-all-problems-summary">
                Showing {filteredProblems.length} of {problems.length} problems
            </div>
        </div>
    );
}
