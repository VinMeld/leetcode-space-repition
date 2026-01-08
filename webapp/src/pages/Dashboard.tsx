import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, BarChart3, Plus, Settings, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../components/AppLayout';
import { SRHeader } from '../components/SRHeader';
import { SRProblemList } from '../components/SRProblemList';
import { SRAllProblems } from '../components/SRAllProblems';
import { SRStats } from '../components/SRStats';
import { SRAddProblem } from '../components/SRAddProblem';
import { SRSettings } from '../components/SRSettings';
import { SRAnkiImport } from '../components/SRAnkiImport';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import {
    useProblems,
    useStats,
    type Problem,
} from '../hooks/useProblems';
import type { CreateProblemData } from '../hooks/useProblems';
import { ProblemDetails } from '../components/ProblemDetails';
import { loadSettings } from '../lib/settings';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

type UIProblem = Omit<Problem, 'next_review_date' | 'notes'> & {
    next_review_date: Date;
    notes: string | null;
};

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('due');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isAnkiImportOpen, setIsAnkiImportOpen] = useState(false);
    const [reviewingProblem, setReviewingProblem] = useState<number | null>(null);
    const [selectedProblem, setSelectedProblem] = useState<UIProblem | null>(null);

    const { problems: problemsQuery, createProblem, reviewProblem, deleteProblem, toggleStar } = useProblems();
    const { data: problems = [], isLoading: problemsLoading } = problemsQuery;
    const { data: stats } = useStats();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const dueCount = problems.filter(p => p.isDueToday).length;

    const tabs = [
        { id: 'due', label: 'Due Today', icon: <Clock size={16} />, count: dueCount },
        { id: 'all', label: 'All Problems', icon: <BookOpen size={16} />, count: problems.length },
        { id: 'stats', label: 'Stats', icon: <BarChart3 size={16} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
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

    const handleBulkImport = async (problems: CreateProblemData[]) => {
        let successCount = 0;
        let failCount = 0;

        for (const problem of problems) {
            try {
                await createProblem.mutateAsync(problem);
                successCount++;
            } catch {
                failCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Imported ${successCount} problems`);
        }
        if (failCount > 0) {
            toast.error(`Failed to import ${failCount} problems`);
        }
    };

    const handleReview = async (problemId: number, rating: number) => {
        setReviewingProblem(problemId);
        try {
            const settings = loadSettings();
            await reviewProblem.mutateAsync({
                problemId,
                rating,
                settings
            });
            const ratingMessage = rating >= 3 ? 'Great job!' : 'Keep practicing!';
            toast.success(`Review recorded. ${ratingMessage}`);
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

    const handleStar = async (problemId: number) => {
        try {
            await toggleStar.mutateAsync(problemId);
        } catch {
            toast.error('Failed to toggle star');
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
                    onLogout={handleLogout}
                />

                <div className="dashboard-toolbar">
                    <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    <div className="dashboard-actions">
                        <Button
                            variant="ghost"
                            leftIcon={<Upload size={18} />}
                            onClick={() => setIsAnkiImportOpen(true)}
                        >
                            Import
                        </Button>
                        <Button
                            variant="primary"
                            leftIcon={<Plus size={18} />}
                            onClick={() => setIsAddDialogOpen(true)}
                        >
                            Add Problem
                        </Button>
                    </div>
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
                                problems={problems.map(p => ({
                                    ...p,
                                    next_review_date: new Date(p.next_review_date),
                                    notes: p.notes || null,
                                }))}
                                showDueOnly={true}
                                onReview={handleReview}
                                onDelete={handleDelete}
                                onInfo={setSelectedProblem}
                                onStar={handleStar}
                                isReviewing={reviewingProblem}
                            />
                        </TabPanel>

                        <TabPanel id="all" activeTab={activeTab}>
                            <SRAllProblems
                                problems={problems.map(p => ({
                                    ...p,
                                    next_review_date: new Date(p.next_review_date),
                                    notes: p.notes || null,
                                }))}
                                onReview={handleReview}
                                onDelete={handleDelete}
                                onInfo={setSelectedProblem}
                                onStar={handleStar}
                            />
                        </TabPanel>

                        <TabPanel id="stats" activeTab={activeTab}>
                            <SRStats
                                reviewsByDate={stats?.reviewsByDate || {}}
                                problemsByDifficulty={stats?.problemsByDifficulty || { easy: 0, medium: 0, hard: 0 }}
                                totalProblems={stats?.totalProblems || 0}
                            />
                        </TabPanel>

                        <TabPanel id="settings" activeTab={activeTab}>
                            <SRSettings />
                        </TabPanel>
                    </>
                )}

                <SRAddProblem
                    isOpen={isAddDialogOpen}
                    onClose={() => setIsAddDialogOpen(false)}
                    onSubmit={handleAddProblem}
                />

                <Dialog
                    isOpen={isAnkiImportOpen}
                    onClose={() => setIsAnkiImportOpen(false)}
                    title="Import from Anki"
                >
                    <SRAnkiImport
                        onImport={handleBulkImport}
                        onClose={() => setIsAnkiImportOpen(false)}
                    />
                </Dialog>

                {selectedProblem && (
                    <ProblemDetails
                        orderNum={selectedProblem.order_num}
                        onClose={() => setSelectedProblem(null)}
                    />
                )}
            </div>
        </AppLayout>
    );
};

export default Dashboard;
