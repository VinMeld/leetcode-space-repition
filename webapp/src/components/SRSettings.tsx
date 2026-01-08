import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import './SRSettings.css';

import { type FSRSSettings, loadSettings, saveSettings, defaultSettings } from '../lib/settings';

interface SRSettingsProps {
    onClose?: () => void;
}

export function SRSettings({ onClose }: SRSettingsProps) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<FSRSSettings>(loadSettings);
    const previousRetentionRef = useRef(settings.requestRetention);

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    const updateSetting = <K extends keyof FSRSSettings>(key: K, value: FSRSSettings[K]) => {
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
                    <h3>FSRS Scheduling</h3>
                    <p className="sr-settings-description">
                        Target Memory Retention — the percentage of problems you want to remember when reviewed.
                    </p>

                    <div className="sr-settings-slider-group">
                        <label>
                            <span className="sr-settings-label">
                                Target Retention
                                <span className="sr-settings-value sr-retention-value">
                                    {(settings.requestRetention * 100).toFixed(0)}%
                                </span>
                            </span>
                            <input
                                type="range"
                                min="0.70"
                                max="0.97"
                                step="0.01"
                                value={settings.requestRetention}
                                onChange={(e) => updateSetting('requestRetention', parseFloat(e.target.value))}
                                className="sr-slider sr-retention-slider"
                            />
                            <div className="sr-retention-scale">
                                <span>70%</span>
                                <span>Fewer reviews</span>
                                <span>↔</span>
                                <span>More retention</span>
                                <span>97%</span>
                            </div>
                            <span className="sr-settings-hint">
                                Higher = remember more, but review more often. Lower = fewer reviews, but forget more.
                            </span>
                        </label>

                        <label>
                            <span className="sr-settings-label">
                                Maximum Interval (days)
                                <span className="sr-settings-value">{settings.maxInterval}</span>
                            </span>
                            <input
                                type="range"
                                min="30"
                                max="365"
                                step="30"
                                value={settings.maxInterval}
                                onChange={(e) => updateSetting('maxInterval', parseInt(e.target.value))}
                                className="sr-slider"
                            />
                            <span className="sr-settings-hint">
                                Longest time between reviews (caps very stable memories)
                            </span>
                        </label>
                    </div>

                    <Button
                        style={{ marginTop: '16px' }}
                        onClick={async () => {
                            if (confirm('This will recalculate intervals for ALL problems based on your new target retention. Continue?')) {
                                try {
                                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`${apiUrl}/problems/reschedule`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                            settings: {
                                                requestRetention: settings.requestRetention,
                                                maxInterval: settings.maxInterval,
                                            },
                                            previousRetention: previousRetentionRef.current,
                                        }),
                                    });
                                    if (!res.ok) throw new Error('Failed to reschedule');
                                    const data = await res.json();
                                    toast.success(`Rescheduled ${data.updatedCount} problems`);
                                    previousRetentionRef.current = settings.requestRetention;
                                    window.location.reload();
                                } catch (error) {
                                    toast.error('Failed to reschedule');
                                    console.error(error);
                                }
                            }
                        }}
                    >
                        Reschedule All Problems
                    </Button>
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
                            Show again today if answered "Again"
                        </span>
                    </label>

                    <div className="sr-settings-slider-group">
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
