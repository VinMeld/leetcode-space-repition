import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import './SRSettings.css';

import { type SM2Settings, loadSettings, saveSettings, defaultSettings } from '../lib/settings';

// Multiplier presets for clearer UX
const MULTIPLIER_PRESETS = [
    { label: '½× (Shorter)', value: 0.5 },
    { label: '¾×', value: 0.75 },
    { label: '1× (No change)', value: 1.0 },
    { label: '1.5×', value: 1.5 },
    { label: '2× (Longer)', value: 2.0 },
];

interface MultiplierSelectProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    colorClass: 'easy' | 'medium' | 'hard';
}

function MultiplierSelect({ label, value, onChange, colorClass }: MultiplierSelectProps) {
    return (
        <div className={`sr-multiplier-row sr-multiplier-${colorClass}`}>
            <span className="sr-multiplier-label">{label}</span>
            <select
                className="sr-multiplier-select"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
            >
                {MULTIPLIER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                        {preset.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

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
                    <h3>Interval Adjustment</h3>
                    <p className="sr-settings-description">
                        Adjust intervals for each difficulty. This will be applied when you click "Reschedule All" below.
                    </p>

                    <div className="sr-multiplier-grid">
                        <MultiplierSelect
                            label="Easy"
                            value={settings.easyMultiplier}
                            onChange={(val) => updateSetting('easyMultiplier', val)}
                            colorClass="easy"
                        />
                        <MultiplierSelect
                            label="Medium"
                            value={settings.mediumMultiplier}
                            onChange={(val) => updateSetting('mediumMultiplier', val)}
                            colorClass="medium"
                        />
                        <MultiplierSelect
                            label="Hard"
                            value={settings.hardMultiplier}
                            onChange={(val) => updateSetting('hardMultiplier', val)}
                            colorClass="hard"
                        />
                    </div>

                    <p className="sr-settings-hint" style={{ marginTop: '12px' }}>
                        <strong>Shorter</strong> = see problems more often &nbsp;|&nbsp;
                        <strong>Longer</strong> = see problems less often
                    </p>

                    <Button
                        style={{ marginTop: '16px' }}
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
