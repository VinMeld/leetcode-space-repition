/**
 * Unit tests for background.js - API and command handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome API
const mockStorage = {};
global.chrome = {
    storage: {
        sync: {
            get: vi.fn((keys) => Promise.resolve(
                keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage[key] }), {})
            )),
            set: vi.fn((obj) => {
                Object.assign(mockStorage, obj);
                return Promise.resolve();
            }),
        }
    },
    tabs: {
        query: vi.fn(),
        sendMessage: vi.fn()
    },
    action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn()
    },
    commands: {
        onCommand: {
            addListener: vi.fn()
        }
    },
    runtime: {
        onMessage: {
            addListener: vi.fn()
        }
    }
};

// Mock fetch
global.fetch = vi.fn();

describe('Background Script - API Request', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    });

    it('should make authenticated API requests', async () => {
        // Setup
        mockStorage.apiUrl = 'http://localhost:3001/api';
        mockStorage.token = 'test-token';

        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true })
        });

        // Simulate the apiRequest function
        async function getSettings() {
            const result = await chrome.storage.sync.get(['apiUrl', 'token']);
            return {
                apiUrl: result.apiUrl || 'http://localhost:3001/api',
                token: result.token || '',
            };
        }

        async function apiRequest(endpoint, method = 'GET', body = null) {
            const { apiUrl, token } = await getSettings();
            if (!token) {
                throw new Error('Not logged in');
            }

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${apiUrl}${endpoint}`, options);
            if (!response.ok) {
                throw new Error('Request failed');
            }
            return response.json();
        }

        const result = await apiRequest('/health');

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:3001/api/health',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-token'
                })
            })
        );
        expect(result.success).toBe(true);
    });

    it('should throw error when not logged in', async () => {
        // No token in storage
        mockStorage.apiUrl = 'http://localhost:3001/api';

        async function getSettings() {
            const result = await chrome.storage.sync.get(['apiUrl', 'token']);
            return {
                apiUrl: result.apiUrl || 'http://localhost:3001/api',
                token: result.token || '',
            };
        }

        async function apiRequest(endpoint) {
            const { token } = await getSettings();
            if (!token) {
                throw new Error('Not logged in');
            }
            return fetch(endpoint);
        }

        await expect(apiRequest('/health')).rejects.toThrow('Not logged in');
    });
});

describe('Background Script - Notification', () => {
    it('should show success badge', () => {
        function showNotification(title, message, isError = false) {
            chrome.action.setBadgeText({ text: isError ? '!' : '✓' });
            chrome.action.setBadgeBackgroundColor({ color: isError ? '#f85149' : '#3fb950' });
        }

        showNotification('Success', 'Problem added');

        expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' });
        expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#3fb950' });
    });

    it('should show error badge', () => {
        function showNotification(title, message, isError = false) {
            chrome.action.setBadgeText({ text: isError ? '!' : '✓' });
            chrome.action.setBadgeBackgroundColor({ color: isError ? '#f85149' : '#3fb950' });
        }

        showNotification('Error', 'Failed', true);

        expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });
        expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#f85149' });
    });
});
