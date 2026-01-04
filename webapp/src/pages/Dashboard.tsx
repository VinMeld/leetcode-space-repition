import React, { useState } from 'react';
import { Clock, BookOpen, BarChart3, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../components/AppLayout';
import { SRHeader } from '../components/SRHeader';
import { SRProblemList } from '../components/SRProblemList';
import { SRStats } from '../components/SRStats';
import { SRAddProblem } from '../components/SRAddProblem';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import {
    useProblems,
    useStats,
    useCreateProblem,
    useReviewProblem,
    useDeleteProblem,
} from '../hooks/useProblems';
import type { CreateProblemData } from '../hooks/useProblems';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('due');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [reviewingProblem, setReviewingProblem] = useState<number | null>(null);

    const { data: problems = [], isLoading: problemsLoading } = useProblems();
    const { data: stats } = useStats();
    const createProblem = useCreateProblem();
    const reviewProblem = useReviewProblem();
    const deleteProblem = useDeleteProblem();

    const dueCount = problems.filter(p => p.isDueToday).length;

    const tabs = [
        { id: 'due', label: 'Due Today', icon: <Clock size={16} />, count: dueCount },
        { id: 'all', label: 'All Problems', icon: <BookOpen size={16} /> },
        { id: 'stats', label: 'Stats', icon: <BarChart3 size={16} /> },
    ];

    const handleAddProblem = async (data: CreateProblemData) => {
        try {
            await createProblem.mutateAsync(data);
            toast.success('Problem added successfully!');
        } catch (error) {
            toast.error('Failed to add problem');
            throw error;
        }
    };

    const handleReview = async (problemId: number, quality: number) => {
        setReviewingProblem(problemId);
        try {
            await reviewProblem.mutateAsync({ problemId, quality });
            const qualityMessage = quality >= 3 ? 'Great job!' : 'Keep practicing!';
            toast.success(`Review recorded. ${qualityMessage}`);
        } catch {
            toast.error('Failed to record review');
        } finally {
            setReviewingProblem(null);
        }
    };

    const handleDelete = async (problemId: number) => {
        if (!confirm('Are you sure you want to delete this problem?')) return;

        try {
            await deleteProblem.mutateAsync(problemId);
            toast.success('Problem deleted');
        } catch {
            toast.error('Failed to delete problem');
        }
    };

    return (
        <AppLayout>
            <div className="dashboard">
                <SRHeader
                    dueToday={stats?.problemsDueToday || dueCount}
                    totalProblems={stats?.totalProblems || problems.length}
                    streak={stats?.streakDays || 0}
                    totalReviews={stats?.totalReviews || 0}
                />

                <div className="dashboard-toolbar">
                    <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    <Button
                        variant="primary"
                        leftIcon={<Plus size={18} />}
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        Add Problem
                    </Button>
                </div>

                {problemsLoading ? (
                    <div className="dashboard-loading">
                        <div className="loading-spinner" />
                        <p>Loading problems...</p>
                    </div>
                ) : (
                    <>
                        <TabPanel id="due" activeTab={activeTab}>
                            <SRProblemList
                                problems={problems}
                                showDueOnly={true}
                                onReview={handleReview}
                                onDelete={handleDelete}
                                isReviewing={reviewingProblem}
                            />
                        </TabPanel>

                        <TabPanel id="all" activeTab={activeTab}>
                            <SRProblemList
                                problems={problems}
                                showDueOnly={false}
                                onReview={handleReview}
                                onDelete={handleDelete}
                                isReviewing={reviewingProblem}
                            />
                        </TabPanel>

                        <TabPanel id="stats" activeTab={activeTab}>
                            <SRStats
                                reviewsByDate={stats?.reviewsByDate || {}}
                                problemsByDifficulty={stats?.problemsByDifficulty || { easy: 0, medium: 0, hard: 0 }}
                                totalProblems={stats?.totalProblems || 0}
                            />
                        </TabPanel>
                    </>
                )}

                <SRAddProblem
                    isOpen={isAddDialogOpen}
                    onClose={() => setIsAddDialogOpen(false)}
                    onSubmit={handleAddProblem}
                />
            </div>
        </AppLayout>
    );
};

export default Dashboard;
