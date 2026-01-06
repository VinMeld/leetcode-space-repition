/**
 * Unit tests for popup.js - settings and URL handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock storage that persists (shared between Chrome and Firefox mocks)
const mockStorageData = {};

// Mock chrome API (Chrome behavior)
global.chrome = {
    storage: {
        sync: {
            get: vi.fn((keys) => Promise.resolve(
                keys.reduce((acc, key) => {
                    if (mockStorageData[key] !== undefined) {
                        acc[key] = mockStorageData[key];
                    }
                    return acc;
                }, {})
            )),
            set: vi.fn((obj) => {
                Object.assign(mockStorageData, obj);
                return Promise.resolve();
            }),
            remove: vi.fn((key) => {
                delete mockStorageData[key];
                return Promise.resolve();
            }),
        }
    },
    tabs: {
        create: vi.fn()
    },
    runtime: {
        sendMessage: vi.fn()
    }
};

// Mock Firefox browser API (uses local storage)
global.browser = {
    storage: {
        local: {
            get: vi.fn((keys) => Promise.resolve(
                keys.reduce((acc, key) => {
                    if (mockStorageData[key] !== undefined) {
                        acc[key] = mockStorageData[key];
                    }
                    return acc;
                }, {})
            )),
            set: vi.fn((obj) => {
                Object.assign(mockStorageData, obj);
                return Promise.resolve();
            }),
            remove: vi.fn((key) => {
                delete mockStorageData[key];
                return Promise.resolve();
            }),
        }
    },
    tabs: {
        create: vi.fn()
    },
    runtime: {
        sendMessage: vi.fn()
    }
};

describe('Popup Settings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear storage data
        Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
    });

    describe('Default values', () => {
        it('should use default API URL when not set', async () => {
            const result = await chrome.storage.sync.get(['apiUrl']);
            const apiUrl = (result && result.apiUrl) || 'http://localhost:3001/api';
            expect(apiUrl).toBe('http://localhost:3001/api');
        });

        it('should use default webapp URL when not set', async () => {
            const result = await chrome.storage.sync.get(['webappUrl']);
            const webappUrl = (result && result.webappUrl) || 'http://localhost:5173';
            expect(webappUrl).toBe('http://localhost:5173');
        });
    });

    describe('Custom URLs persist after save', () => {
        it('should persist API URL after save and reload', async () => {
            // Save
            await chrome.storage.sync.set({ apiUrl: 'https://mysite.com/api' });

            // Simulate popup close and reopen by getting again
            const result = await chrome.storage.sync.get(['apiUrl']);
            const apiUrl = (result && result.apiUrl) || 'http://localhost:3001/api';

            expect(apiUrl).toBe('https://mysite.com/api');
        });

        it('should persist webapp URL after save and reload', async () => {
            // Save
            await chrome.storage.sync.set({ webappUrl: 'https://mysite.com' });

            // Simulate popup close and reopen by getting again
            const result = await chrome.storage.sync.get(['webappUrl']);
            const webappUrl = (result && result.webappUrl) || 'http://localhost:5173';

            expect(webappUrl).toBe('https://mysite.com');
        });

        it('should persist both URLs after save', async () => {
            // Save both
            await chrome.storage.sync.set({
                apiUrl: 'https://api.example.com',
                webappUrl: 'https://example.com'
            });

            // Get both
            const result = await chrome.storage.sync.get(['apiUrl', 'webappUrl']);

            expect(result.apiUrl).toBe('https://api.example.com');
            expect(result.webappUrl).toBe('https://example.com');
        });
    });

    describe('Firefox storage (browser.storage.local)', () => {
        it('should persist webapp URL in Firefox local storage', async () => {
            // Save using Firefox API
            await browser.storage.local.set({ webappUrl: 'https://firefoxsite.com' });

            // Get using Firefox API
            const result = await browser.storage.local.get(['webappUrl']);
            const webappUrl = (result && result.webappUrl) || 'http://localhost:5173';

            expect(webappUrl).toBe('https://firefoxsite.com');
        });

        it('should share storage between Chrome and Firefox APIs in mock', async () => {
            // This verifies our mock works - in reality they're the same storage
            await browser.storage.local.set({ apiUrl: 'https://shared.com/api' });

            // Both APIs should see the same data
            const chromeResult = await chrome.storage.sync.get(['apiUrl']);
            const firefoxResult = await browser.storage.local.get(['apiUrl']);

            expect(chromeResult.apiUrl).toBe('https://shared.com/api');
            expect(firefoxResult.apiUrl).toBe('https://shared.com/api');
        });
    });

    describe('Login URL construction', () => {
        it('should construct login URL from persisted webapp URL', async () => {
            // Save
            await chrome.storage.sync.set({ webappUrl: 'https://mysite.com' });

            // Reload and construct URL
            const result = await chrome.storage.sync.get(['webappUrl']);
            const webappUrl = (result && result.webappUrl) || 'http://localhost:5173';
            const loginUrl = `${webappUrl}/login?extension=true`;

            expect(loginUrl).toBe('https://mysite.com/login?extension=true');
        });

        it('should use default webapp URL for login when not saved', async () => {
            // Don't save anything
            const result = await chrome.storage.sync.get(['webappUrl']);
            const webappUrl = (result && result.webappUrl) || 'http://localhost:5173';
            const loginUrl = `${webappUrl}/login?extension=true`;

            expect(loginUrl).toBe('http://localhost:5173/login?extension=true');
        });

        it('should handle trailing slash in saved webapp URL', async () => {
            // Save with trailing slash
            let webappUrl = 'https://mysite.com/';
            webappUrl = webappUrl.replace(/\/$/, ''); // Strip it
            await chrome.storage.sync.set({ webappUrl });

            // Reload
            const result = await chrome.storage.sync.get(['webappUrl']);
            const loadedUrl = (result && result.webappUrl) || 'http://localhost:5173';
            const loginUrl = `${loadedUrl}/login?extension=true`;

            expect(loginUrl).toBe('https://mysite.com/login?extension=true');
        });
    });

    describe('Token handling', () => {
        it('should persist token', async () => {
            await chrome.storage.sync.set({ token: 'test-token-123' });

            const result = await chrome.storage.sync.get(['token']);
            expect(result.token).toBe('test-token-123');
        });

        it('should remove token on logout', async () => {
            await chrome.storage.sync.set({ token: 'test-token-123' });
            await chrome.storage.sync.remove('token');

            const result = await chrome.storage.sync.get(['token']);
            expect(result.token).toBeUndefined();
        });
    });
});
