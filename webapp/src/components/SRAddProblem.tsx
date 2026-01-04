import React, { useState } from 'react';
import { z } from 'zod';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input, Textarea, Select } from './ui/Form';
import './SRAddProblem.css';

const problemSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    leetcodeUrl: z.string().url('Please enter a valid URL'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    notes: z.string().optional(),
});

type ProblemFormData = z.infer<typeof problemSchema>;

interface SRAddProblemProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ProblemFormData) => Promise<void>;
}

export const SRAddProblem: React.FC<SRAddProblemProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const [formData, setFormData] = useState<ProblemFormData>({
        title: '',
        leetcodeUrl: '',
        difficulty: 'medium',
        notes: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof ProblemFormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof ProblemFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = problemSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof ProblemFormData, string>> = {};
            result.error.errors.forEach(err => {
                const field = err.path[0] as keyof ProblemFormData;
                fieldErrors[field] = err.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(result.data);
            // Reset form on success
            setFormData({
                title: '',
                leetcodeUrl: '',
                difficulty: 'medium',
                notes: '',
            });
            onClose();
        } catch (error) {
            console.error('Failed to add problem:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Add New Problem" size="md">
            <form onSubmit={handleSubmit} className="add-problem-form">
                <Input
                    id="title"
                    label="Problem Title"
                    placeholder="e.g., Two Sum"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    error={errors.title}
                    autoFocus
                />

                <Input
                    id="leetcodeUrl"
                    label="LeetCode URL"
                    type="url"
                    placeholder="https://leetcode.com/problems/two-sum/"
                    value={formData.leetcodeUrl}
                    onChange={(e) => handleChange('leetcodeUrl', e.target.value)}
                    error={errors.leetcodeUrl}
                />

                <Select
                    id="difficulty"
                    label="Difficulty"
                    value={formData.difficulty}
                    onChange={(e) => handleChange('difficulty', e.target.value)}
                    options={[
                        { value: 'easy', label: 'Easy' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'hard', label: 'Hard' },
                    ]}
                />

                <Textarea
                    id="notes"
                    label="Notes (optional)"
                    placeholder="Add hints, key insights, or reminders for future review..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={4}
                />

                <div className="add-problem-actions">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isSubmitting}>
                        Add Problem
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default SRAddProblem;
