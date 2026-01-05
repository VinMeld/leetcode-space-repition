export interface SM2Settings {
    easyMultiplier: number;
    mediumMultiplier: number;
    hardMultiplier: number;
    sameDayRetry: boolean;
    wrongAnswerPenalty: number;
    minInterval: number;
}

export const defaultSettings: SM2Settings = {
    easyMultiplier: 1.0,
    mediumMultiplier: 1.0,
    hardMultiplier: 1.0,
    sameDayRetry: true,
    wrongAnswerPenalty: 0.5,
    minInterval: 1,
};

export function loadSettings(): SM2Settings {
    const stored = localStorage.getItem('sm2-settings');
    if (stored) {
        try {
            return { ...defaultSettings, ...JSON.parse(stored) };
        } catch {
            return defaultSettings;
        }
    }
    return defaultSettings;
}

export function saveSettings(settings: SM2Settings): void {
    localStorage.setItem('sm2-settings', JSON.stringify(settings));
}
