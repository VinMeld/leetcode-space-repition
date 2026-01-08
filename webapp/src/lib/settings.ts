import type { FSRSSettings } from './fsrs';

export type { FSRSSettings };

export const defaultSettings: FSRSSettings = {
    requestRetention: 0.9,
    maxInterval: 365,
    sameDayRetry: true,
    minInterval: 1,
};

const STORAGE_KEY = 'fsrs-settings';

export function loadSettings(): FSRSSettings {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Migrate from old SM-2 settings if needed
            if ('easyMultiplier' in parsed) {
                // Old SM-2 settings detected, return defaults
                return defaultSettings;
            }
            return { ...defaultSettings, ...parsed };
        } catch {
            return defaultSettings;
        }
    }
    return defaultSettings;
}

export function saveSettings(settings: FSRSSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
