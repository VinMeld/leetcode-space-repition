import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import './SRSettings.css';

import { type SM2Settings, loadSettings, saveSettings, defaultSettings } from '../lib/settings';

interface SRSettingsProps {
    onClose?: () => void;
}

export function SRSettings({ onClose }: SRSettingsProps) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SM2Settings>(loadSettings);

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    const updateSetting = <K extends keyof SM2Settings>(key: K, value: SM2Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setIsChangingPassword(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const token = localStorage.getItem('token');

            const res = await fetch(`${apiUrl}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to change password');
            }

            toast.success('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="sr-settings">
            <div className="sr-settings-header">
                <h2>Settings</h2>
                {onClose && (
                    <button className="sr-settings-close" onClick={onClose}>×</button>
                )}
            </div>

            <div className="sr-settings-content">
                <div className="sr-settings-section">
                    <h3>Spaced Repetition</h3>
                    <p className="sr-settings-description">
                        Adjust how often problems of each difficulty appear. Higher = less frequent.
                    </p>

                    <div className="sr-settings-slider-group">
                        <label>
                            <span className="sr-settings-label">
                                Easy
                                <span className="sr-settings-value">{settings.easyMultiplier.toFixed(2)}x</span>
                            </span>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={settings.easyMultiplier}
                                onChange={(e) => updateSetting('easyMultiplier', parseFloat(e.target.value))}
                                className="sr-slider sr-slider-easy"
                            />
                        </label>

                        <label>
                            <span className="sr-settings-label">
                                Medium
                                <span className="sr-settings-value">{settings.mediumMultiplier.toFixed(2)}x</span>
                            </span>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={settings.mediumMultiplier}
                                onChange={(e) => updateSetting('mediumMultiplier', parseFloat(e.target.value))}
                                className="sr-slider sr-slider-medium"
                            />
                        </label>

                        <label>
                            <span className="sr-settings-label">
                                Hard
                                <span className="sr-settings-value">{settings.hardMultiplier.toFixed(2)}x</span>
                            </span>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={settings.hardMultiplier}
                                onChange={(e) => updateSetting('hardMultiplier', parseFloat(e.target.value))}
                                className="sr-slider sr-slider-hard"
                            />
                        </label>
                    </div>
                </div>

                <div className="sr-settings-section">
                    <h3>Review Behavior</h3>

                    <label className="sr-settings-toggle">
                        <input
                            type="checkbox"
                            checked={settings.sameDayRetry}
                            onChange={(e) => updateSetting('sameDayRetry', e.target.checked)}
                        />
                        <span className="sr-toggle-slider"></span>
                        <span className="sr-toggle-label">
                            Show again today if answered wrong (quality &lt; 3)
                        </span>
                    </label>

                    <div className="sr-settings-slider-group">
                        <label>
                            <span className="sr-settings-label">
                                Wrong Answer Penalty
                                <span className="sr-settings-value">{(settings.wrongAnswerPenalty * 100).toFixed(0)}%</span>
                            </span>
                            <input
                                type="range"
                                min="0.2"
                                max="1"
                                step="0.1"
                                value={settings.wrongAnswerPenalty}
                                onChange={(e) => updateSetting('wrongAnswerPenalty', parseFloat(e.target.value))}
                                className="sr-slider"
                            />
                            <span className="sr-settings-hint">
                                Multiply interval by this when wrong (lower = more aggressive relearning)
                            </span>
                        </label>

                        <label>
                            <span className="sr-settings-label">
                                Minimum Interval (days)
                                <span className="sr-settings-value">{settings.minInterval}</span>
                            </span>
                            <input
                                type="range"
                                min="1"
                                max="7"
                                step="1"
                                value={settings.minInterval}
                                onChange={(e) => updateSetting('minInterval', parseInt(e.target.value))}
                                className="sr-slider"
                            />
                        </label>
                    </div>
                </div>

                {user?.provider === 'local' && (
                    <div className="sr-settings-section">
                        <h3>Change Password</h3>
                        <form onSubmit={handleChangePassword} className="sr-settings-form">
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <Button
                                type="submit"
                                isLoading={isChangingPassword}
                                className="sr-settings-btn"
                            >
                                Update Password
                            </Button>
                        </form>
                    </div>
                )}

                <div className="sr-settings-section">
                    <h3>Reschedule</h3>
                    <p className="sr-settings-description">
                        Apply current multipliers to all existing problem intervals. Use this if you changed difficulty settings and want them to take effect immediately on old reviews.
                    </p>
                    <Button
                        onClick={async () => {
                            if (confirm('This will recalculate intervals for ALL problems based on your current settings. Continue?')) {
                                try {
                                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`${apiUrl}/problems/reschedule`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ settings }),
                                    });
                                    if (!res.ok) throw new Error('Failed to reschedule');
                                    const data = await res.json();
                                    toast.success(`Rescheduled ${data.updatedCount} problems`);
                                    window.location.reload();
                                } catch (error) {
                                    toast.error('Failed to reschedule');
                                    console.error(error);
                                }
                            }
                        }}
                    >
                        Reschedule All
                    </Button>
                </div>

                <div className="sr-settings-section sr-settings-danger">
                    <h3>Danger Zone</h3>
                    <p className="sr-settings-description">
                        Irreversible actions. Please be careful.
                    </p>
                    <Button
                        variant="danger"
                        onClick={async () => {
                            if (confirm('Are you sure you want to delete ALL your problems and review history? This cannot be undone.')) {
                                try {
                                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`${apiUrl}/problems/delete-all`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`
                                        }
                                    });
                                    if (!res.ok) throw new Error('Failed to delete data');
                                    toast.success('All data deleted successfully');
                                    // Optional: Refresh or redirect
                                    window.location.reload();
                                } catch (error) {
                                    toast.error('Failed to delete data');
                                    console.error(error);
                                }
                            }
                        }}
                    >
                        Delete All Data
                    </Button>
                </div>

                <div className="sr-settings-actions">
                    <button
                        className="sr-settings-reset"
                        onClick={() => setSettings(defaultSettings)}
                    >
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
